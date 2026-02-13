import { db } from "../db/client";
import { championships, players, teams, seasons } from "../schema/schema";
import { eq, asc } from "drizzle-orm";
import { championshipUpsertSchema, playerUpsertSchema, seasonUpsertSchema, teamUpsertSchema } from "../lib/validation";

export async function listChampionships() {
  return db.select().from(championships).orderBy(asc(championships.name));
}

export async function listSeasons() {
  return db.select().from(seasons).orderBy(asc(seasons.name));
}

export async function listTeamsWithMeta() {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      championshipId: teams.championshipId,
      emblem: teams.emblem,
      radiographyPdfUrl: teams.radiographyPdfUrl,
      videoReportUrl: teams.videoReportUrl,
      stadium: teams.stadium,
      coach: teams.coach,
      pitchDimensions: teams.pitchDimensions,
      pitchRating: teams.pitchRating
    })
    .from(teams)
    .orderBy(asc(teams.name));
}

export async function createTeam(payload: unknown) {
  const data = teamUpsertSchema.parse(payload);
  const [created] = await db
    .insert(teams)
    .values({
      championshipId: data.championshipId,
      name: data.name,
      emblem: data.emblem || null,
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
  const [updated] = await db
    .update(teams)
    .set({
      championshipId: data.championshipId,
      name: data.name,
      emblem: data.emblem || null,
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
  await db.delete(teams).where(eq(teams.id, id));
}

export async function createSeason(payload: unknown) {
  const data = seasonUpsertSchema.parse(payload);
  const [created] = await db.insert(seasons).values({ name: data.name, description: data.description || null }).returning();
  return created;
}

export async function updateSeason(id: number, payload: unknown) {
  const data = seasonUpsertSchema.parse(payload);
  const [updated] = await db.update(seasons).set({ name: data.name, description: data.description || null }).where(eq(seasons.id, id)).returning();
  return updated;
}

export async function deleteSeason(id: number) {
  await db.delete(seasons).where(eq(seasons.id, id));
}

export async function createChampionship(payload: unknown) {
  const data = championshipUpsertSchema.parse(payload);
  const [created] = await db
    .insert(championships)
    .values({ name: data.name, country: data.country, seasonId: data.seasonId, logo: data.logo || null })
    .returning();
  return created;
}

export async function updateChampionship(id: number, payload: unknown) {
  const data = championshipUpsertSchema.parse(payload);
  const [updated] = await db
    .update(championships)
    .set({ name: data.name, country: data.country, seasonId: data.seasonId, logo: data.logo || null })
    .where(eq(championships.id, id))
    .returning();
  return updated;
}

export async function deleteChampionship(id: number) {
  await db.delete(championships).where(eq(championships.id, id));
}

export async function listPlayersWithTeams(teamId?: number) {
  const baseQuery = db
    .select({
      id: players.id,
      name: players.name,
      teamId: players.teamId,
      photoUrl: players.photoUrl,
      primaryPosition: players.primaryPosition,
      secondaryPosition: players.secondaryPosition,
      tertiaryPosition: players.tertiaryPosition,
      dominantFoot: players.dominantFoot,
      heightCm: players.heightCm,
      weightKg: players.weightKg
    })
    .from(players);

  const scopedQuery = teamId ? baseQuery.where(eq(players.teamId, teamId)) : baseQuery;

  return await scopedQuery.orderBy(asc(players.name));
}

export async function createPlayer(payload: unknown) {
  const data = playerUpsertSchema.parse(payload);
  const [created] = await db
    .insert(players)
    .values({
      teamId: data.teamId,
      name: data.name,
      photoUrl: data.photoUrl || null,
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
  const [updated] = await db
    .update(players)
    .set({
      teamId: data.teamId,
      name: data.name,
      photoUrl: data.photoUrl || null,
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
  await db.delete(players).where(eq(players.id, id));
}
