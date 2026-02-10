import { db } from "../db/client";
import { players, teams } from "../schema/schema";
import { eq, asc } from "drizzle-orm";

export async function listTeams() {
  return db.select().from(teams).orderBy(asc(teams.name));
}

export async function listPlayers(teamId: number) {
  return db.select().from(players).where(eq(players.teamId, teamId)).orderBy(asc(players.name));
}
