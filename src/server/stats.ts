import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { goalInvolvements, goals, moments, actions, subMoments, players, goalActions } from "../schema/schema";

export async function topScorers(teamId: number) {
  const result = await db.execute<{ id: number; name: string; goals: number; assists: number }>(sql`
    WITH goal_counts AS (
      SELECT scorer_id, COUNT(*)::int AS goals
      FROM ${goals}
      WHERE team_id = ${teamId}
      GROUP BY scorer_id
    ),
    assist_counts AS (
      SELECT assist_id, COUNT(*)::int AS assists
      FROM ${goals}
      WHERE team_id = ${teamId} AND assist_id IS NOT NULL
      GROUP BY assist_id
    )
    SELECT p.id,
           p.name,
           COALESCE(gc.goals, 0) AS goals,
           COALESCE(ac.assists, 0) AS assists
    FROM ${players} p
    LEFT JOIN goal_counts gc ON gc.scorer_id = p.id
    LEFT JOIN assist_counts ac ON ac.assist_id = p.id
    WHERE p.team_id = ${teamId} AND COALESCE(gc.goals, 0) > 0
    ORDER BY COALESCE(gc.goals, 0) DESC, COALESCE(ac.assists, 0) DESC, p.name;
  `);
  return result.rows;
}

export async function mostInvolved(teamId: number) {
  const result = await db.execute<{ id: number; name: string; involvement: number }>(sql`
    WITH goal_counts AS (
      SELECT scorer_id, COUNT(*)::int AS goals
      FROM ${goals}
      WHERE team_id = ${teamId}
      GROUP BY scorer_id
    ),
    assist_counts AS (
      SELECT assist_id, COUNT(*)::int AS assists
      FROM ${goals}
      WHERE team_id = ${teamId} AND assist_id IS NOT NULL
      GROUP BY assist_id
    ),
    involvement_counts AS (
      SELECT player_id, COUNT(DISTINCT goal_id)::int AS involvements
      FROM ${goalInvolvements}
      WHERE role != 'assist'
      GROUP BY player_id
    )
    SELECT p.id,
           p.name,
           COALESCE(gc.goals, 0) + COALESCE(ac.assists, 0) + COALESCE(ic.involvements, 0) AS involvement
    FROM ${players} p
    LEFT JOIN goal_counts gc ON gc.scorer_id = p.id
    LEFT JOIN assist_counts ac ON ac.assist_id = p.id
    LEFT JOIN involvement_counts ic ON ic.player_id = p.id
    WHERE p.team_id = ${teamId}
    ORDER BY involvement DESC, p.name;
  `);
  return result.rows;
}

export async function zoneDistribution(teamId: number) {
  const result = await db.execute<{ name: string; goals: number }>(sql`
    SELECT
      CASE
        WHEN (g.goal_coordinates ->> 'y')::float <= 0.5 THEN
          CASE
            WHEN (g.goal_coordinates ->> 'x')::float < 0.33 THEN 'Superior Esquerdo'
            WHEN (g.goal_coordinates ->> 'x')::float < 0.66 THEN 'Superior Centro'
            ELSE 'Superior Direito'
          END
        ELSE
          CASE
            WHEN (g.goal_coordinates ->> 'x')::float < 0.33 THEN 'Inferior Esquerdo'
            WHEN (g.goal_coordinates ->> 'x')::float < 0.66 THEN 'Inferior Centro'
            ELSE 'Inferior Direito'
          END
      END AS name,
      COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE g.team_id = ${teamId} AND g.goal_coordinates IS NOT NULL
    GROUP BY name
    ORDER BY goals DESC, name;
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
    ORDER BY goals DESC, m.name;
  `);
  return result.rows;
}

export async function actionsBreakdown(teamId: number) {
  const result = await db.execute<{ action: string; goals: number }>(sql`
    SELECT a.name AS action, COUNT(*)::int AS goals
    FROM ${goalActions} ga
    JOIN ${goals} g ON g.id = ga.goal_id
    JOIN ${actions} a ON a.id = ga.action_id
    WHERE g.team_id = ${teamId}
    GROUP BY a.name
    ORDER BY goals DESC, a.name;
  `);
  return result.rows;
}

export async function penaltiesByZone(teamId: number) {
  const result = await db.execute<{ zone: string; goals: number }>(sql`
    SELECT
      CASE
        WHEN (g.goal_coordinates ->> 'y')::float <= 0.5 THEN
          CASE
            WHEN (g.goal_coordinates ->> 'x')::float < 0.33 THEN 'Superior Esquerdo'
            WHEN (g.goal_coordinates ->> 'x')::float < 0.66 THEN 'Superior Centro'
            ELSE 'Superior Direito'
          END
        ELSE
          CASE
            WHEN (g.goal_coordinates ->> 'x')::float < 0.33 THEN 'Inferior Esquerdo'
            WHEN (g.goal_coordinates ->> 'x')::float < 0.66 THEN 'Inferior Centro'
            ELSE 'Inferior Direito'
          END
      END AS zone,
      COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
    WHERE g.team_id = ${teamId} AND sm.name = 'Penalty' AND g.goal_coordinates IS NOT NULL
    GROUP BY zone
    ORDER BY goals DESC, zone;
  `);
  return result.rows;
}
