export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { actions } from "@/schema/schema";
import { requireUser } from "@/lib/auth";

const updateSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    context: z.enum(["field", "field_goal"]).optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.number().int().min(0).optional()
  })
  .refine((body) => Object.keys(body).length > 0, "Provide at least one field");

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const id = z.coerce.number().int().positive().parse(params.id);
    const body = updateSchema.parse(await req.json());
    const [updated] = await db.update(actions).set(body).where(eq(actions.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Action not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const id = z.coerce.number().int().positive().parse(params.id);
    const [updated] = await db.update(actions).set({ isActive: false }).where(eq(actions.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Action not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
