import { asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { moments, subMoments, actions, championships, teams, seasons } from "../schema/schema";
import { getWorkspaceId } from "@/lib/auth";

const normalizeToken = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const OFFENSIVE_ORGANIZATION_MOMENT = "organizacao ofensiva";
const OFFENSIVE_ORGANIZATION_TARGET_SUB_MOMENTS = new Set(["construcao", "criacao", "finalizacao"]);
const OFFENSIVE_ORGANIZATION_LAUNCH_ACTION = "Lançamento para organização";

async function ensureOffensiveOrganizationLaunchAction(params: {
  momentsRows: Array<{ id: number; name: string }>;
  subMomentRows: Array<{ id: number; name: string; momentId: number }>;
}) {
  const offensiveOrganizationMomentIds = params.momentsRows
    .filter((moment) => normalizeToken(moment.name) === OFFENSIVE_ORGANIZATION_MOMENT)
    .map((moment) => moment.id);

  if (offensiveOrganizationMomentIds.length === 0) return;

  const targetSubMomentIds = params.subMomentRows
    .filter(
      (subMoment) =>
        offensiveOrganizationMomentIds.includes(subMoment.momentId) &&
        OFFENSIVE_ORGANIZATION_TARGET_SUB_MOMENTS.has(normalizeToken(subMoment.name))
    )
    .map((subMoment) => subMoment.id);

  if (targetSubMomentIds.length === 0) return;

  await db
    .insert(actions)
    .values(
      targetSubMomentIds.map((subMomentId) => ({
        subMomentId,
        name: OFFENSIVE_ORGANIZATION_LAUNCH_ACTION,
        context: "field" as const,
        sortOrder: 999
      }))
    )
    .onConflictDoNothing({ target: [actions.subMomentId, actions.name] });
}

export async function getLookups(options: { includeInactive?: boolean } = {}) {
  const workspaceId = await getWorkspaceId();
  const [momentsRows, subMomentRows, championshipRows, teamRows, seasonRows] = await Promise.all([
    db.select().from(moments).orderBy(asc(moments.name)),
    db
      .select()
      .from(subMoments)
      .where(options.includeInactive ? undefined : eq(subMoments.isActive, true))
      .orderBy(asc(subMoments.momentId), asc(subMoments.sortOrder), asc(subMoments.name)),
    db.select().from(championships).where(eq(championships.workspaceId, workspaceId)).orderBy(asc(championships.name)),
    db.select().from(teams).where(eq(teams.workspaceId, workspaceId)).orderBy(asc(teams.name)),
    db.select().from(seasons).where(eq(seasons.workspaceId, workspaceId)).orderBy(asc(seasons.name))
  ]);

  await ensureOffensiveOrganizationLaunchAction({ momentsRows, subMomentRows });
  const actionRows = await db
    .select()
    .from(actions)
    .where(options.includeInactive ? undefined : eq(actions.isActive, true))
    .orderBy(asc(actions.subMomentId), asc(actions.sortOrder), asc(actions.name));

  return {
    moments: momentsRows,
    subMoments: subMomentRows,
    actions: actionRows,
    championships: championshipRows,
    teams: teamRows,
    seasons: seasonRows
  };
}
