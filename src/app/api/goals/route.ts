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
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    const status = error instanceof ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const id = await createGoal(json);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    const status = error instanceof ZodError ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

