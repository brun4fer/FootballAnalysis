export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { deleteGoal, getGoalById, updateGoal } from "@/server/goals";
import { ZodError } from "zod";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  const goal = await getGoalById(id);
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(goal);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const json = await req.json();
    const payload = {
      ...json,
      subMomentSequence: Array.isArray(json?.subMomentSequence)
        ? json.subMomentSequence.map((entry: any) => ({
            subMomentId: Number(entry?.subMomentId),
            actionId: Number(entry?.actionId),
            sequenceOrder: Number(entry?.sequenceOrder)
          }))
        : undefined
    };
    const updated = await updateGoal(id, payload);
    return NextResponse.json({ id: updated });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (Number.isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  try {
    const deletedId = await deleteGoal(id);
    return NextResponse.json({ id: deletedId });
  } catch (error) {
    const message = (error as Error).message;
    const status = message === "Goal not found" ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
