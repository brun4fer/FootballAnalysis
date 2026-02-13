import { eq, desc, inArray } from "drizzle-orm";
import { db } from "../db/client";
import { actions, goals, goalInvolvements, moments, players, subMoments, teams, goalkeeperZones } from "../schema/schema";
import { goalInputSchema } from "../lib/validation";

type RawGoalPayload = Record<string, unknown>;

async function normalizeGoalPayload(payload: RawGoalPayload) {
  const minuteValue = payload?.minute;
  const minute =
    minuteValue === undefined || minuteValue === null
      ? minuteValue
      : Number(String(minuteValue).replace(/[^\d.-]/g, ""));

  let goalZoneId: unknown = payload?.goalZoneId;
  if (typeof goalZoneId === "string") {
    const numeric = Number(goalZoneId);
    if (!Number.isNaN(numeric)) {
      goalZoneId = numeric;
    } else {
      const zone = await db.query.goalkeeperZones.findFirst({
        where: eq(goalkeeperZones.name, goalZoneId)
      });
      if (zone) {
        goalZoneId = zone.id;
      } else {
        throw new Error(`Goal zone '${goalZoneId}' not found`);
      }
    }
  }

  const fieldDrawing =
    payload?.fieldDrawing && typeof payload.fieldDrawing === "object"
      ? JSON.parse(JSON.stringify(payload.fieldDrawing))
      : payload?.fieldDrawing ?? null;

  return { ...payload, minute, goalZoneId, fieldDrawing };
}

export async function getGoalsByTeam(teamId: number) {
  const rows = await db
    .select({
      id: goals.id,
      matchId: goals.matchId,
      teamId: goals.teamId,
      scorerId: goals.scorerId,
      assistId: goals.assistId,
      minute: goals.minute,
      notes: goals.notes,
      fieldDrawing: goals.fieldDrawing,
      moment: moments.name,
      subMoment: subMoments.name,
      action: actions.name,
      goalZoneId: goals.goalZoneId
    })
    .from(goals)
    .leftJoin(moments, eq(goals.momentId, moments.id))
    .leftJoin(subMoments, eq(goals.subMomentId, subMoments.id))
    .leftJoin(actions, eq(goals.actionId, actions.id))
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

  return rows.map((g) => ({ ...g, involvements: grouped.get(g.id) ?? [] }));
}

export async function createGoal(payload: unknown) {
  const normalized = await normalizeGoalPayload((payload ?? {}) as RawGoalPayload);
  const parsed = goalInputSchema.parse(normalized);

  const [team, scorer] = await Promise.all([
    db.query.teams.findFirst({ where: eq(teams.id, parsed.teamId) }),
    db.query.players.findFirst({ where: eq(players.id, parsed.scorerId) })
  ]);

  if (!team) throw new Error("Team not found");
  if (!scorer) throw new Error("Scorer not found");
  if (scorer.teamId !== parsed.teamId) {
    throw new Error("Scorer does not belong to team");
  }

  const subMoment = await db.query.subMoments.findFirst({ where: eq(subMoments.id, parsed.subMomentId) });
  if (!subMoment) throw new Error("Sub-moment not found");
  if (subMoment.momentId !== parsed.momentId) throw new Error("Sub-moment does not match moment");

  const action = await db.query.actions.findFirst({ where: eq(actions.id, parsed.actionId) });
  if (!action) throw new Error("Action not found");
  if (action.subMomentId !== parsed.subMomentId) throw new Error("Action does not belong to sub-moment");
  const needsGoal = action.name.toLowerCase().includes("marcador");
  const needsField = true; // todas as ações exigem registo no campo

  if (needsField && (!parsed.fieldDrawing || (parsed.fieldDrawing.strokes?.length ?? 0) === 0)) {
    throw new Error("Esta ação requer desenho no campo (field drawing obrigatório).");
  }
  if (needsGoal && !parsed.goalZoneId) {
    throw new Error("Esta ação requer selecionar uma zona da baliza.");
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
        matchId: parsed.matchId ?? null,
        teamId: parsed.teamId,
        scorerId: parsed.scorerId,
        assistId,
        minute: parsed.minute,
        momentId: parsed.momentId,
        subMomentId: parsed.subMomentId,
        actionId: parsed.actionId,
        goalZoneId: needsGoal ? parsed.goalZoneId : null,
        videoUrl: parsed.videoUrl || null,
        fieldDrawing: parsed.fieldDrawing ?? null,
        notes: parsed.notes || null
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

    return inserted.id;
  });

  return goalId;
}
