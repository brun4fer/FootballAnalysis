export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { teamParamSchema } from "@/lib/validation";
import { mostInvolved } from "@/server/stats";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const { teamId } = teamParamSchema.parse({ teamId: searchParams.get("teamId") });
    const data = await mostInvolved(teamId);
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    const status = error instanceof ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

