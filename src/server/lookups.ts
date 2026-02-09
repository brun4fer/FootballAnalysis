import { db } from "@/db/client";
import { moments, subMoments, actions, goalkeeperZones } from "@/schema";
import { asc } from "drizzle-orm";

export async function getLookups() {
  const [momentsRows, subMomentRows, actionRows, zoneRows] = await Promise.all([
    db.select().from(moments).orderBy(asc(moments.name)),
    db.select().from(subMoments).orderBy(asc(subMoments.name)),
    db.select().from(actions).orderBy(asc(actions.name)),
    db.select().from(goalkeeperZones).orderBy(asc(goalkeeperZones.id))
  ]);
  return {
    moments: momentsRows,
    subMoments: subMomentRows,
    actions: actionRows,
    zones: zoneRows
  };
}

