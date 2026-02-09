import { db } from "@/db/client";
import { goalInvolvements, goals, goalkeeperZones, moments, actions, subMoments, players } from "@/schema";
import { sql } from "drizzle-orm";

export async function topScorers(teamId: number) {
  const result = await db.execute<{ id: number; name: string; goals: number }>(sql`
    SELECT p.id, p.name, COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.scorer_id
    WHERE g.team_id = ${teamId}
    GROUP BY p.id, p.name
    ORDER BY goals DESC;
  `);
  return result.rows;
}

export async function involvementLeaderboard(teamId: number) {
  const result = await db.execute<{ id: number; name: string; involvement: number }>(sql`
    SELECT
      p.id,
      p.name,
      COUNT(DISTINCT g.id) + COUNT(DISTINCT gi.id) AS involvement
    FROM ${players} p
    LEFT JOIN ${goals} g ON g.scorer_id = p.id
    LEFT JOIN ${goalInvolvements} gi ON gi.player_id = p.id
    WHERE p.team_id = ${teamId}
    GROUP BY p.id, p.name
    ORDER BY involvement DESC;
  `);
  return result.rows;
}

export async function zoneDistribution(teamId: number) {
  const result = await db.execute<{ name: string; goals: number }>(sql`
    SELECT gz.name, COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${goalkeeperZones} gz ON gz.id = g.goal_zone_id
    WHERE g.team_id = ${teamId}
    GROUP BY gz.name
    ORDER BY goals DESC;
  `);
  return result.rows;
}

export async function momentsBreakdown(teamId: number) {
  const result = await db.execute<{ moment: string; goals: number }>(sql`
    SELECT m.name AS moment, COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${moments} m ON m.id = g.moment_id
    WHERE g.team_id = ${teamId}
    GROUP BY m.name
    ORDER BY goals DESC;
  `);
  return result.rows;
}

export async function actionsBreakdown(teamId: number) {
  const result = await db.execute<{ action: string; goals: number }>(sql`
    SELECT a.name AS action, COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${actions} a ON a.id = g.action_id
    WHERE g.team_id = ${teamId}
    GROUP BY a.name
    ORDER BY goals DESC;
  `);
  return result.rows;
}

export async function penaltiesByZone(teamId: number) {
  const result = await db.execute<{ zone: string; goals: number }>(sql`
    SELECT gz.name AS zone, COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${goalkeeperZones} gz ON gz.id = g.goal_zone_id
    JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
    WHERE g.team_id = ${teamId} AND sm.name = 'Penalty'
    GROUP BY gz.name
    ORDER BY goals DESC;
  `);
  return result.rows;
}

