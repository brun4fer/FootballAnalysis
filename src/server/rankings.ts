import { sql } from "drizzle-orm";
import { db } from "../db/client";
import { goals, teams, championships, moments, subMoments, players, goalInvolvements } from "../schema/schema";

type Clause = ReturnType<typeof sql>;

const lowerSm = sql`lower(coalesce(sm.name, ''))`;
const lowerM = sql`lower(coalesce(m.name, ''))`;

const setPieceCase = sql`
  CASE
    WHEN ${lowerSm} LIKE '%canto%' THEN 'Canto'
    WHEN ${lowerSm} LIKE '%livre direto%' THEN 'Livre Direto'
    WHEN ${lowerSm} LIKE '%livre%' THEN 'Livre'
    WHEN ${lowerSm} LIKE '%penal%' OR ${lowerSm} LIKE '%penalty%' THEN 'Penálti'
    WHEN ${lowerSm} LIKE '%lançamento%' THEN 'Lançamento Lateral'
    ELSE 'Outros'
  END
`;

function buildFilters(seasonId?: number, championshipId?: number): Clause[] {
  const clauses: Clause[] = [];
  if (seasonId) clauses.push(sql`c.season_id = ${seasonId}`);
  if (championshipId) clauses.push(sql`c.id = ${championshipId}`);
  return clauses;
}

function whereWith(clauses: Clause[]) {
  if (clauses.length === 0) return sql``;
  return sql`WHERE ${sql.join(clauses, sql` AND `)}`;
}

function extendWhere(base: Clause[], extra?: Clause) {
  return whereWith(extra ? [...base, extra] : base);
}

async function groupGoalsByTeam(label: string, filters: Clause[], extra: Clause) {
  const where = extendWhere(filters, extra);
  return db.execute<{ teamId: number; team: string; label: string; goals: number; emblemPath: string | null }>(sql`
    SELECT t.id AS "teamId", t.name AS team, t.emblem_path AS "emblemPath", ${sql`${label}`} AS label, COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${teams} t ON t.id = g.team_id
    JOIN ${championships} c ON c.id = t.championship_id
    JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
    JOIN ${moments} m ON m.id = g.moment_id
    ${where}
    GROUP BY t.id, t.name, t.emblem_path, label
    ORDER BY goals DESC, team
  `);
}

