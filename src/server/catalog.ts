import { db } from "../db/client";
import { championships, players, teams } from "../schema/schema";
import { and, eq, asc } from "drizzle-orm";
import { getWorkspaceId } from "@/lib/auth";
import { requireOwnedTeam } from "./workspace";

export async function listChampionships() {
  const workspaceId = await getWorkspaceId();
  return db
    .select({
      id: championships.id,
      name: championships.name,
      seasonId: championships.seasonId
    })
    .from(championships)
    .where(eq(championships.workspaceId, workspaceId))
    .orderBy(asc(championships.name));
}

export async function listTeams(championshipId?: number) {
  const workspaceId = await getWorkspaceId();
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

  const scoped = base.where(
    championshipId
      ? and(eq(teams.championshipId, championshipId), eq(teams.workspaceId, workspaceId))
      : eq(teams.workspaceId, workspaceId)
  );

  return scoped.orderBy(asc(teams.name));
}

export async function listPlayers(teamId: number) {
  await requireOwnedTeam(teamId);
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
