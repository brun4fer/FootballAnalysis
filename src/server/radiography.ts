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

export async function getRadiography(teamId: number) {
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
      WHERE g.team_id = ${teamId}
    ) sub
    GROUP BY category
    ORDER BY category;
  `);

  const assistZones = db.execute<{ assistCoordinates: any; assistSector: string | null }>(sql`
    SELECT assist_coordinates AS "assistCoordinates", assist_sector AS "assistSector"
    FROM ${goals}
    WHERE team_id = ${teamId} AND (assist_coordinates IS NOT NULL OR assist_sector IS NOT NULL)
  `);

  const shotZones = db.execute<{ fieldDrawing: any; shotSector: string | null }>(sql`
    SELECT field_drawing AS "fieldDrawing", shot_sector AS "shotSector"
    FROM ${goals}
    WHERE team_id = ${teamId} AND (field_drawing IS NOT NULL OR shot_sector IS NOT NULL)
  `);

  const finishZones = db.execute<{ goalCoordinates: any; finishSector: string | null }>(sql`
    SELECT goal_coordinates AS "goalCoordinates", finish_sector AS "finishSector"
    FROM ${goals}
    WHERE team_id = ${teamId} AND (finish_sector IS NOT NULL OR goal_coordinates IS NOT NULL)
  `);

  const topScorers = db.execute<{ id: number; name: string; goals: number; photoPath: string | null }>(sql`
    SELECT p.id, p.name, COUNT(*)::int AS goals, COALESCE(p.photo_path, '') AS "photoPath"
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.scorer_id
    WHERE g.team_id = ${teamId}
    GROUP BY p.id, p.name, p.photo_path
    ORDER BY goals DESC, p.name
    LIMIT 3
  `);

  const topAssists = db.execute<{ id: number; name: string; assists: number; photoPath: string | null }>(sql`
    SELECT p.id, p.name, COUNT(*)::int AS assists, COALESCE(p.photo_path, '') AS "photoPath"
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.assist_id
    WHERE g.team_id = ${teamId} AND g.assist_id IS NOT NULL
    GROUP BY p.id, p.name, p.photo_path
    ORDER BY assists DESC, p.name
    LIMIT 3
  `);

  const topParticipation = db.execute<{ id: number; name: string; involvement: number; photoPath: string | null }>(sql`
    WITH scorer AS (
      SELECT scorer_id AS player_id, COUNT(*)::int AS goals
      FROM ${goals}
      WHERE team_id = ${teamId}
      GROUP BY scorer_id
    ),
    assist AS (
      SELECT assist_id AS player_id, COUNT(*)::int AS assists
      FROM ${goals}
      WHERE team_id = ${teamId} AND assist_id IS NOT NULL
      GROUP BY assist_id
    ),
    inv AS (
      SELECT gi.player_id, COUNT(*)::int AS involvements
      FROM ${goalInvolvements} gi
      JOIN ${goals} g ON g.id = gi.goal_id
      WHERE g.team_id = ${teamId}
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
    SELECT build_up_phase AS phase, COUNT(*)::int AS goals
    FROM ${goals}
    WHERE team_id = ${teamId}
      AND build_up_phase IS NOT NULL
      AND TRIM(build_up_phase) <> ''
      AND lower(build_up_phase) <> 'indefinido'
    GROUP BY build_up_phase
    ORDER BY goals DESC, build_up_phase
  `);

  const creationPhases = db.execute<{ phase: string; goals: number }>(sql`
    SELECT creation_phase AS phase, COUNT(*)::int AS goals
    FROM ${goals}
    WHERE team_id = ${teamId}
      AND creation_phase IS NOT NULL
      AND TRIM(creation_phase) <> ''
      AND lower(creation_phase) <> 'indefinido'
    GROUP BY creation_phase
    ORDER BY goals DESC, creation_phase
  `);

  const finalizationPhases = db.execute<{ phase: string; goals: number }>(sql`
    SELECT finalization_phase AS phase, COUNT(*)::int AS goals
    FROM ${goals}
    WHERE team_id = ${teamId}
      AND finalization_phase IS NOT NULL
      AND TRIM(finalization_phase) <> ''
      AND lower(finalization_phase) <> 'indefinido'
    GROUP BY finalization_phase
    ORDER BY goals DESC, finalization_phase
  `);

  const goalkeeperOutlets = db.execute<{ outlet: string; goals: number }>(sql`
    SELECT goalkeeper_outlet AS outlet, COUNT(*)::int AS goals
    FROM ${goals}
    WHERE team_id = ${teamId}
      AND goalkeeper_outlet IS NOT NULL
      AND TRIM(goalkeeper_outlet) <> ''
      AND lower(goalkeeper_outlet) <> 'indefinido'
    GROUP BY goalkeeper_outlet
    ORDER BY goals DESC, goalkeeper_outlet
  `);

  const cornerProfiles = db.execute<{ profile: string; goals: number }>(sql`
    SELECT corner_profile AS profile, COUNT(*)::int AS goals
    FROM ${goals}
    WHERE team_id = ${teamId}
      AND corner_profile IS NOT NULL
      AND TRIM(corner_profile) <> ''
      AND lower(corner_profile) <> 'indefinido'
    GROUP BY corner_profile
    ORDER BY goals DESC, corner_profile
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
      WHERE g.team_id = ${teamId}
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
    SELECT throw_in_profile AS profile, COUNT(*)::int AS goals
    FROM ${goals}
    WHERE team_id = ${teamId}
      AND throw_in_profile IS NOT NULL
      AND TRIM(throw_in_profile) <> ''
      AND lower(throw_in_profile) <> 'indefinido'
    GROUP BY throw_in_profile
    ORDER BY goals DESC, throw_in_profile
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
    throwInProfileRows
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
    throwInProfiles
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
      shotSector?: string | null;
      assistSector?: string | null;
      finishSector?: string | null;
    }>
  ) =>
    rows
      .map((r) => {
        const sector =
          normalizeSectorValue(r.assistSector) ??
          normalizeSectorValue(r.shotSector) ??
          normalizeSectorValue(r.finishSector) ??
          normalizeSectorValue(r.assistCoordinates?.sector) ??
          normalizeSectorValue(r.fieldDrawing?.sector) ??
          normalizeSectorValue(r.goalCoordinates?.sector);
        if (!sector) return null;
        return {
          x: r.assistCoordinates?.x ?? r.fieldDrawing?.x ?? r.goalCoordinates?.x ?? null,
          y: r.assistCoordinates?.y ?? r.fieldDrawing?.y ?? r.goalCoordinates?.y ?? null,
          sector
        };
      })
      .filter((point): point is { x: number | null; y: number | null; sector: string } => Boolean(point));

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
    team: teamMeta ? { ...teamMeta, emblemPath: onlyLocal(teamMeta.emblemPath) } : null
  };
}