export async function rankingsOverview(seasonId?: number, championshipId?: number) {
  const filters = buildFilters(seasonId, championshipId);

  const totalGoals = db.execute<{ teamId: number; team: string; goals: number; emblemPath: string | null }>(sql`
    SELECT t.id AS "teamId", t.name AS team, t.emblem_path AS "emblemPath", COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${teams} t ON t.id = g.team_id
    JOIN ${championships} c ON c.id = t.championship_id
    ${extendWhere(filters)}
    GROUP BY t.id, t.name, t.emblem_path
    ORDER BY goals DESC, team
  `);

  const organization = db.execute<{ teamId: number; team: string; goals: number; emblemPath: string | null }>(sql`
    SELECT t.id AS "teamId", t.name AS team, t.emblem_path AS "emblemPath", COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${teams} t ON t.id = g.team_id
    JOIN ${championships} c ON c.id = t.championship_id
    JOIN ${moments} m ON m.id = g.moment_id
    ${extendWhere(filters, sql`${lowerM} LIKE '%organiza%'`)}
    GROUP BY t.id, t.name, t.emblem_path
    ORDER BY goals DESC, team
  `);

  const transition = db.execute<{ teamId: number; team: string; goals: number; emblemPath: string | null }>(sql`
    SELECT t.id AS "teamId", t.name AS team, t.emblem_path AS "emblemPath", COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${teams} t ON t.id = g.team_id
    JOIN ${championships} c ON c.id = t.championship_id
    JOIN ${moments} m ON m.id = g.moment_id
    ${extendWhere(filters, sql`${lowerM} LIKE '%transi%'`)}
    GROUP BY t.id, t.name, t.emblem_path
    ORDER BY goals DESC, team
  `);

  const setPiecesTotal = db.execute<{ teamId: number; team: string; goals: number; emblemPath: string | null }>(sql`
    SELECT t.id AS "teamId", t.name AS team, t.emblem_path AS "emblemPath", COUNT(*)::int AS goals
    FROM ${goals} g
    JOIN ${teams} t ON t.id = g.team_id
    JOIN ${championships} c ON c.id = t.championship_id
    JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
    ${extendWhere(filters, sql`${setPieceCase} != 'Outros'`)}
    GROUP BY t.id, t.name, t.emblem_path
    ORDER BY goals DESC, team
  `);

  const corners = groupGoalsByTeam("Canto", filters, sql`${lowerSm} LIKE '%canto%'`);
  const freeKicks = groupGoalsByTeam(
    "Livre",
    filters,
    sql`${lowerSm} LIKE '%livre%' AND ${lowerSm} NOT LIKE '%direto%'`
  );
  const freeKicksDirect = groupGoalsByTeam("Livre Direto", filters, sql`${lowerSm} LIKE '%livre direto%'`);
  const penalties = groupGoalsByTeam("Penálti", filters, sql`${lowerSm} LIKE '%penal%' OR ${lowerSm} LIKE '%penalty%'`);
  const throwIns = groupGoalsByTeam("Lançamento Lateral", filters, sql`${lowerSm} LIKE '%lançamento%'`);

  const topScorers = db.execute<{ playerId: number; name: string; team: string; goals: number; photoPath: string | null }>(sql`
    SELECT player_id AS "playerId", name, team, "photoPath", goals
    FROM (
      SELECT p.id as player_id,
             p.name,
             t.name as team,
           COALESCE(p.photo_path, '') AS "photoPath",
             COUNT(*)::int AS goals
      FROM ${goals} g
      JOIN ${players} p ON p.id = g.scorer_id
      JOIN ${teams} t ON t.id = p.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      ${extendWhere(filters)}
      GROUP BY p.id, p.name, t.name, p.photo_path
    ) sub
    WHERE goals > 0
    ORDER BY goals DESC, name
    LIMIT 20
  `);

  const topAssists = db.execute<{ playerId: number; name: string; team: string; assists: number; photoPath: string | null }>(sql`
    SELECT p.id as "playerId", p.name, t.name as team, COALESCE(p.photo_path, '') AS "photoPath", COUNT(*)::int AS assists
    FROM ${goals} g
    JOIN ${players} p ON p.id = g.assist_id
    JOIN ${teams} t ON t.id = p.team_id
    JOIN ${championships} c ON c.id = t.championship_id
    ${extendWhere(filters, sql`g.assist_id IS NOT NULL`)}
    GROUP BY p.id, p.name, t.name, p.photo_path
    ORDER BY assists DESC, p.name
    LIMIT 20
  `);

  const goalInvolvement = db.execute<{
    playerId: number;
    name: string;
    team: string;
    involvement: number;
    photoPath: string | null;
  }>(sql`
    WITH scorer AS (
      SELECT g.scorer_id AS player_id, COUNT(*)::int AS goals
      FROM ${goals} g
      JOIN ${teams} t ON t.id = g.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      ${extendWhere(filters)}
      GROUP BY g.scorer_id
    ),
    assist AS (
      SELECT g.assist_id AS player_id, COUNT(*)::int AS assists
      FROM ${goals} g
      JOIN ${teams} t ON t.id = g.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      ${extendWhere(filters, sql`g.assist_id IS NOT NULL`)}
      GROUP BY g.assist_id
    ),
    involvement AS (
      SELECT gi.player_id, COUNT(*)::int AS involvements
      FROM ${goalInvolvements} gi
      JOIN ${goals} g ON g.id = gi.goal_id
      JOIN ${teams} t ON t.id = g.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      ${extendWhere(filters)}
      GROUP BY gi.player_id
    )
    SELECT *
    FROM (
      SELECT p.id AS "playerId",
             p.name,
             t.name AS team,
             COALESCE(p.photo_path, '') AS "photoPath",
             COALESCE(s.goals, 0) + COALESCE(a.assists, 0) + COALESCE(inv.involvements, 0) AS involvement
      FROM ${players} p
      JOIN ${teams} t ON t.id = p.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      LEFT JOIN scorer s ON s.player_id = p.id
      LEFT JOIN assist a ON a.player_id = p.id
      LEFT JOIN involvement inv ON inv.player_id = p.id
      ${extendWhere(filters)}
    ) sub
    WHERE involvement > 0
    ORDER BY involvement DESC, name
    LIMIT 20
  `);

  const results = await Promise.all([
    totalGoals,
    organization,
    transition,
    setPiecesTotal,
    corners,
    freeKicks,
    freeKicksDirect,
    penalties,
    throwIns,
    topScorers,
    topAssists,
    goalInvolvement
  ]);

  return {
    totalGoals: results[0].rows,
    organization: results[1].rows,
    transition: results[2].rows,
    setPiecesTotal: results[3].rows,
    corners: results[4].rows,
    freeKicks: results[5].rows,
    freeKicksDirect: results[6].rows,
    penalties: results[7].rows,
    throwIns: results[8].rows,
    topScorers: results[9].rows,
    topAssists: results[10].rows,
    goalInvolvement: results[11].rows
  };
}

export async function compareRankings(champA?: number, champB?: number, seasonA?: number, seasonB?: number) {
  const aggregate = async (champ?: number, season?: number) => {
    const filters = buildFilters(season, champ);

    const totalPromise = db.execute<{ goals: number }>(sql`
      SELECT COUNT(*)::int AS goals
      FROM ${goals} g
      JOIN ${teams} t ON t.id = g.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      ${extendWhere(filters)}
    `);

    const organizationPromise = db.execute<{ goals: number }>(sql`
      SELECT COUNT(*)::int AS goals
      FROM ${goals} g
      JOIN ${teams} t ON t.id = g.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      JOIN ${moments} m ON m.id = g.moment_id
      ${extendWhere(filters, sql`${lowerM} LIKE '%organiza%'`)}
    `);

    const transitionPromise = db.execute<{ goals: number }>(sql`
      SELECT COUNT(*)::int AS goals
      FROM ${goals} g
      JOIN ${teams} t ON t.id = g.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      JOIN ${moments} m ON m.id = g.moment_id
      ${extendWhere(filters, sql`${lowerM} LIKE '%transi%'`)}
    `);

    const setPiecesPromise = db.execute<{ goals: number }>(sql`
      SELECT COUNT(*)::int AS goals
      FROM ${goals} g
      JOIN ${teams} t ON t.id = g.team_id
      JOIN ${championships} c ON c.id = t.championship_id
      JOIN ${subMoments} sm ON sm.id = g.sub_moment_id
      ${extendWhere(filters, sql`${setPieceCase} != 'Outros'`)}
    `);

    const [total, organization, transition, setPieces] = await Promise.all([
      totalPromise,
      organizationPromise,
      transitionPromise,
      setPiecesPromise
    ]);

    return {
      championshipId: champ ?? null,
      seasonId: season ?? null,
      totalGoals: total.rows[0]?.goals ?? 0,
      organization: organization.rows[0]?.goals ?? 0,
      transition: transition.rows[0]?.goals ?? 0,
      setPieces: setPieces.rows[0]?.goals ?? 0
    };
  };

  const [A, B] = await Promise.all([aggregate(champA, seasonA), aggregate(champB, seasonB)]);
  return { A, B };
}
