import { NextResponse } from "next/server";
import { compareRankings } from "@/server/rankings";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const champA = searchParams.get("champA");
  const champB = searchParams.get("champB");
  const seasonA = searchParams.get("seasonA");
  const seasonB = searchParams.get("seasonB");

  const data = await compareRankings(
    champA ? Number(champA) : undefined,
    champB ? Number(champB) : undefined,
    seasonA ? Number(seasonA) : undefined,
    seasonB ? Number(seasonB) : undefined
  );
  return NextResponse.json(data);
}
