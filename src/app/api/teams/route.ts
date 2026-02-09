import { NextResponse } from "next/server";
import { listTeams } from "@/server/catalog";

export async function GET() {
  const teams = await listTeams();
  return NextResponse.json(teams);
}

