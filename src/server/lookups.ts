import { asc } from "drizzle-orm";
import { db } from "../db/client";
import { moments, subMoments, actions, championships, teams, seasons } from "../schema/schema";

export async function getLookups() {
  const [momentsRows, subMomentRows, actionRows, championshipRows, teamRows, seasonRows] = await Promise.all([
    db.select().from(moments).orderBy(asc(moments.name)),
    db.select().from(subMoments).orderBy(asc(subMoments.name)),
    db.select().from(actions).orderBy(asc(actions.name)),
    db.select().from(championships).orderBy(asc(championships.name)),
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(seasons).orderBy(asc(seasons.name))
  ]);
  return {
    moments: momentsRows,
    subMoments: subMomentRows,
    actions: actionRows,
    championships: championshipRows,
    teams: teamRows,
    seasons: seasonRows
  };
}
