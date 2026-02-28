export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createPlayer, listPlayersWithTeams } from "@/server/admin";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const teamIdParam = searchParams.get("teamId");
  const teamId = teamIdParam ? Number(teamIdParam) : undefined;
  const players = await listPlayersWithTeams(teamId);
  return NextResponse.json(players);
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const created = await createPlayer(json);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
