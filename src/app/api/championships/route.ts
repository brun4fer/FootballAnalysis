export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listChampionships } from "@/server/catalog";

export async function GET() {
  const championships = await listChampionships();
  return NextResponse.json(championships);
}

