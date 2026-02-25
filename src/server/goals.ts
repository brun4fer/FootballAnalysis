import { eq, desc, inArray } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../db/client";
import { actions, goalActions, goals, goalInvolvements, moments, players, subMoments, teams } from "../schema/schema";
import { goalInputSchema } from "../lib/validation";

type RawGoalPayload = Record<string, unknown>;

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

  const actionIdsRaw = Array.isArray(payload?.actionIds)
    ? payload.actionIds
    : payload && "actionId" in payload && payload.actionId
      ? [payload.actionId]
      : [];
  const actionIds = actionIdsRaw
    .map((v) => Number(String(v).replace(/[^\d.-]/g, "")))
    .filter((v) => !Number.isNaN(v) && v > 0);

  return { ...payload, minute, actionIds, goalCoordinates, goalZoneId: null, fieldDrawing, assistCoordinates };
}

export async function getGoalsByTeam(teamId: number) {
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
      action: primaryActionName,
      actions: actionsForGoal,
      actionIds: actionsForGoal.map((a) => a.actionId),
      involvements: grouped.get(g.id) ?? []
    };
  });
}

export async function getGoalById(goalId: number) {
  const assistPlayer = alias(players, "assist_player");
  const cornerTaker = alias(players, "corner_taker");
  const freekickTaker = alias(players, "freekick_taker");
  const penaltyTaker = alias(players, "penalty_taker");
  const crossAuthor = alias(players, "cross_author");
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
      assistSector: goals.assistSector,
      shotSector: goals.shotSector,
      finishSector: goals.finishSector,
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
      assistName: assistPlayer.name,
      cornerTakerName: cornerTaker.name,
      freekickTakerName: freekickTaker.name,
      penaltyTakerName: penaltyTaker.name,
      crossAuthorName: crossAuthor.name,
      cornerTakerId: goals.cornerTakerId,
      freekickTakerId: goals.freekickTakerId,
      penaltyTakerId: goals.penaltyTakerId,
      crossAuthorId: goals.crossAuthorId
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
    .leftJoin(teams, eq(goals.opponentTeamId, teams.id))
    .leftJoin(teamTable, eq(goals.teamId, teamTable.id))
    .where(eq(goals.id, goalId))
    .limit(1);
  if (!row[0]) return null;

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

  return { ...row[0], actions: actionsForGoal, actionIds: actionsForGoal.map((a) => a.actionId), involvements };
}

