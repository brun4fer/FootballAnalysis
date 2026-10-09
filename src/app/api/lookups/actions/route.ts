export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { db } from "@/db/client";
import { actions } from "@/schema/schema";
import { requireUser } from "@/lib/auth";
import { eq, inArray, max } from "drizzle-orm";

const schema = z.object({
  subMomentId: z.number().int().positive(),
  name: z.string().trim().min(2),
  context: z.enum(["field", "field_goal"]).default("field")
});

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = schema.parse(await req.json());
    const existing = await db.query.actions.findFirst({
      where: (fields, { and, eq }) => and(eq(fields.subMomentId, body.subMomentId), eq(fields.name, body.name))
    });
    if (existing) {
      const [restored] = await db
        .update(actions)
        .set({ isActive: true, context: body.context })
        .where(eq(actions.id, existing.id))
        .returning();
      return NextResponse.json(restored);
    }
    const [last] = await db
      .select({ value: max(actions.sortOrder) })
      .from(actions)
      .where(eq(actions.subMomentId, body.subMomentId));
    const [created] = await db
      .insert(actions)
      .values({
        subMomentId: body.subMomentId,
        name: body.name.trim(),
        context: body.context,
        sortOrder: Number(last?.value ?? 0) + 1
      })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}

const reorderSchema = z.object({
  subMomentId: z.number().int().positive(),
  orderedIds: z.array(z.number().int().positive()).min(1)
});

export async function PATCH(req: Request) {
  try {
    await requireUser();
    const body = reorderSchema.parse(await req.json());
    const rows = await db
      .select({ id: actions.id, subMomentId: actions.subMomentId })
      .from(actions)
      .where(inArray(actions.id, body.orderedIds));
    if (rows.length !== body.orderedIds.length || rows.some((row) => row.subMomentId !== body.subMomentId)) {
      return NextResponse.json({ error: "All actions must belong to the selected phase" }, { status: 400 });
    }
    await db.transaction(async (tx) => {
      for (const [index, id] of body.orderedIds.entries()) {
        await tx.update(actions).set({ sortOrder: index + 1 }).where(eq(actions.id, id));
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
