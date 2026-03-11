import { db } from "../db/client";
import { championships, players, teams } from "../schema/schema";
import { eq, asc } from "drizzle-orm";

export async function listChampionships() {
  return db
    .select({
      id: championships.id,
      name: championships.name,
      seasonId: championships.seasonId
    })
    .from(championships)
    .orderBy(asc(championships.name));
}

export async function listTeams(championshipId?: number) {
  const base = db
    .select({
      id: teams.id,
      name: teams.name,
      championshipId: teams.championshipId,
      emblemPath: teams.emblemPath,
      radiographyPdfUrl: teams.radiographyPdfUrl,
      videoReportUrl: teams.videoReportUrl,
      coach: teams.coach
    })
    .from(teams);

  const scoped = championshipId ? base.where(eq(teams.championshipId, championshipId)) : base;

  return scoped.orderBy(asc(teams.name));
}

export async function listPlayers(teamId: number) {
  return db
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
    .where(eq(players.teamId, teamId))
    .orderBy(asc(players.name));
}
