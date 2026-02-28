export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listPlayers } from "@/server/catalog";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const teamId = Number(params.id);
  if (!Number.isFinite(teamId) || teamId <= 0) {
    return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  }
  const players = await listPlayers(teamId);
  return NextResponse.json(players);
}
