import { db } from "../db/client";
import { players, teams } from "../schema/schema";
import { eq, asc } from "drizzle-orm";

export async function listTeams() {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      championshipId: teams.championshipId,
      emblem: teams.emblem,
      radiographyPdfUrl: teams.radiographyPdfUrl,
      videoReportUrl: teams.videoReportUrl
    })
    .from(teams)
    .orderBy(asc(teams.name));
}

export async function listPlayers(teamId: number) {
  return db
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
    .from(players)
    .where(eq(players.teamId, teamId))
    .orderBy(asc(players.name));
}
