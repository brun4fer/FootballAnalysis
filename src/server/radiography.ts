import { sql } from "drizzle-orm";
import { db } from "../db/client";
import {
  goals,
  moments,
  subMoments,
  teams,
  players,
  goalInvolvements,
  goalActions,
  actions
} from "../schema/schema";

const lowerSm = sql`lower(coalesce(sm.name, ''))`;
const lowerM = sql`lower(coalesce(m.name, ''))`;

const setPieceCase = sql`
  CASE
    WHEN ${lowerSm} LIKE '%canto%' THEN 'Bola Parada'
    WHEN ${lowerSm} LIKE '%livre%' THEN 'Bola Parada'
    WHEN ${lowerSm} LIKE '%penal%' THEN 'Bola Parada'
    WHEN ${lowerSm} LIKE '%penalty%' THEN 'Bola Parada'
    WHEN ${lowerSm} LIKE '%lançamento%' OR ${lowerSm} LIKE '%lancamento%' THEN 'Bola Parada'
    ELSE 'Jogo Corrido'
  END
`;

const onlyLocal = (path?: string | null) => (path && path.startsWith("http") ? null : path || null);

export type RadiographyBpoCategory = "corners" | "free_kicks" | "direct_free_kicks" | "throw_ins";

type RadiographyFilters = {
  momentId?: number;
  bpoCategory?: RadiographyBpoCategory;
};

