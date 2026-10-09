import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  actions,
  championships,
  goalActions,
  goalInvolvements,
  goalSubMomentActions,
  goals,
  moments,
  players,
  seasons,
  subMoments,
  teams
} from "@/schema";
import { getWorkspaceId } from "@/lib/auth";

export type GoalReportFilters = {
  seasonId?: number;
  championshipId?: number;
  teamId?: number;
  opponentTeamId?: number;
  momentId?: number;
  subMomentId?: number;
  actionId?: number;
  scorerId?: number;
  assistId?: number;
  involvedPlayerId?: number;
  minuteFrom?: number;
  minuteTo?: number;
  attackDirection?: "left_to_right" | "right_to_left";
  hasVideo?: boolean;
};

export async function getGoalReports(filters: GoalReportFilters) {
  const workspaceId = await getWorkspaceId();
  const opponent = alias(teams, "report_opponent");
  const scorer = alias(players, "report_scorer");
  const assist = alias(players, "report_assist");
  const primaryAction = alias(actions, "report_primary_action");

  const conditions = [eq(teams.workspaceId, workspaceId)];
  if (filters.seasonId) conditions.push(eq(seasons.id, filters.seasonId));
  if (filters.championshipId) conditions.push(eq(championships.id, filters.championshipId));
  if (filters.teamId) conditions.push(eq(goals.teamId, filters.teamId));
  if (filters.opponentTeamId) conditions.push(eq(goals.opponentTeamId, filters.opponentTeamId));
  if (filters.momentId) conditions.push(eq(goals.momentId, filters.momentId));
  if (filters.scorerId) conditions.push(eq(goals.scorerId, filters.scorerId));
  if (filters.assistId) conditions.push(eq(goals.assistId, filters.assistId));
  if (filters.minuteFrom !== undefined) conditions.push(gte(goals.minute, filters.minuteFrom));
  if (filters.minuteTo !== undefined) conditions.push(lte(goals.minute, filters.minuteTo));
  if (filters.attackDirection) conditions.push(eq(goals.attackDirection, filters.attackDirection));
  if (filters.subMomentId) {
    conditions.push(
      or(
        eq(goals.subMomentId, filters.subMomentId),
        sql`exists (
          select 1 from ${goalSubMomentActions} report_phase
          where report_phase.goal_id = ${goals.id}
            and report_phase.sub_moment_id = ${filters.subMomentId}
        )`
      )!
    );
  }
  if (filters.actionId) {
    conditions.push(
      or(
        eq(goals.actionId, filters.actionId),
        sql`exists (
          select 1 from ${goalActions} report_action
          where report_action.goal_id = ${goals.id}
            and report_action.action_id = ${filters.actionId}
        )`,
        sql`exists (
          select 1 from ${goalSubMomentActions} report_phase_action
          where report_phase_action.goal_id = ${goals.id}
            and report_phase_action.action_id = ${filters.actionId}
        )`
      )!
    );
  }
  if (filters.involvedPlayerId) {
    conditions.push(
      or(
        eq(goals.scorerId, filters.involvedPlayerId),
        eq(goals.assistId, filters.involvedPlayerId),
        sql`exists (
          select 1 from ${goalInvolvements} report_involvement
          where report_involvement.goal_id = ${goals.id}
            and report_involvement.player_id = ${filters.involvedPlayerId}
        )`
      )!
    );
  }
  if (filters.hasVideo !== undefined) {
    const videoCondition = sql`(${goals.mediaAssetId} is not null or coalesce(${goals.videoPath}, '') <> '')`;
    conditions.push(filters.hasVideo ? videoCondition : sql`not ${videoCondition}`);
  }

  const rows = await db
    .select({
      id: goals.id,
      minute: goals.minute,
      teamId: goals.teamId,
      teamName: teams.name,
      opponentTeamId: goals.opponentTeamId,
      opponentName: opponent.name,
      seasonId: seasons.id,
      seasonName: seasons.name,
      championshipId: championships.id,
      championshipName: championships.name,
      scorerId: goals.scorerId,
      scorerName: scorer.name,
      assistId: goals.assistId,
      assistName: assist.name,
      momentId: goals.momentId,
      momentName: moments.name,
      subMomentId: goals.subMomentId,
      subMomentName: subMoments.name,
      actionName: primaryAction.name,
      mediaAssetId: goals.mediaAssetId,
      videoPath: goals.videoPath,
      attackDirection: goals.attackDirection,
      notes: goals.notes
    })
    .from(goals)
    .innerJoin(teams, eq(goals.teamId, teams.id))
    .leftJoin(opponent, eq(goals.opponentTeamId, opponent.id))
    .leftJoin(championships, eq(teams.championshipId, championships.id))
    .leftJoin(seasons, eq(championships.seasonId, seasons.id))
    .leftJoin(scorer, eq(goals.scorerId, scorer.id))
    .leftJoin(assist, eq(goals.assistId, assist.id))
    .leftJoin(moments, eq(goals.momentId, moments.id))
    .leftJoin(subMoments, eq(goals.subMomentId, subMoments.id))
    .leftJoin(primaryAction, eq(goals.actionId, primaryAction.id))
    .where(and(...conditions))
    .orderBy(desc(goals.id))
    .limit(1000);

  if (rows.length === 0) return [];
  const ids = rows.map((row) => row.id);
  const [actionRows, sequenceRows] = await Promise.all([
    db
      .select({ goalId: goalActions.goalId, actionId: actions.id, actionName: actions.name })
      .from(goalActions)
      .innerJoin(actions, eq(goalActions.actionId, actions.id))
      .where(inArray(goalActions.goalId, ids)),
    db
      .select({
        goalId: goalSubMomentActions.goalId,
        subMomentName: subMoments.name,
        actionName: actions.name,
        sequenceOrder: goalSubMomentActions.sequenceOrder
      })
      .from(goalSubMomentActions)
      .innerJoin(subMoments, eq(goalSubMomentActions.subMomentId, subMoments.id))
      .innerJoin(actions, eq(goalSubMomentActions.actionId, actions.id))
      .where(inArray(goalSubMomentActions.goalId, ids))
      .orderBy(goalSubMomentActions.sequenceOrder)
  ]);

  const actionMap = new Map<number, string[]>();
  actionRows.forEach((row) => actionMap.set(row.goalId, [...(actionMap.get(row.goalId) ?? []), row.actionName]));
  const sequenceMap = new Map<number, typeof sequenceRows>();
  sequenceRows.forEach((row) => sequenceMap.set(row.goalId, [...(sequenceMap.get(row.goalId) ?? []), row]));

  return rows.map((row) => ({
    ...row,
    hasVideo: Boolean(row.mediaAssetId || row.videoPath),
    actions: actionMap.get(row.id) ?? (row.actionName ? [row.actionName] : []),
    phaseSequence: sequenceMap.get(row.id) ?? []
  }));
}
