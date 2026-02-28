export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createChampionship, listChampionships, listSeasons } from "@/server/admin";

export async function GET() {
  const [champs, seasons] = await Promise.all([listChampionships(), listSeasons()]);
  return NextResponse.json({ championships: champs, seasons });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const created = await createChampionship(body);
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
