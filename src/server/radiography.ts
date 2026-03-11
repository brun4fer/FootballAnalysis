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
  goalSubMomentActions,
  actions
} from "../schema/schema";

const lowerSm = sql`lower(coalesce(sm.name, ''))`;
const lowerM = sql`lower(coalesce(m.name, ''))`;

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const hiddenActionPatterns = [
  "jogador referencia",
  "jogadores referencia",
  "espacos que atacam",
  "falta sobre",
  "falta sofrida",
  "sofreu a falta",
  "momento anterior",
  "marcador",
  "assistencia",
  "assistencia e marcador",
  "marcador e assistencia"
];

const shouldHideFromSubMomentActionBreakdown = (actionName: string) => {
  const normalized = normalizeToken(actionName);
  return hiddenActionPatterns.some((pattern) => normalized.includes(pattern));
};

const isTransitionRecoverySubMoment = (subMomentName: string) => {
  const normalized = normalizeToken(subMomentName);
  return (
    normalized.includes("recuperacao") &&
    (normalized.includes("meio campo defensivo") || normalized.includes("meio campo ofensivo"))
  );
};

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

async function hasTable(tableName: string) {
  try {
    const result = await db.execute<{ exists: boolean }>(sql`
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = ANY(current_schemas(false))
          AND table_name = ${tableName}
      ) AS "exists"
    `);
    return Boolean(result.rows[0]?.exists);
  } catch {
    return false;
  }
}

export type RadiographyBpoCategory = "corners" | "free_kicks" | "direct_free_kicks" | "throw_ins";

type RadiographyFilters = {
  momentId?: number;
  bpoCategory?: RadiographyBpoCategory;
};

