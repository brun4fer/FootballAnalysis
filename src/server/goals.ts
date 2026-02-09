import { db } from "@/db/client";
import { actions, goals, goalInvolvements, moments, players, subMoments, teams } from "@/schema";
import { eq, desc, inArray } from "drizzle-orm";
import { goalInputSchema } from "@/lib/validation";

export async function getGoalsByTeam(teamId: number) {
  const rows = await db
    .select({
      id: goals.id,
      matchId: goals.matchId,
      teamId: goals.teamId,
      scorerId: goals.scorerId,
      minute: goals.minute,
      notes: goals.notes,
      createdAt: goals.createdAt,
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
    .orderBy(desc(goals.createdAt));

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
  const parsed = goalInputSchema.parse(payload);

  // Validate referential integrity manually for clearer errors
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

  // Validate involvement players belong to team
  if (parsed.involvements) {
    const ids = [...new Set(parsed.involvements.map((i) => i.playerId))];
    if (ids.length !== parsed.involvements.length) {
      throw new Error("Duplicate player roles in involvements");
    }
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
        matchId: parsed.matchId,
        teamId: parsed.teamId,
        scorerId: parsed.scorerId,
        minute: parsed.minute,
        momentId: parsed.momentId,
        subMomentId: parsed.subMomentId,
        actionId: parsed.actionId,
        goalZoneId: parsed.goalZoneId,
        notes: parsed.notes
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

