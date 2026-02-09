import { NextResponse } from "next/server";
import { listPlayers } from "@/server/catalog";

export async function GET(_: Request, { params }: { params: { teamId: string } }) {
  const teamId = Number(params.teamId);
  if (!Number.isFinite(teamId) || teamId <= 0) {
    return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  }
  const players = await listPlayers(teamId);
  return NextResponse.json(players);
}