export async function getRadiography(teamId: number, filters?: RadiographyFilters) {
  const momentId = filters?.momentId;
  const bpoCategory = filters?.bpoCategory;
  const shouldComputeSubMomentBreakdown = Boolean(momentId || bpoCategory);
  const hasGoalSubMomentActionsTable = await hasTable("goal_sub_moment_actions");
  const selectedMoment = momentId
    ? await db.query.moments.findFirst({
        where: (fields, { eq }) => eq(fields.id, momentId),
        columns: { name: true }
      })
    : null;
  const shouldUseSequenceBreakdown =
    hasGoalSubMomentActionsTable &&
    Boolean(selectedMoment && normalizeToken(selectedMoment.name).includes("organizacao ofensiva"));
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

  const topReferencePlayers = db.execute<{ id: number; name: string; referenceCount: number; photoPath: string | null }>(sql`
    WITH filtered_goals AS (
      SELECT g.id, g.reference_player_id, g.action_id
      FROM ${goals} g
      WHERE ${goalFilter}
        AND g.reference_player_id IS NOT NULL
    ),
    goal_action_links AS (
      SELECT fg.id AS goal_id, fg.reference_player_id, link.action_id
      FROM filtered_goals fg
      JOIN LATERAL (
        SELECT DISTINCT action_id
        FROM (
          SELECT fg.action_id AS action_id
          UNION ALL
          SELECT ga.action_id
          FROM ${goalActions} ga
          WHERE ga.goal_id = fg.id
        ) raw_actions
        WHERE action_id IS NOT NULL
      ) link ON TRUE
    ),
    reference_goals AS (
      SELECT DISTINCT gal.goal_id, gal.reference_player_id
      FROM goal_action_links gal
      JOIN ${actions} a_ref ON a_ref.id = gal.action_id
      WHERE translate(
        lower(coalesce(a_ref.name, '')),
        'áàâãäéèêëíìîïóòôõöúùûüç',
        'aaaaaeeeeiiiiooooouuuuc'
      ) LIKE '%referenc%'
    )
    SELECT p.id, p.name, COUNT(*)::int AS "referenceCount", COALESCE(p.photo_path, '') AS "photoPath"
    FROM reference_goals rg
    JOIN ${players} p ON p.id = rg.reference_player_id
    WHERE p.team_id = ${teamId}
    GROUP BY p.id, p.name, p.photo_path
    ORDER BY "referenceCount" DESC, p.name
    LIMIT 3
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

  const subMomentTotalsPromise: Promise<{ rows: Array<{ subMomentId: number; subMoment: string; totalGoals: number }> }> =
    !shouldComputeSubMomentBreakdown
      ? Promise.resolve({ rows: [] })
      : shouldUseSequenceBreakdown
        ? momentId
          ? db.execute<{ subMomentId: number; subMoment: string; totalGoals: number }>(sql`
              WITH filtered_goal_sequences AS (
                SELECT gsma.goal_id, gsma.sub_moment_id
                FROM ${goalSubMomentActions} gsma
                JOIN ${goals} g ON g.id = gsma.goal_id
                WHERE ${goalFilter}
              )
              SELECT
                sm.id AS "subMomentId",
                sm.name AS "subMoment",
                COUNT(fgs.goal_id)::int AS "totalGoals"
              FROM ${subMoments} sm
              LEFT JOIN filtered_goal_sequences fgs ON fgs.sub_moment_id = sm.id
              WHERE sm.moment_id = ${momentId}
              GROUP BY sm.id, sm.name
              ORDER BY sm.name
            `)
          : db.execute<{ subMomentId: number; subMoment: string; totalGoals: number }>(sql`
              SELECT
                sm.id AS "subMomentId",
                sm.name AS "subMoment",
                COUNT(*)::int AS "totalGoals"
              FROM ${goalSubMomentActions} gsma
              JOIN ${goals} g ON g.id = gsma.goal_id
              JOIN ${subMoments} sm ON sm.id = gsma.sub_moment_id
              WHERE ${goalFilter}
              GROUP BY sm.id, sm.name
              ORDER BY sm.name
            `)
        : momentId
          ? db.execute<{ subMomentId: number; subMoment: string; totalGoals: number }>(sql`
              SELECT
                sm.id AS "subMomentId",
                sm.name AS "subMoment",
                COUNT(g.id)::int AS "totalGoals"
              FROM ${subMoments} sm
              LEFT JOIN ${goals} g
                ON g.sub_moment_id = sm.id
                AND g.team_id = ${teamId}
                ${bpoCondition}
              WHERE sm.moment_id = ${momentId}
              GROUP BY sm.id, sm.name
              ORDER BY sm.name
            `)
          : db.execute<{ subMomentId: number; subMoment: string; totalGoals: number }>(sql`
              SELECT
                sm.id AS "subMomentId",
                sm.name AS "subMoment",
                COUNT(*)::int AS "totalGoals"
              FROM ${goals} g
              JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
              WHERE ${goalFilter}
              GROUP BY sm.id, sm.name
              ORDER BY sm.name
            `);

  const subMomentActionsPromise: Promise<{ rows: Array<{ subMomentId: number; action: string; goals: number }> }> =
    !shouldComputeSubMomentBreakdown
      ? Promise.resolve({ rows: [] })
      : shouldUseSequenceBreakdown
        ? db.execute<{ subMomentId: number; action: string; goals: number }>(sql`
            SELECT
              gsma.sub_moment_id AS "subMomentId",
              a.name AS action,
              COUNT(*)::int AS goals
            FROM ${goalSubMomentActions} gsma
            JOIN ${goals} g ON g.id = gsma.goal_id
            JOIN ${actions} a ON a.id = gsma.action_id
            WHERE ${goalFilter}
            GROUP BY gsma.sub_moment_id, a.name
            ORDER BY gsma.sub_moment_id, goals DESC, a.name
          `)
        : db.execute<{ subMomentId: number; action: string; goals: number }>(sql`
            WITH filtered_goals AS (
              SELECT g.id, g.sub_moment_id, g.action_id
              FROM ${goals} g
              WHERE ${goalFilter}
            ),
            goal_action_links AS (
              SELECT fg.id AS goal_id, fg.sub_moment_id, link.action_id
              FROM filtered_goals fg
              JOIN LATERAL (
                SELECT DISTINCT action_id
                FROM (
                  SELECT fg.action_id AS action_id
                  UNION ALL
                  SELECT ga.action_id
                  FROM ${goalActions} ga
                  WHERE ga.goal_id = fg.id
                ) raw_actions
                WHERE action_id IS NOT NULL
              ) link ON TRUE
            )
            SELECT
              gal.sub_moment_id AS "subMomentId",
              a.name AS action,
              COUNT(DISTINCT gal.goal_id)::int AS goals
            FROM goal_action_links gal
            JOIN ${actions} a ON a.id = gal.action_id
            GROUP BY gal.sub_moment_id, a.name
            ORDER BY gal.sub_moment_id, goals DESC, a.name
          `);

  const recoverySpaceRowsPromise: Promise<{
    rows: Array<{ subMomentId: number; subMoment: string; zoneId: number; goals: number }>;
  }> =
    !shouldComputeSubMomentBreakdown
      ? Promise.resolve({ rows: [] })
      : db.execute<{ subMomentId: number; subMoment: string; zoneId: number; goals: number }>(sql`
          SELECT
            g.sub_moment_id AS "subMomentId",
            sm.name AS "subMoment",
            g.attacking_space_id AS "zoneId",
            COUNT(*)::int AS goals
          FROM ${goals} g
          JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
          WHERE ${goalFilter}
            AND g.attacking_space_id IS NOT NULL
            AND g.attacking_space_id BETWEEN 1 AND 10
          GROUP BY g.sub_moment_id, sm.name, g.attacking_space_id
          ORDER BY g.sub_moment_id, g.attacking_space_id
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
    referencePlayersRows,
    goalkeeperOutletRows,
    cornerProfileRows,
    freekickProfileRows,
    throwInProfileRows,
    momentGoalsRows,
    teamGoalsRows,
    subMomentTotalsRows,
    subMomentActionRows,
    recoverySpaceRows
  ] = await Promise.all([
    distribution,
    assistZones,
    shotZones,
    finishZones,
    topScorers,
    topAssists,
    topParticipation,
    topReferencePlayers,
    goalkeeperOutlets,
    cornerProfiles,
    freekickProfiles,
    throwInProfiles,
    momentGoalsCount,
    teamGoalsCount,
    subMomentTotalsPromise,
    subMomentActionsPromise,
    recoverySpaceRowsPromise
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

  const totalsBySubMomentId = new Map<number, { subMoment: string; totalGoals: number }>();
  for (const row of subMomentTotalsRows.rows) {
    totalsBySubMomentId.set(row.subMomentId, {
      subMoment: row.subMoment,
      totalGoals: row.totalGoals
    });
  }

  const actionsBySubMomentId = new Map<number, Array<{ action: string; goals: number }>>();
  for (const row of subMomentActionRows.rows) {
    if (shouldHideFromSubMomentActionBreakdown(row.action)) continue;
    const bucket = actionsBySubMomentId.get(row.subMomentId) ?? [];
    bucket.push({ action: row.action, goals: row.goals });
    actionsBySubMomentId.set(row.subMomentId, bucket);
    if (!totalsBySubMomentId.has(row.subMomentId)) {
      totalsBySubMomentId.set(row.subMomentId, {
        subMoment: "",
        totalGoals: row.goals
      });
    }
  }

  const subMomentActionBreakdown = Array.from(totalsBySubMomentId.entries())
    .map(([subMomentId, totals]) => {
      const rawActions = actionsBySubMomentId.get(subMomentId) ?? [];
      const actions = rawActions
        .sort((a, b) => (b.goals === a.goals ? a.action.localeCompare(b.action) : b.goals - a.goals))
        .map((entry) => ({
          action: entry.action,
          goals: entry.goals,
          percent: totals.totalGoals > 0 ? Number(((entry.goals / totals.totalGoals) * 100).toFixed(1)) : 0
        }));

      return {
        subMomentId,
        subMoment: totals.subMoment || "Sub-momento",
        totalGoals: totals.totalGoals,
        actions
      };
    })
    .sort((a, b) => a.subMoment.localeCompare(b.subMoment));

  const recoveryCountsBySubMoment = new Map<number, Map<number, number>>();
  const recoveryNamesBySubMoment = new Map<number, string>();
  for (const row of recoverySpaceRows.rows) {
    if (!isTransitionRecoverySubMoment(row.subMoment)) continue;
    const zoneMap = recoveryCountsBySubMoment.get(row.subMomentId) ?? new Map<number, number>();
    zoneMap.set(row.zoneId, row.goals);
    recoveryCountsBySubMoment.set(row.subMomentId, zoneMap);
    recoveryNamesBySubMoment.set(row.subMomentId, row.subMoment);
  }

  const transitionRecoveryTotals = subMomentTotalsRows.rows.filter((row) => isTransitionRecoverySubMoment(row.subMoment));
  const recoverySourceRows =
    transitionRecoveryTotals.length > 0
      ? transitionRecoveryTotals
      : Array.from(recoveryNamesBySubMoment.entries()).map(([subMomentId, subMoment]) => ({
          subMomentId,
          subMoment,
          totalGoals: Array.from(recoveryCountsBySubMoment.get(subMomentId)?.values() ?? []).reduce(
            (sum, value) => sum + value,
            0
          )
        }));

  const recoverySpaces = recoverySourceRows
    .map((row) => {
      const zoneMap = recoveryCountsBySubMoment.get(row.subMomentId) ?? new Map<number, number>();
      const zones = Array.from({ length: 10 }, (_, idx) => {
        const zoneId = idx + 1;
        const goals = zoneMap.get(zoneId) ?? 0;
        const percent = row.totalGoals > 0 ? Number(((goals / row.totalGoals) * 100).toFixed(1)) : 0;
        return { zoneId, goals, percent };
      });

      return {
        subMomentId: row.subMomentId,
        subMoment: row.subMoment,
        totalGoals: row.totalGoals,
        zones
      };
    })
    .sort((a, b) => a.subMoment.localeCompare(b.subMoment));

  return {
    distribution: distributionRows.rows,
    assistZones: normalizePoints(assistRows.rows),
    shotZones: normalizePoints(shotRows.rows),
    finishZones: normalizePoints(finishRows.rows),
    topScorers: scorerRows.rows.map((r) => ({ ...r, photoPath: onlyLocal(r.photoPath) })),
    topAssists: assistTopRows.rows.map((r) => ({ ...r, photoPath: onlyLocal(r.photoPath) })),
    topParticipation: participationRows.rows.map((r) => ({ ...r, photoPath: onlyLocal(r.photoPath) })),
    referencePlayers: referencePlayersRows.rows.map((r) => ({
      id: r.id,
      name: r.name,
      references: r.referenceCount,
      photoPath: onlyLocal(r.photoPath)
    })),
    goalkeeperOutlets: goalkeeperOutletRows.rows,
    cornerProfiles: cornerProfileRows.rows,
    freekickProfiles: freekickProfileRows.rows,
    throwInProfiles: throwInProfileRows.rows,
    subMomentActionBreakdown,
    recoverySpaces,
    momentGoals: momentGoalsRows.rows[0]?.goals ?? 0,
    teamGoals: teamGoalsRows.rows[0]?.goals ?? 0,
    team: teamMeta ? { ...teamMeta, emblemPath: onlyLocal(teamMeta.emblemPath) } : null
  };
}