export async function getRadiography(teamId: number, filters?: RadiographyFilters) {
  const momentId = filters?.momentId;
  const bpoCategory = filters?.bpoCategory;
  const teamCondition = sql`g.team_id = ${teamId}`;
  const momentCondition = momentId ? sql` AND g.moment_id = ${momentId}` : sql``;
  const isCornerGoal = sql`EXISTS (
    SELECT 1
    FROM ${subMoments} sm_filter
    WHERE sm_filter.id = g.sub_moment_id
      AND lower(coalesce(sm_filter.name, '')) LIKE '%canto%'
  )`;
  const isThrowInGoal = sql`EXISTS (
    SELECT 1
    FROM ${subMoments} sm_filter
    WHERE sm_filter.id = g.sub_moment_id
      AND (
        lower(coalesce(sm_filter.name, '')) LIKE '%lançamento%'
        OR lower(coalesce(sm_filter.name, '')) LIKE '%lancamento%'
      )
  )`;
  const isFreeKickGoal = sql`EXISTS (
    SELECT 1
    FROM ${subMoments} sm_filter
    WHERE sm_filter.id = g.sub_moment_id
      AND lower(coalesce(sm_filter.name, '')) LIKE '%livre%'
      AND lower(coalesce(sm_filter.name, '')) NOT LIKE '%direto%'
  )`;
  const hasDirectAction = sql`(
    EXISTS (
      SELECT 1
      FROM ${actions} a_filter
      WHERE a_filter.id = g.action_id
        AND (
          lower(coalesce(a_filter.name, '')) LIKE '%diret%'
          OR lower(coalesce(a_filter.name, '')) LIKE '%direct%'
        )
    )
    OR EXISTS (
      SELECT 1
      FROM ${goalActions} ga_filter
      JOIN ${actions} a_filter ON a_filter.id = ga_filter.action_id
      WHERE ga_filter.goal_id = g.id
        AND (
          lower(coalesce(a_filter.name, '')) LIKE '%diret%'
          OR lower(coalesce(a_filter.name, '')) LIKE '%direct%'
        )
    )
  )`;
  const isDirectFreeKickGoal = sql`(
    EXISTS (
      SELECT 1
      FROM ${subMoments} sm_filter
      WHERE sm_filter.id = g.sub_moment_id
        AND lower(coalesce(sm_filter.name, '')) LIKE '%livre direto%'
    )
    OR (${isFreeKickGoal} AND ${hasDirectAction})
  )`;
  const bpoCondition = (() => {
    if (!bpoCategory) return sql``;
    if (bpoCategory === "corners") return sql` AND ${isCornerGoal}`;
    if (bpoCategory === "free_kicks") return sql` AND ${isFreeKickGoal} AND NOT ${hasDirectAction}`;
    if (bpoCategory === "direct_free_kicks") return sql` AND ${isDirectFreeKickGoal}`;
    if (bpoCategory === "throw_ins") return sql` AND ${isThrowInGoal}`;
    return sql``;
  })();
  const goalFilter = sql`${teamCondition}${momentCondition}${bpoCondition}`;
  const distribution = db.execute<{ category: string; goals: number }>(sql`
    SELECT category, COUNT(*)::int AS goals
    FROM (
      SELECT
        CASE
          WHEN ${setPieceCase} = 'Bola Parada' THEN 'Bola Parada'
          WHEN ${lowerM} LIKE '%transi%' THEN 'Transição'
          ELSE 'Organização'
        END AS category
      FROM ${goals} g
      JOIN ${moments} m ON m.id = g.moment_id
      JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
      WHERE ${goalFilter}
    ) sub
    GROUP BY category
    ORDER BY category;
  `);

  const assistZones = db.execute<{
    assistCoordinates: any;
    scorerName: string;
    minute: number;
  }>(sql`
    SELECT
      g.assist_coordinates AS "assistCoordinates",
      p.name AS "scorerName",
      g.minute AS minute
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.scorer_id
    WHERE ${goalFilter} AND g.assist_coordinates IS NOT NULL
  `);

  const shotZones = db.execute<{
    fieldDrawing: any;
    scorerName: string;
    minute: number;
  }>(sql`
    SELECT
      g.field_drawing AS "fieldDrawing",
      p.name AS "scorerName",
      g.minute AS minute
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.scorer_id
    WHERE ${goalFilter} AND g.field_drawing IS NOT NULL
  `);

  const finishZones = db.execute<{
    goalCoordinates: any;
    scorerName: string;
    minute: number;
  }>(sql`
    SELECT
      g.goal_coordinates AS "goalCoordinates",
      p.name AS "scorerName",
      g.minute AS minute
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.scorer_id
    WHERE ${goalFilter} AND g.goal_coordinates IS NOT NULL
  `);

  const topScorers = db.execute<{ id: number; name: string; goals: number; photoPath: string | null }>(sql`
    SELECT p.id, p.name, COUNT(*)::int AS goals, COALESCE(p.photo_path, '') AS "photoPath"
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.scorer_id
    WHERE ${goalFilter}
    GROUP BY p.id, p.name, p.photo_path
    ORDER BY goals DESC, p.name
    LIMIT 3
  `);

  const topAssists = db.execute<{ id: number; name: string; assists: number; photoPath: string | null }>(sql`
    SELECT p.id, p.name, COUNT(*)::int AS assists, COALESCE(p.photo_path, '') AS "photoPath"
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.assist_id
    WHERE ${goalFilter} AND g.assist_id IS NOT NULL
    GROUP BY p.id, p.name, p.photo_path
    ORDER BY assists DESC, p.name
    LIMIT 3
  `);

  const topParticipation = db.execute<{ id: number; name: string; involvement: number; photoPath: string | null }>(sql`
    WITH scorer AS (
      SELECT scorer_id AS player_id, COUNT(*)::int AS goals
      FROM ${goals} g
      WHERE ${goalFilter}
      GROUP BY scorer_id
    ),
    assist AS (
      SELECT assist_id AS player_id, COUNT(*)::int AS assists
      FROM ${goals} g
      WHERE ${goalFilter} AND g.assist_id IS NOT NULL
      GROUP BY assist_id
    ),
    inv AS (
      SELECT gi.player_id, COUNT(*)::int AS involvements
      FROM ${goalInvolvements} gi
      JOIN ${goals} g ON g.id = gi.goal_id
      WHERE ${goalFilter}
      GROUP BY gi.player_id
    )
    SELECT p.id, p.name,
      COALESCE(s.goals,0) + COALESCE(a.assists,0) + COALESCE(i.involvements,0) AS involvement,
      COALESCE(p.photo_path, '') AS "photoPath"
    FROM ${players} p
    LEFT JOIN scorer s ON s.player_id = p.id
    LEFT JOIN assist a ON a.player_id = p.id
    LEFT JOIN inv i ON i.player_id = p.id
    WHERE (COALESCE(s.goals,0) + COALESCE(a.assists,0) + COALESCE(i.involvements,0)) > 0
      AND p.team_id = ${teamId}
    ORDER BY involvement DESC, p.name
    LIMIT 3
  `);

  const buildUpPhases = db.execute<{ phase: string; goals: number }>(sql`
    SELECT g.build_up_phase AS phase, COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE ${goalFilter}
      AND g.build_up_phase IS NOT NULL
      AND TRIM(g.build_up_phase) <> ''
      AND lower(g.build_up_phase) <> 'indefinido'
    GROUP BY g.build_up_phase
    ORDER BY goals DESC, g.build_up_phase
  `);

  const creationPhases = db.execute<{ phase: string; goals: number }>(sql`
    SELECT g.creation_phase AS phase, COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE ${goalFilter}
      AND g.creation_phase IS NOT NULL
      AND TRIM(g.creation_phase) <> ''
      AND lower(g.creation_phase) <> 'indefinido'
    GROUP BY g.creation_phase
    ORDER BY goals DESC, g.creation_phase
  `);

  const finalizationPhases = db.execute<{ phase: string; goals: number }>(sql`
    SELECT g.finalization_phase AS phase, COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE ${goalFilter}
      AND g.finalization_phase IS NOT NULL
      AND TRIM(g.finalization_phase) <> ''
      AND lower(g.finalization_phase) <> 'indefinido'
    GROUP BY g.finalization_phase
    ORDER BY goals DESC, g.finalization_phase
  `);

  const goalkeeperOutlets = db.execute<{ outlet: string; goals: number }>(sql`
    SELECT g.goalkeeper_outlet AS outlet, COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE ${goalFilter}
      AND g.goalkeeper_outlet IS NOT NULL
      AND TRIM(g.goalkeeper_outlet) <> ''
      AND lower(g.goalkeeper_outlet) <> 'indefinido'
    GROUP BY g.goalkeeper_outlet
    ORDER BY goals DESC, g.goalkeeper_outlet
  `);

  const cornerProfiles = db.execute<{ profile: string; goals: number }>(sql`
    SELECT g.corner_profile AS profile, COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE ${goalFilter}
      AND g.corner_profile IS NOT NULL
      AND TRIM(g.corner_profile) <> ''
      AND lower(g.corner_profile) <> 'indefinido'
    GROUP BY g.corner_profile
    ORDER BY goals DESC, g.corner_profile
  `);

  const freekickProfiles = db.execute<{ profile: string; goals: number }>(sql`
    SELECT profile, COUNT(*)::int AS goals
    FROM (
      SELECT
        CASE
          WHEN g.freekick_profile IS NOT NULL
            AND TRIM(g.freekick_profile) <> ''
            AND lower(g.freekick_profile) <> 'indefinido'
          THEN g.freekick_profile
          ELSE 'livre'
        END AS profile
      FROM ${goals} g
      LEFT JOIN ${moments} m ON m.id = g.moment_id
      LEFT JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
      WHERE ${goalFilter}
        AND (
          (g.freekick_profile IS NOT NULL
            AND TRIM(g.freekick_profile) <> ''
            AND lower(g.freekick_profile) <> 'indefinido')
          OR (
            lower(m.name) LIKE '%bola parada%' AND lower(sm.name) LIKE '%livre%'
          )
        )
    ) freekick_data
    GROUP BY profile
    ORDER BY goals DESC, profile
  `);

  const throwInProfiles = db.execute<{ profile: string; goals: number }>(sql`
    SELECT g.throw_in_profile AS profile, COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE ${goalFilter}
      AND g.throw_in_profile IS NOT NULL
      AND TRIM(g.throw_in_profile) <> ''
      AND lower(g.throw_in_profile) <> 'indefinido'
    GROUP BY g.throw_in_profile
    ORDER BY goals DESC, g.throw_in_profile
  `);

  const momentGoalsCount = db.execute<{ goals: number }>(sql`
    SELECT COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE ${goalFilter}
  `);

  const teamGoalsCount = db.execute<{ goals: number }>(sql`
    SELECT COUNT(*)::int AS goals
    FROM ${goals} g
    WHERE g.team_id = ${teamId}
  `);

  const teamMeta = await db.query.teams.findFirst({
    where: (fields, { eq }) => eq(fields.id, teamId),
    columns: {
      id: true,
      name: true,
      emblemPath: true,
      coach: true,
      stadium: true,
      pitchDimensions: true
    }
  });

  const [
    distributionRows,
    assistRows,
    shotRows,
    finishRows,
    scorerRows,
    assistTopRows,
    participationRows,
    buildUpPhaseRows,
    creationPhaseRows,
    finalizationPhaseRows,
    goalkeeperOutletRows,
    cornerProfileRows,
    freekickProfileRows,
    throwInProfileRows,
    momentGoalsRows,
    teamGoalsRows
  ] = await Promise.all([
    distribution,
    assistZones,
    shotZones,
    finishZones,
    topScorers,
    topAssists,
    topParticipation,
    buildUpPhases,
    creationPhases,
    finalizationPhases,
    goalkeeperOutlets,
    cornerProfiles,
    freekickProfiles,
    throwInProfiles,
    momentGoalsCount,
    teamGoalsCount
  ]);

  const normalizeSectorValue = (value?: string | null) => {
    const cleaned = value?.toString().trim();
    if (!cleaned) return null;
    if (cleaned.toLowerCase() === "indefinido") return null;
    return cleaned;
  };

  const normalizePoints = (
    rows: Array<{
      assistCoordinates?: any;
      fieldDrawing?: any;
      goalCoordinates?: any;
      scorerName?: string | null;
      minute?: number | null;
    }>
  ) =>
    rows
      .map((r) => {
        const xValue = r.assistCoordinates?.x ?? r.fieldDrawing?.x ?? r.goalCoordinates?.x ?? null;
        const yValue = r.assistCoordinates?.y ?? r.fieldDrawing?.y ?? r.goalCoordinates?.y ?? null;
        const hasCoordinates = typeof xValue === "number" && typeof yValue === "number";
        const sector =
          normalizeSectorValue(r.assistCoordinates?.sector) ??
          normalizeSectorValue(r.fieldDrawing?.sector) ??
          normalizeSectorValue(r.goalCoordinates?.sector);
        if (!sector && !hasCoordinates) return null;
        return {
          x: hasCoordinates ? xValue : null,
          y: hasCoordinates ? yValue : null,
          sector: sector ?? null,
          scorerName: r.scorerName ?? null,
          minute: typeof r.minute === "number" ? r.minute : null
        };
      })
      .filter(
        (point): point is {
          x: number | null;
          y: number | null;
          sector: string | null;
          scorerName: string | null;
          minute: number | null;
        } => Boolean(point)
      );

  return {
    distribution: distributionRows.rows,
    assistZones: normalizePoints(assistRows.rows),
    shotZones: normalizePoints(shotRows.rows),
    finishZones: normalizePoints(finishRows.rows),
    topScorers: scorerRows.rows.map((r) => ({ ...r, photoPath: onlyLocal(r.photoPath) })),
    topAssists: assistTopRows.rows.map((r) => ({ ...r, photoPath: onlyLocal(r.photoPath) })),
    topParticipation: participationRows.rows.map((r) => ({ ...r, photoPath: onlyLocal(r.photoPath) })),
    buildUpPhases: buildUpPhaseRows.rows,
    creationPhases: creationPhaseRows.rows,
    finalizationPhases: finalizationPhaseRows.rows,
    goalkeeperOutlets: goalkeeperOutletRows.rows,
    cornerProfiles: cornerProfileRows.rows,
    freekickProfiles: freekickProfileRows.rows,
    throwInProfiles: throwInProfileRows.rows,
    momentGoals: momentGoalsRows.rows[0]?.goals ?? 0,
    teamGoals: teamGoalsRows.rows[0]?.goals ?? 0,
    team: teamMeta ? { ...teamMeta, emblemPath: onlyLocal(teamMeta.emblemPath) } : null
  };
}
