import { eq, desc, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db/client";
import { actions, goalActions, goals, goalInvolvements, moments, players, subMoments, teams } from "../schema/schema";
import { goalInputSchema } from "../lib/validation";

type RawGoalPayload = Record<string, unknown>;

function normalizeToken(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

async function hasGoalsColumn(columnName: string) {
  try {
    const res = await db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = ANY(current_schemas(false))
          AND table_name = 'goals'
          AND column_name = ${columnName}
      ) AS "exists"
    `);
    return Boolean(res.rows[0]?.exists);
  } catch {
    return false;
  }
}

async function ensureGoalsDrawingColumns() {
  try {
    await db.execute(sql`ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "assist_drawing" jsonb`);
    await db.execute(sql`ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "transition_drawing" jsonb`);
  } catch {
    // Se não for possível alterar schema em runtime, o fluxo segue e o erro original será devolvido no insert/update.
  }
}

async function normalizeGoalPayload(payload: RawGoalPayload) {
  const minuteValue = payload?.minute;
  const minute =
    minuteValue === undefined || minuteValue === null
      ? minuteValue
      : Number(String(minuteValue).replace(/[^\d.-]/g, ""));

  const goalCoordinates =
    payload?.goalCoordinates && typeof payload.goalCoordinates === "object"
      ? JSON.parse(JSON.stringify(payload.goalCoordinates))
      : payload?.goalCoordinates ?? null;
  const fieldDrawing =
    payload?.fieldDrawing && typeof payload.fieldDrawing === "object"
      ? JSON.parse(JSON.stringify(payload.fieldDrawing))
      : payload?.fieldDrawing ?? null;
  const assistCoordinates =
    payload?.assistCoordinates && typeof payload.assistCoordinates === "object"
      ? JSON.parse(JSON.stringify(payload.assistCoordinates))
      : payload?.assistCoordinates ?? null;
  const assistDrawingFromCoordinates =
    assistCoordinates &&
    typeof assistCoordinates === "object" &&
    typeof (assistCoordinates as any).x === "number" &&
    typeof (assistCoordinates as any).y === "number"
      ? {
          x: (assistCoordinates as any).x,
          y: (assistCoordinates as any).y
        }
      : null;
  const assistDrawing =
    payload?.assistDrawing && typeof payload.assistDrawing === "object"
      ? JSON.parse(JSON.stringify(payload.assistDrawing))
      : assistDrawingFromCoordinates;
  const transitionDrawing =
    payload?.transitionDrawing && typeof payload.transitionDrawing === "object"
      ? JSON.parse(JSON.stringify(payload.transitionDrawing))
      : payload?.transitionDrawing ?? null;

  const actionIdsRaw = Array.isArray(payload?.actionIds)
    ? payload.actionIds
    : payload && "actionId" in payload && payload.actionId
      ? [payload.actionId]
      : [];
  const actionIds = actionIdsRaw
    .map((v) => Number(String(v).replace(/[^\d.-]/g, "")))
    .filter((v) => !Number.isNaN(v) && v > 0);

  return {
    ...payload,
    minute,
    actionIds,
    goalCoordinates,
    goalZoneId: null,
    fieldDrawing,
    assistCoordinates,
    assistDrawing,
    transitionDrawing
  };
}

export async function getGoalsByTeam(teamId: number) {
  const [supportsAssistDrawing, supportsTransitionDrawing] = await Promise.all([
    hasGoalsColumn("assist_drawing"),
    hasGoalsColumn("transition_drawing")
  ]);
  const rows = await db
    .select({
      id: goals.id,
      opponentTeamId: goals.opponentTeamId,
      teamId: goals.teamId,
      scorerId: goals.scorerId,
      assistId: goals.assistId,
      minute: goals.minute,
      notes: goals.notes,
      fieldDrawing: goals.fieldDrawing,
      goalCoordinates: goals.goalCoordinates,
      assistDrawing: supportsAssistDrawing ? goals.assistDrawing : sql<null>`null`,
      transitionDrawing: supportsTransitionDrawing ? goals.transitionDrawing : sql<null>`null`,
      moment: moments.name,
      subMoment: subMoments.name,
      action: actions.name,
      goalZoneId: goals.goalZoneId,
      scorerName: players.name,
      opponentName: teams.name,
      cornerTakerId: goals.cornerTakerId,
      freekickTakerId: goals.freekickTakerId,
      penaltyTakerId: goals.penaltyTakerId,
      crossAuthorId: goals.crossAuthorId
    })
    .from(goals)
    .leftJoin(moments, eq(goals.momentId, moments.id))
    .leftJoin(subMoments, eq(goals.subMomentId, subMoments.id))
    .leftJoin(actions, eq(goals.actionId, actions.id))
    .leftJoin(players, eq(goals.scorerId, players.id))
    .leftJoin(teams, eq(goals.opponentTeamId, teams.id))
    .where(eq(goals.teamId, teamId))
    .orderBy(desc(goals.id));

  if (rows.length === 0) return [];

  const referenceByGoalId = new Map<number, number | null>();
  if (await hasGoalsColumn("reference_player_id")) {
    const referenceRows = await db
      .select({
        goalId: goals.id,
        referencePlayerId: goals.referencePlayerId
      })
      .from(goals)
      .where(inArray(goals.id, rows.map((r) => r.id)));
    referenceRows.forEach((r) => referenceByGoalId.set(r.goalId, r.referencePlayerId ?? null));
  }
  const throwInTakerByGoalId = new Map<number, number | null>();
  if (await hasGoalsColumn("throw_in_taker_id")) {
    const throwInRows = await db
      .select({
        goalId: goals.id,
        throwInTakerId: goals.throwInTakerId
      })
      .from(goals)
      .where(inArray(goals.id, rows.map((r) => r.id)));
    throwInRows.forEach((r) => throwInTakerByGoalId.set(r.goalId, r.throwInTakerId ?? null));
  }

  const involvementRows = await db
    .select({
      goalId: goalInvolvements.goalId,
      playerId: goalInvolvements.playerId,
      role: goalInvolvements.role
    })
    .from(goalInvolvements)
    .where(inArray(goalInvolvements.goalId, rows.map((r) => r.id)));

  const grouped = new Map<number, typeof involvementRows>();
  involvementRows.forEach((row) => {
    const list = grouped.get(row.goalId) ?? [];
    list.push(row);
    grouped.set(row.goalId, list);
  });

  const actionRows =
    rows.length === 0
      ? []
      : await db
          .select({
            goalId: goalActions.goalId,
            actionId: goalActions.actionId,
            actionName: actions.name
          })
          .from(goalActions)
          .leftJoin(actions, eq(goalActions.actionId, actions.id))
          .where(inArray(goalActions.goalId, rows.map((r) => r.id)));

  const actionGrouped = new Map<
    number,
    { actionId: number; actionName: string | null }[]
  >();
  actionRows.forEach((row) => {
    const list = actionGrouped.get(row.goalId) ?? [];
    list.push({ actionId: row.actionId, actionName: row.actionName });
    actionGrouped.set(row.goalId, list);
  });

  return rows.map((g) => {
    const actionsForGoal = actionGrouped.get(g.id) ?? [];
    const primaryActionName = actionsForGoal[0]?.actionName ?? (g as any).action;
    return {
      ...g,
      referencePlayerId: referenceByGoalId.get(g.id) ?? null,
      throwInTakerId: throwInTakerByGoalId.get(g.id) ?? null,
      action: primaryActionName,
      actions: actionsForGoal,
      actionIds: actionsForGoal.map((a) => a.actionId),
      involvements: grouped.get(g.id) ?? []
    };
  });
}

export async function getGoalById(goalId: number) {
  const [supportsAssistDrawing, supportsTransitionDrawing] = await Promise.all([
    hasGoalsColumn("assist_drawing"),
    hasGoalsColumn("transition_drawing")
  ]);
  const assistPlayer = alias(players, "assist_player");
  const cornerTaker = alias(players, "corner_taker");
  const freekickTaker = alias(players, "freekick_taker");
  const penaltyTaker = alias(players, "penalty_taker");
  const crossAuthor = alias(players, "cross_author");
  const foulSufferedBy = alias(players, "foul_suffered_by");
  const teamTable = alias(teams, "team_table");
  const invPlayer = alias(players, "inv_player");

  const row = await db
    .select({
      id: goals.id,
      opponentTeamId: goals.opponentTeamId,
      teamId: goals.teamId,
      scorerId: goals.scorerId,
      assistId: goals.assistId,
      minute: goals.minute,
      momentId: goals.momentId,
      subMomentId: goals.subMomentId,
      actionId: goals.actionId,
      momentName: moments.name,
      subMomentName: subMoments.name,
      actionName: actions.name,
      videoPath: goals.videoPath,
      fieldDrawing: goals.fieldDrawing,
      goalCoordinates: goals.goalCoordinates,
      assistCoordinates: goals.assistCoordinates,
      assistDrawing: supportsAssistDrawing ? goals.assistDrawing : sql<null>`null`,
      transitionDrawing: supportsTransitionDrawing ? goals.transitionDrawing : sql<null>`null`,
      buildUpPhase: goals.buildUpPhase,
      creationPhase: goals.creationPhase,
      finalizationPhase: goals.finalizationPhase,
      cornerProfile: goals.cornerProfile,
      freekickProfile: goals.freekickProfile,
      throwInProfile: goals.throwInProfile,
      goalkeeperOutlet: goals.goalkeeperOutlet,
      notes: goals.notes,
      scorerName: players.name,
      opponentName: teams.name,
      teamName: teamTable.name,
      teamCoach: teamTable.coach,
      teamStadium: teamTable.stadium,
      teamPitchDimensions: teamTable.pitchDimensions,
      assistName: assistPlayer.name,
      cornerTakerName: cornerTaker.name,
      freekickTakerName: freekickTaker.name,
      penaltyTakerName: penaltyTaker.name,
      crossAuthorName: crossAuthor.name,
      foulSufferedByName: foulSufferedBy.name,
      cornerTakerId: goals.cornerTakerId,
      freekickTakerId: goals.freekickTakerId,
      penaltyTakerId: goals.penaltyTakerId,
      crossAuthorId: goals.crossAuthorId,
      foulSufferedById: goals.foulSufferedById,
      previousMomentDescription: goals.previousMomentDescription
    })
    .from(goals)
    .leftJoin(players, eq(goals.scorerId, players.id))
    .leftJoin(moments, eq(goals.momentId, moments.id))
    .leftJoin(subMoments, eq(goals.subMomentId, subMoments.id))
    .leftJoin(actions, eq(goals.actionId, actions.id))
    .leftJoin(assistPlayer, eq(goals.assistId, assistPlayer.id))
    .leftJoin(cornerTaker, eq(goals.cornerTakerId, cornerTaker.id))
    .leftJoin(freekickTaker, eq(goals.freekickTakerId, freekickTaker.id))
    .leftJoin(penaltyTaker, eq(goals.penaltyTakerId, penaltyTaker.id))
    .leftJoin(crossAuthor, eq(goals.crossAuthorId, crossAuthor.id))
    .leftJoin(foulSufferedBy, eq(goals.foulSufferedById, foulSufferedBy.id))
    .leftJoin(teams, eq(goals.opponentTeamId, teams.id))
    .leftJoin(teamTable, eq(goals.teamId, teamTable.id))
    .where(eq(goals.id, goalId))
    .limit(1);
  if (!row[0]) return null;

  let referencePlayerId: number | null = null;
  let referencePlayerName: string | null = null;
  if (await hasGoalsColumn("reference_player_id")) {
    const referencePlayer = alias(players, "reference_player");
    const referenceRow = await db
      .select({
        referencePlayerId: goals.referencePlayerId,
        referencePlayerName: referencePlayer.name
      })
      .from(goals)
      .leftJoin(referencePlayer, eq(goals.referencePlayerId, referencePlayer.id))
      .where(eq(goals.id, goalId))
      .limit(1);
    referencePlayerId = referenceRow[0]?.referencePlayerId ?? null;
    referencePlayerName = referenceRow[0]?.referencePlayerName ?? null;
  }
  let throwInTakerId: number | null = null;
  let throwInTakerName: string | null = null;
  if (await hasGoalsColumn("throw_in_taker_id")) {
    const throwInTaker = alias(players, "throw_in_taker");
    const throwInRow = await db
      .select({
        throwInTakerId: goals.throwInTakerId,
        throwInTakerName: throwInTaker.name
      })
      .from(goals)
      .leftJoin(throwInTaker, eq(goals.throwInTakerId, throwInTaker.id))
      .where(eq(goals.id, goalId))
      .limit(1);
    throwInTakerId = throwInRow[0]?.throwInTakerId ?? null;
    throwInTakerName = throwInRow[0]?.throwInTakerName ?? null;
  }

  const involvements = await db
    .select({
      goalId: goalInvolvements.goalId,
      playerId: goalInvolvements.playerId,
      role: goalInvolvements.role,
      playerName: invPlayer.name,
      photoPath: invPlayer.photoPath
    })
    .from(goalInvolvements)
    .leftJoin(invPlayer, eq(invPlayer.id, goalInvolvements.playerId))
    .where(eq(goalInvolvements.goalId, goalId));

  const actionsForGoal = await db
    .select({
      goalId: goalActions.goalId,
      actionId: goalActions.actionId,
      actionName: actions.name
    })
    .from(goalActions)
    .leftJoin(actions, eq(goalActions.actionId, actions.id))
    .where(eq(goalActions.goalId, goalId));

  return {
    ...row[0],
    referencePlayerId,
    referencePlayerName,
    throwInTakerId,
    throwInTakerName,
    foulVictimName: row[0].foulSufferedByName ?? null,
    actions: actionsForGoal,
    actionIds: actionsForGoal.map((a) => a.actionId),
    involvements
  };
}

export async function createGoal(payload: unknown) {
  await ensureGoalsDrawingColumns();
  const normalized = await normalizeGoalPayload((payload ?? {}) as RawGoalPayload);
  const parsed = goalInputSchema.parse(normalized);
  const [supportsReferencePlayer, supportsThrowInTaker, supportsAssistDrawing, supportsTransitionDrawing] = await Promise.all([
    hasGoalsColumn("reference_player_id"),
    hasGoalsColumn("throw_in_taker_id"),
    hasGoalsColumn("assist_drawing"),
    hasGoalsColumn("transition_drawing")
  ]);

  const [team, scorer, opponent, moment, subMoment] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, parsed.teamId) }),
    db.query.players.findFirst({ where: eq(players.id, parsed.scorerId) }),
    db.query.teams.findFirst({ where: eq(teams.id, parsed.opponentTeamId) }),
    db.query.moments.findFirst({ where: eq(moments.id, parsed.momentId) }),
    db.query.subMoments.findFirst({ where: eq(subMoments.id, parsed.subMomentId) })
  ]);

  if (!team) throw new Error("Team not found");
  if (!opponent) throw new Error("Opponent team not found");
  if (opponent.id === parsed.teamId) throw new Error("Opponent cannot be the same as team");
  if (team.championshipId && opponent.championshipId && team.championshipId !== opponent.championshipId) {
    throw new Error("Opponent must belong to the same championship");
  }
  if (!scorer) throw new Error("Scorer not found");
  if (scorer.teamId !== parsed.teamId) {
    throw new Error("Scorer does not belong to team");
  }

  if (!moment) throw new Error("Moment not found");
  if (!subMoment) throw new Error("Sub-moment not found");
  if (subMoment.momentId !== parsed.momentId) throw new Error("Sub-moment does not match moment");

  const actionRows =
    parsed.actionIds.length === 0
      ? []
      : await db
          .select({
            id: actions.id,
            name: actions.name,
            subMomentId: actions.subMomentId,
            context: actions.context
          })
          .from(actions)
          .where(inArray(actions.id, parsed.actionIds));

  if (actionRows.length !== parsed.actionIds.length) throw new Error("Action not found");
  if (actionRows.some((a) => a.subMomentId !== parsed.subMomentId))
    throw new Error("All actions must belong to the selected sub-moment");

  const requiresGoal = actionRows.some((a) => a.context === "field_goal" || a.name.toLowerCase().includes("marcador"));
  const requiresField = actionRows.length > 0; // todas as ações pedem registo em campo

  if (requiresField && !parsed.fieldDrawing) {
    throw new Error("Esta ação requer marcar o ponto no campo (field drawing obrigatório).");
  }
  if (requiresGoal && !parsed.goalCoordinates) {
    throw new Error("Esta ação requer selecionar um ponto na baliza.");
  }

  const isOffensiveTransitionMoment = normalizeToken(moment.name) === "transicao ofensiva";
  if (isOffensiveTransitionMoment && !parsed.transitionDrawing) {
    throw new Error("Transicao Ofensiva requer ponto de recuperacao (transition drawing obrigatorio).");
  }

  const assistFromRoles = parsed.involvements?.filter((i) => i.role === "assist") ?? [];
  if (assistFromRoles.length > 1) {
    throw new Error("Only one assist is allowed per goal");
  }

  let assistId = parsed.assistId ?? assistFromRoles[0]?.playerId ?? null;
  if (assistId) {
    const assistPlayer = await db.query.players.findFirst({ where: eq(players.id, assistId) });
    if (!assistPlayer) throw new Error("Assist player not found");
    if (assistPlayer.teamId !== parsed.teamId) throw new Error("Assist player does not belong to team");
  }

  const subName = normalizeToken(subMoment.name);
  const actionNames = actionRows.map((a) => normalizeToken(a.name));
  const isCorner = subName.includes("canto");
  const isFreeKick = subName.includes("livre");
  const isPenalty = subName.includes("penal");
  const isThrowIn = subName.includes("lancamento");
  const isCross = actionNames.some((name) => name.includes("cruzamento"));
  const hasCornerMarkerAction = actionNames.some((name) => name.includes("marcador") && name.includes("canto"));
  const hasFreekickMarkerAction = actionNames.some(
    (name) => name.includes("marcador") && (name.includes("livre") || name.includes("falta"))
  );
  const hasThrowInMarkerAction = actionNames.some((name) => name.includes("marcador") && name.includes("lancamento"));
  const hasFoulSufferedAction = actionNames.some(
    (name) =>
      name.includes("falta sobre") ||
      name.includes("falta sofrida") ||
      name.includes("sofreu a falta")
  );

  async function validateTaker(playerId: number | null | undefined, label: string) {
    if (!playerId) throw new Error(`${label} é obrigatório para esta jogada`);
    const p = await db.query.players.findFirst({ where: eq(players.id, playerId) });
    if (!p) throw new Error(`${label} não encontrado`);
    if (p.teamId !== parsed.teamId) throw new Error(`${label} tem de pertencer à equipa`);
    return p.id;
  }

  const cornerTakerId = hasCornerMarkerAction
    ? await validateTaker(parsed.cornerTakerId, "Marcador do canto")
    : parsed.cornerTakerId ?? null;
  const freekickTakerId = hasFreekickMarkerAction
    ? await validateTaker(parsed.freekickTakerId, "Marcador da falta")
    : parsed.freekickTakerId ?? null;
  const penaltyTakerId = isPenalty ? await validateTaker(parsed.penaltyTakerId, "Marcador do penálti") : parsed.penaltyTakerId ?? null;
  const crossAuthorId = isCross ? await validateTaker(parsed.crossAuthorId, "Autor do cruzamento") : parsed.crossAuthorId ?? null;
  const throwInTakerId = supportsThrowInTaker && hasThrowInMarkerAction
    ? await validateTaker(parsed.throwInTakerId, "Marcador do lançamento")
    : null;
  const referencePlayerId = supportsReferencePlayer && parsed.referencePlayerId
    ? await validateTaker(parsed.referencePlayerId, "Jogador referência")
    : null;
  const foulSufferedById = hasFoulSufferedAction
    ? await validateTaker(parsed.foulSufferedById, "Jogador que sofreu a falta")
    : null;
  const previousMomentDescription = parsed.previousMomentDescription?.toString().trim() || null;

  const primaryActionId = parsed.actionIds[0];
  if (parsed.involvements) {
    const duplicateRole = new Set<string>();
    for (const inv of parsed.involvements) {
      const key = `${inv.playerId}-${inv.role}`;
      if (duplicateRole.has(key)) {
        throw new Error("Duplicate player role in involvements");
      }
      duplicateRole.add(key);
    }
    const ids = [...new Set(parsed.involvements.map((i) => i.playerId))];
    const involvementPlayers = await db
      .select({ id: players.id, teamId: players.teamId })
      .from(players)
      .where(inArray(players.id, ids));
    if (involvementPlayers.some((p) => p.teamId !== parsed.teamId)) {
      throw new Error("Involvement player does not belong to team");
    }
  }

  const goalId = await db.transaction(async (tx) => {
    const goalValues: any = {
      opponentTeamId: parsed.opponentTeamId,
      teamId: parsed.teamId,
      scorerId: parsed.scorerId,
      assistId,
      minute: parsed.minute,
      momentId: parsed.momentId,
      subMomentId: parsed.subMomentId,
      actionId: primaryActionId,
      goalZoneId: null,
      goalCoordinates: parsed.goalCoordinates ?? null,
      videoPath: parsed.videoPath || null,
      fieldDrawing: parsed.fieldDrawing ?? null,
      assistCoordinates: parsed.assistDrawing ?? parsed.assistCoordinates ?? null,
      buildUpPhase: parsed.buildUpPhase || null,
      creationPhase: parsed.creationPhase || null,
      finalizationPhase: parsed.finalizationPhase || null,
      cornerProfile: isCorner ? parsed.cornerProfile ?? null : null,
      freekickProfile: isFreeKick ? parsed.freekickProfile ?? null : null,
      throwInProfile: isThrowIn ? parsed.throwInProfile ?? null : null,
      goalkeeperOutlet: parsed.goalkeeperOutlet ?? null,
      notes: parsed.notes || null,
      cornerTakerId,
      freekickTakerId,
      penaltyTakerId,
      crossAuthorId,
      foulSufferedById,
      previousMomentDescription
    };
    if (supportsThrowInTaker) {
      goalValues.throwInTakerId = throwInTakerId;
    }
    if (supportsReferencePlayer) {
      goalValues.referencePlayerId = referencePlayerId;
    }
    if (supportsAssistDrawing) {
      goalValues.assistDrawing = parsed.assistDrawing ?? null;
    }
    if (supportsTransitionDrawing) {
      goalValues.transitionDrawing = isOffensiveTransitionMoment ? parsed.transitionDrawing ?? null : null;
    }

    const [inserted] = await tx
      .insert(goals)
      .values(goalValues)
      .returning({ id: goals.id });

    if (parsed.involvements && parsed.involvements.length > 0) {
      await tx.insert(goalInvolvements).values(
        parsed.involvements.map((inv) => ({
          goalId: inserted.id,
          playerId: inv.playerId,
          role: inv.role
        }))
      );
    }

    await tx.insert(goalActions).values(parsed.actionIds.map((actionId) => ({ goalId: inserted.id, actionId })));

    return inserted.id;
  });

  return goalId;
}

export async function updateGoal(id: number, payload: unknown) {
  await ensureGoalsDrawingColumns();
  const normalized = await normalizeGoalPayload((payload ?? {}) as RawGoalPayload);
  const parsed = goalInputSchema.parse(normalized);
  const [supportsReferencePlayer, supportsThrowInTaker, supportsAssistDrawing, supportsTransitionDrawing] = await Promise.all([
    hasGoalsColumn("reference_player_id"),
    hasGoalsColumn("throw_in_taker_id"),
    hasGoalsColumn("assist_drawing"),
    hasGoalsColumn("transition_drawing")
  ]);

  const existing = await db.query.goals.findFirst({ where: eq(goals.id, id) });
  if (!existing) throw new Error("Goal not found");
  if (existing.teamId !== parsed.teamId) throw new Error("Cannot move goal to another team");

  const [team, opponent, moment, subMoment] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, parsed.teamId) }),
    db.query.teams.findFirst({ where: eq(teams.id, parsed.opponentTeamId) }),
    db.query.moments.findFirst({ where: eq(moments.id, parsed.momentId) }),
    db.query.subMoments.findFirst({ where: eq(subMoments.id, parsed.subMomentId) })
  ]);
  if (!team) throw new Error("Team not found");
  if (!opponent) throw new Error("Opponent team not found");
  if (opponent.id === parsed.teamId) throw new Error("Opponent cannot be the same as team");
  if (team.championshipId && opponent.championshipId && team.championshipId !== opponent.championshipId) {
    throw new Error("Opponent must belong to the same championship");
  }
  if (!moment) throw new Error("Moment not found");
  if (!subMoment) throw new Error("Sub-moment not found");
  if (subMoment.momentId !== parsed.momentId) throw new Error("Sub-moment does not match moment");

  const actionRows =
    parsed.actionIds.length === 0
      ? []
      : await db
          .select({
            id: actions.id,
            name: actions.name,
            subMomentId: actions.subMomentId,
            context: actions.context
          })
          .from(actions)
          .where(inArray(actions.id, parsed.actionIds));

  if (actionRows.length !== parsed.actionIds.length) throw new Error("Action not found");
  if (actionRows.some((a) => a.subMomentId !== parsed.subMomentId))
    throw new Error("All actions must belong to the selected sub-moment");

  const assistFromRoles = parsed.involvements?.filter((i) => i.role === "assist") ?? [];
  if (assistFromRoles.length > 1) throw new Error("Only one assist is allowed per goal");

  let assistId = parsed.assistId ?? assistFromRoles[0]?.playerId ?? null;
  if (assistId) {
    const assistPlayer = await db.query.players.findFirst({ where: eq(players.id, assistId) });
    if (!assistPlayer) throw new Error("Assist player not found");
    if (assistPlayer.teamId !== parsed.teamId) throw new Error("Assist player does not belong to team");
  }

  if (parsed.involvements) {
    const duplicateRole = new Set<string>();
    for (const inv of parsed.involvements) {
      const key = `${inv.playerId}-${inv.role}`;
      if (duplicateRole.has(key)) throw new Error("Duplicate player role in involvements");
      duplicateRole.add(key);
    }
    const ids = [...new Set(parsed.involvements.map((i) => i.playerId))];
    const involvementPlayers = await db
      .select({ id: players.id, teamId: players.teamId })
      .from(players)
      .where(inArray(players.id, ids));
    if (involvementPlayers.some((p) => p.teamId !== parsed.teamId)) {
      throw new Error("Involvement player does not belong to team");
    }
  }

  const subName = normalizeToken(subMoment.name);
  const actionNames = actionRows.map((a) => normalizeToken(a.name));
  const isCorner = subName.includes("canto");
  const isFreeKick = subName.includes("livre");
  const isPenalty = subName.includes("penal");
  const isThrowIn = subName.includes("lancamento");
  const isCross = actionNames.some((name) => name.includes("cruzamento"));
  const hasCornerMarkerAction = actionNames.some((name) => name.includes("marcador") && name.includes("canto"));
  const hasFreekickMarkerAction = actionNames.some(
    (name) => name.includes("marcador") && (name.includes("livre") || name.includes("falta"))
  );
  const hasThrowInMarkerAction = actionNames.some((name) => name.includes("marcador") && name.includes("lancamento"));
  const hasFoulSufferedAction = actionNames.some(
    (name) =>
      name.includes("falta sobre") ||
      name.includes("falta sofrida") ||
      name.includes("sofreu a falta")
  );

  async function validateTaker(playerId: number | null | undefined, label: string) {
    if (!playerId) throw new Error(`${label} é obrigatório para esta jogada`);
    const p = await db.query.players.findFirst({ where: eq(players.id, playerId) });
    if (!p) throw new Error(`${label} não encontrado`);
    if (p.teamId !== parsed.teamId) throw new Error(`${label} tem de pertencer à equipa`);
    return p.id;
  }

  const cornerTakerId = hasCornerMarkerAction
    ? await validateTaker(parsed.cornerTakerId, "Marcador do canto")
    : parsed.cornerTakerId ?? null;
  const freekickTakerId = hasFreekickMarkerAction
    ? await validateTaker(parsed.freekickTakerId, "Marcador da falta")
    : parsed.freekickTakerId ?? null;
  const penaltyTakerId = isPenalty ? await validateTaker(parsed.penaltyTakerId, "Marcador do penálti") : parsed.penaltyTakerId ?? null;
  const crossAuthorId = isCross ? await validateTaker(parsed.crossAuthorId, "Autor do cruzamento") : parsed.crossAuthorId ?? null;
  const throwInTakerId = supportsThrowInTaker && hasThrowInMarkerAction
    ? await validateTaker(parsed.throwInTakerId, "Marcador do lançamento")
    : null;
  const referencePlayerId = supportsReferencePlayer && parsed.referencePlayerId
    ? await validateTaker(parsed.referencePlayerId, "Jogador referência")
    : null;
  const foulSufferedById = hasFoulSufferedAction
    ? await validateTaker(parsed.foulSufferedById, "Jogador que sofreu a falta")
    : null;
  const previousMomentDescription = parsed.previousMomentDescription?.toString().trim() || null;

  const primaryActionId = parsed.actionIds[0];
  const requiresGoal = actionRows.some((a) => a.context === "field_goal" || a.name.toLowerCase().includes("marcador"));
  const requiresField = actionRows.length > 0;

  if (requiresField && !parsed.fieldDrawing) {
    throw new Error("Esta ação requer marcar o ponto no campo (field drawing obrigatório).");
  }
  if (requiresGoal && !parsed.goalCoordinates) {
    throw new Error("Esta ação requer selecionar um ponto na baliza.");
  }

  const isOffensiveTransitionMoment = normalizeToken(moment.name) === "transicao ofensiva";
  if (isOffensiveTransitionMoment && !parsed.transitionDrawing) {
    throw new Error("Transicao Ofensiva requer ponto de recuperacao (transition drawing obrigatorio).");
  }

  const [updated] = await db.transaction(async (tx) => {
    const goalUpdateValues: any = {
      opponentTeamId: parsed.opponentTeamId,
      teamId: parsed.teamId,
      scorerId: parsed.scorerId,
      assistId: assistId ?? null,
      minute: parsed.minute,
      momentId: parsed.momentId,
      subMomentId: parsed.subMomentId,
      actionId: primaryActionId,
      goalZoneId: null,
      goalCoordinates: parsed.goalCoordinates ?? null,
      videoPath: parsed.videoPath || null,
      fieldDrawing: parsed.fieldDrawing ?? null,
      assistCoordinates: parsed.assistDrawing ?? parsed.assistCoordinates ?? null,
      buildUpPhase: parsed.buildUpPhase || null,
      creationPhase: parsed.creationPhase || null,
      finalizationPhase: parsed.finalizationPhase || null,
      cornerProfile: isCorner ? parsed.cornerProfile ?? null : null,
      freekickProfile: isFreeKick ? parsed.freekickProfile ?? null : null,
      throwInProfile: isThrowIn ? parsed.throwInProfile ?? null : null,
      goalkeeperOutlet: parsed.goalkeeperOutlet ?? null,
      notes: parsed.notes || null,
      cornerTakerId,
      freekickTakerId,
      penaltyTakerId,
      crossAuthorId,
      foulSufferedById,
      previousMomentDescription
    };
    if (supportsThrowInTaker) {
      goalUpdateValues.throwInTakerId = throwInTakerId;
    }
    if (supportsReferencePlayer) {
      goalUpdateValues.referencePlayerId = referencePlayerId;
    }
    if (supportsAssistDrawing) {
      goalUpdateValues.assistDrawing = parsed.assistDrawing ?? null;
    }
    if (supportsTransitionDrawing) {
      goalUpdateValues.transitionDrawing = isOffensiveTransitionMoment ? parsed.transitionDrawing ?? null : null;
    }

    const [goalRow] = await tx
      .update(goals)
      .set(goalUpdateValues)
      .where(eq(goals.id, id))
      .returning({ id: goals.id });

    await tx.delete(goalActions).where(eq(goalActions.goalId, id));
    await tx.insert(goalActions).values(parsed.actionIds.map((actionId) => ({ goalId: id, actionId })));

    await tx.delete(goalInvolvements).where(eq(goalInvolvements.goalId, id));
    if (parsed.involvements && parsed.involvements.length > 0) {
      await tx.insert(goalInvolvements).values(
        parsed.involvements.map((inv) => ({
          goalId: id,
          playerId: inv.playerId,
          role: inv.role
        }))
      );
    }

    return [goalRow];
  });

  return updated.id;
}
