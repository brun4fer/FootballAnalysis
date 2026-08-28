import { db } from "../db/client";
import { championships, players, teams, seasons } from "../schema/schema";
import { and, eq, asc } from "drizzle-orm";
import { championshipUpsertSchema, playerUpsertSchema, seasonUpsertSchema, teamUpsertSchema } from "../lib/validation";
import { getWorkspaceId } from "@/lib/auth";
import { requireOwnedChampionship, requireOwnedPlayer, requireOwnedSeason, requireOwnedTeam } from "./workspace";

export async function listChampionships() {
  const workspaceId = await getWorkspaceId();
  return db.select().from(championships).where(eq(championships.workspaceId, workspaceId)).orderBy(asc(championships.name));
}

export async function listSeasons() {
  const workspaceId = await getWorkspaceId();
  return db.select().from(seasons).where(eq(seasons.workspaceId, workspaceId)).orderBy(asc(seasons.name));
}

export async function listTeamsWithMeta() {
  const workspaceId = await getWorkspaceId();
  return db
    .select({
      id: teams.id,
      name: teams.name,
      championshipId: teams.championshipId,
      emblemPath: teams.emblemPath,
      radiographyPdfUrl: teams.radiographyPdfUrl,
      videoReportUrl: teams.videoReportUrl,
      stadium: teams.stadium,
      coach: teams.coach,
      pitchDimensions: teams.pitchDimensions,
      pitchRating: teams.pitchRating
    })
    .from(teams)
    .where(eq(teams.workspaceId, workspaceId))
    .orderBy(asc(teams.name));
}

export async function createTeam(payload: unknown) {
  const data = teamUpsertSchema.parse(payload);
  const championship = await requireOwnedChampionship(data.championshipId);
  const [created] = await db
    .insert(teams)
    .values({
      championshipId: data.championshipId,
      workspaceId: championship.workspaceId,
      name: data.name,
      emblemPath: data.emblemPath || null,
      radiographyPdfUrl: data.radiographyPdfUrl || null,
      videoReportUrl: data.videoReportUrl || null,
      stadium: data.stadium || null,
      pitchDimensions: data.pitchDimensions || null,
      pitchRating: data.pitchRating ?? null,
      coach: data.coach || null,
      president: data.president || null
    })
    .returning();
  return created;
}

export async function updateTeam(id: number, payload: unknown) {
  const data = teamUpsertSchema.parse(payload);
  const [ownedTeam, championship] = await Promise.all([
    requireOwnedTeam(id),
    requireOwnedChampionship(data.championshipId)
  ]);
  if (ownedTeam.workspaceId !== championship.workspaceId) throw new Error("Championship not found");
  const [updated] = await db
    .update(teams)
    .set({
      championshipId: data.championshipId,
      name: data.name,
      emblemPath: data.emblemPath || null,
      radiographyPdfUrl: data.radiographyPdfUrl || null,
      videoReportUrl: data.videoReportUrl || null,
      stadium: data.stadium || null,
      pitchDimensions: data.pitchDimensions || null,
      pitchRating: data.pitchRating ?? null,
      coach: data.coach || null,
      president: data.president || null
    })
    .where(eq(teams.id, id))
    .returning();
  return updated;
}

export async function deleteTeam(id: number) {
  await requireOwnedTeam(id);
  await db.delete(teams).where(eq(teams.id, id));
}

export async function createSeason(payload: unknown) {
  const data = seasonUpsertSchema.parse(payload);
  const workspaceId = await getWorkspaceId();
  const [created] = await db.insert(seasons).values({ name: data.name, description: data.description || null, workspaceId }).returning();
  return created;
}

export async function updateSeason(id: number, payload: unknown) {
  const data = seasonUpsertSchema.parse(payload);
  const owned = await requireOwnedSeason(id);
  const [updated] = await db.update(seasons).set({ name: data.name, description: data.description || null }).where(and(eq(seasons.id, id), eq(seasons.workspaceId, owned.workspaceId))).returning();
  return updated;
}

export async function deleteSeason(id: number) {
  const owned = await requireOwnedSeason(id);
  await db.delete(seasons).where(and(eq(seasons.id, id), eq(seasons.workspaceId, owned.workspaceId)));
}

export async function createChampionship(payload: unknown) {
  const data = championshipUpsertSchema.parse(payload);
  const season = await requireOwnedSeason(data.seasonId);
  const [created] = await db
    .insert(championships)
    .values({ name: data.name, country: data.country, seasonId: data.seasonId, workspaceId: season.workspaceId, logo: data.logo || null })
    .returning();
  return created;
}

export async function updateChampionship(id: number, payload: unknown) {
  const data = championshipUpsertSchema.parse(payload);
  const [owned, season] = await Promise.all([requireOwnedChampionship(id), requireOwnedSeason(data.seasonId)]);
  if (owned.workspaceId !== season.workspaceId) throw new Error("Season not found");
  const [updated] = await db
    .update(championships)
    .set({ name: data.name, country: data.country, seasonId: data.seasonId, logo: data.logo || null })
    .where(eq(championships.id, id))
    .returning();
  return updated;
}

export async function deleteChampionship(id: number) {
  await requireOwnedChampionship(id);
  await db.delete(championships).where(eq(championships.id, id));
}

export async function listPlayersWithTeams(teamId?: number) {
  const workspaceId = await getWorkspaceId();
  const baseQuery = db
    .select({
      id: players.id,
      name: players.name,
      teamId: players.teamId,
      photoPath: players.photoPath,
      primaryPosition: players.primaryPosition,
      secondaryPosition: players.secondaryPosition,
      tertiaryPosition: players.tertiaryPosition,
      dominantFoot: players.dominantFoot,
      heightCm: players.heightCm,
      weightKg: players.weightKg
    })
    .from(players)
    .innerJoin(teams, eq(players.teamId, teams.id));

  const scopedQuery = baseQuery.where(
    teamId
      ? and(eq(players.teamId, teamId), eq(teams.workspaceId, workspaceId))
      : eq(teams.workspaceId, workspaceId)
  );

  return await scopedQuery.orderBy(asc(players.name));
}

export async function createPlayer(payload: unknown) {
  const data = playerUpsertSchema.parse(payload);
  await requireOwnedTeam(data.teamId);
  const [created] = await db
    .insert(players)
    .values({
      teamId: data.teamId,
      name: data.name,
      photoPath: data.photoPath || null,
      primaryPosition: data.primaryPosition,
      secondaryPosition: data.secondaryPosition || null,
      tertiaryPosition: data.tertiaryPosition || null,
      dominantFoot: data.dominantFoot || null,
      heightCm: data.heightCm ?? null,
      weightKg: data.weightKg ?? null
    })
    .returning();
  return created;
}

export async function updatePlayer(id: number, payload: unknown) {
  const data = playerUpsertSchema.parse(payload);
  await Promise.all([requireOwnedPlayer(id), requireOwnedTeam(data.teamId)]);
  const [updated] = await db
    .update(players)
    .set({
      teamId: data.teamId,
      name: data.name,
      photoPath: data.photoPath || null,
      primaryPosition: data.primaryPosition,
      secondaryPosition: data.secondaryPosition || null,
      tertiaryPosition: data.tertiaryPosition || null,
      dominantFoot: data.dominantFoot || null,
      heightCm: data.heightCm ?? null,
      weightKg: data.weightKg ?? null
    })
    .where(eq(players.id, id))
    .returning();
  return updated;
}

export async function deletePlayer(id: number) {
  await requireOwnedPlayer(id);
  await db.delete(players).where(eq(players.id, id));
}
