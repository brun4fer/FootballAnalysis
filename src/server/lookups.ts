import { asc } from "drizzle-orm";
import { db } from "../db/client";
import { moments, subMoments, actions, goalkeeperZones, championships, teams, seasons } from "../schema/schema";

const defaultZones = ["Upper Left", "Upper Center", "Upper Right", "Lower Left", "Lower Center", "Lower Right"];

export async function getLookups() {
  const existingZones = await db.select({ id: goalkeeperZones.id }).from(goalkeeperZones);
  if (existingZones.length === 0) {
    await db.insert(goalkeeperZones).values(defaultZones.map((name) => ({ name })));
  }

  const [momentsRows, subMomentRows, actionRows, zoneRows, championshipRows, teamRows, seasonRows] = await Promise.all([
    db.select().from(moments).orderBy(asc(moments.name)),
    db.select().from(subMoments).orderBy(asc(subMoments.name)),
    db.select().from(actions).orderBy(asc(actions.name)),
    db.select().from(goalkeeperZones).orderBy(asc(goalkeeperZones.id)),
    db.select().from(championships).orderBy(asc(championships.name)),
    db.select().from(teams).orderBy(asc(teams.name)),
    db.select().from(seasons).orderBy(asc(seasons.name))
  ]);
  return {
    moments: momentsRows,
    subMoments: subMomentRows,
    actions: actionRows,
    zones: zoneRows,
    championships: championshipRows,
    teams: teamRows,
    seasons: seasonRows
  };
}
