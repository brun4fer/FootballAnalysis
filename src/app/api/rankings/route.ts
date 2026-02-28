export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { rankingsOverview, compareRankings } from "@/server/rankings";

function parseIntParam(value: string | null, label: string) {
  if (!value) return undefined;
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) {
    throw new Error(`Parâmetro inválido: ${label}`);
  }
  return num;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  try {
    const seasonId = parseIntParam(searchParams.get("seasonId"), "seasonId");
    const championshipId = parseIntParam(searchParams.get("championshipId"), "championshipId");
    const compareA = parseIntParam(searchParams.get("champA"), "champA");
    const compareB = parseIntParam(searchParams.get("champB"), "champB");
    const seasonA = parseIntParam(searchParams.get("seasonA"), "seasonA");
    const seasonB = parseIntParam(searchParams.get("seasonB"), "seasonB");

    if (compareA || compareB) {
      const data = await compareRankings(compareA, compareB, seasonA, seasonB);
      return NextResponse.json(data);
    }

    const data = await rankingsOverview(seasonId, championshipId);
    return NextResponse.json(data);
  } catch (error: any) {
    const message = error?.message ?? "Erro inesperado ao carregar rankings";
    console.error("[GET /api/rankings]", message);
    const status = message.includes("Parâmetro inválido") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