export async function createGoal(payload: unknown) {
  const normalized = await normalizeGoalPayload((payload ?? {}) as RawGoalPayload);
  const parsed = goalInputSchema.parse(normalized);

  const [team, scorer, opponent, subMoment] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, parsed.teamId) }),
    db.query.players.findFirst({ where: eq(players.id, parsed.scorerId) }),
    db.query.teams.findFirst({ where: eq(teams.id, parsed.opponentTeamId) }),
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

  const subName = subMoment.name.toLowerCase();
  const actionNames = actionRows.map((a) => a.name.toLowerCase());
  const isCorner = subName.includes("canto");
  const isFreeKick = subName.includes("livre");
  const isPenalty = subName.includes("penal");
  const isThrowIn = subName.includes("lançamento") || subName.includes("lancamento");
  const isCross = actionNames.some((name) => name.includes("cruzamento"));

  async function validateTaker(playerId: number | null | undefined, label: string) {
    if (!playerId) throw new Error(`${label} é obrigatório para esta jogada`);
    const p = await db.query.players.findFirst({ where: eq(players.id, playerId) });
    if (!p) throw new Error(`${label} não encontrado`);
    if (p.teamId !== parsed.teamId) throw new Error(`${label} tem de pertencer à equipa`);
    return p.id;
  }

  const cornerTakerId = isCorner ? await validateTaker(parsed.cornerTakerId, "Marcador do canto") : parsed.cornerTakerId ?? null;
  const freekickTakerId = isFreeKick ? await validateTaker(parsed.freekickTakerId, "Marcador da falta") : parsed.freekickTakerId ?? null;
  const penaltyTakerId = isPenalty ? await validateTaker(parsed.penaltyTakerId, "Marcador do penálti") : parsed.penaltyTakerId ?? null;
  const crossAuthorId = isCross ? await validateTaker(parsed.crossAuthorId, "Autor do cruzamento") : parsed.crossAuthorId ?? null;

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
    const [inserted] = await tx
      .insert(goals)
      .values({
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
        assistCoordinates: parsed.assistCoordinates ?? null,
        assistSector: parsed.assistSector || null,
        shotSector: parsed.shotSector || null,
        finishSector: parsed.finishSector || null,
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
        crossAuthorId
      })
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
  const normalized = await normalizeGoalPayload((payload ?? {}) as RawGoalPayload);
  const parsed = goalInputSchema.parse(normalized);

  const existing = await db.query.goals.findFirst({ where: eq(goals.id, id) });
  if (!existing) throw new Error("Goal not found");
  if (existing.teamId !== parsed.teamId) throw new Error("Cannot move goal to another team");

  const [team, opponent, subMoment] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, parsed.teamId) }),
    db.query.teams.findFirst({ where: eq(teams.id, parsed.opponentTeamId) }),
    db.query.subMoments.findFirst({ where: eq(subMoments.id, parsed.subMomentId) })
  ]);
  if (!team) throw new Error("Team not found");
  if (!opponent) throw new Error("Opponent team not found");
  if (opponent.id === parsed.teamId) throw new Error("Opponent cannot be the same as team");
  if (team.championshipId && opponent.championshipId && team.championshipId !== opponent.championshipId) {
    throw new Error("Opponent must belong to the same championship");
  }
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

  const subName = subMoment.name.toLowerCase();
  const actionNames = actionRows.map((a) => a.name.toLowerCase());
  const isCorner = subName.includes("canto");
  const isFreeKick = subName.includes("livre");
  const isPenalty = subName.includes("penal");
  const isThrowIn = subName.includes("lançamento") || subName.includes("lancamento");
  const isCross = actionNames.some((name) => name.includes("cruzamento"));

  async function validateTaker(playerId: number | null | undefined, label: string) {
    if (!playerId) throw new Error(`${label} é obrigatório para esta jogada`);
    const p = await db.query.players.findFirst({ where: eq(players.id, playerId) });
    if (!p) throw new Error(`${label} não encontrado`);
    if (p.teamId !== parsed.teamId) throw new Error(`${label} tem de pertencer à equipa`);
    return p.id;
  }

  const cornerTakerId = isCorner ? await validateTaker(parsed.cornerTakerId, "Marcador do canto") : parsed.cornerTakerId ?? null;
  const freekickTakerId = isFreeKick ? await validateTaker(parsed.freekickTakerId, "Marcador da falta") : parsed.freekickTakerId ?? null;
  const penaltyTakerId = isPenalty ? await validateTaker(parsed.penaltyTakerId, "Marcador do penálti") : parsed.penaltyTakerId ?? null;
  const crossAuthorId = isCross ? await validateTaker(parsed.crossAuthorId, "Autor do cruzamento") : parsed.crossAuthorId ?? null;

  const primaryActionId = parsed.actionIds[0];
  const requiresGoal = actionRows.some((a) => a.context === "field_goal" || a.name.toLowerCase().includes("marcador"));
  const requiresField = actionRows.length > 0;

  if (requiresField && !parsed.fieldDrawing) {
    throw new Error("Esta ação requer marcar o ponto no campo (field drawing obrigatório).");
  }
  if (requiresGoal && !parsed.goalCoordinates) {
    throw new Error("Esta ação requer selecionar um ponto na baliza.");
  }

  const [updated] = await db.transaction(async (tx) => {
    const [goalRow] = await tx
      .update(goals)
      .set({
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
        assistCoordinates: parsed.assistCoordinates ?? null,
        assistSector: parsed.assistSector || null,
        shotSector: parsed.shotSector || null,
        finishSector: parsed.finishSector || null,
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
        crossAuthorId
      })
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
