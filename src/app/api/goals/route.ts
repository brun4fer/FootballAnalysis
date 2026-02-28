export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { createGoal, getGoalsByTeam } from "@/server/goals";
import { teamParamSchema } from "@/lib/validation";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    const { teamId } = teamParamSchema.parse({ teamId: searchParams.get("teamId") });
    const data = await getGoalsByTeam(teamId);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    const status = error instanceof ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    // Normalize payload before validation/insert
    const minute =
      json?.minute === undefined || json?.minute === null
        ? json?.minute
        : Number(String(json.minute).replace(/[^\d.-]/g, ""));
    const payload = {
      ...json,
      minute,
      // Ensure the drawing is plain JSON (no prototypes) so it can be stored as jsonb
      fieldDrawing: json?.fieldDrawing ? JSON.parse(JSON.stringify(json.fieldDrawing)) : json?.fieldDrawing,
      goalCoordinates: json?.goalCoordinates ? JSON.parse(JSON.stringify(json.goalCoordinates)) : json?.goalCoordinates,
      assistCoordinates: json?.assistCoordinates ? JSON.parse(JSON.stringify(json.assistCoordinates)) : json?.assistCoordinates
    };

    const id = await createGoal(payload);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    const status = error instanceof ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

