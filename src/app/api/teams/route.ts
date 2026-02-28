export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listTeams } from "@/server/catalog";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const championshipParam = searchParams.get("championshipId");
  const parsedChamp = championshipParam ? Number(championshipParam) : undefined;
  const championshipId = parsedChamp !== undefined && !Number.isNaN(parsedChamp) ? parsedChamp : undefined;

  const teams = await listTeams(championshipId);
  return NextResponse.json(teams);
}
