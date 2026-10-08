export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { db } from "@/db/client";
import { subMoments } from "@/schema/schema";
import { eq, max } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const schema = z.object({
  momentId: z.number().int().positive(),
  name: z.string().min(2)
});

export async function POST(req: Request) {
  try {
    await requireUser();
    const body = schema.parse(await req.json());
    const existing = await db.query.subMoments.findFirst({
      where: (fields, { and, eq }) => and(eq(fields.momentId, body.momentId), eq(fields.name, body.name))
    });
    if (existing) {
      const [restored] = await db
        .update(subMoments)
        .set({ isActive: true })
        .where(eq(subMoments.id, existing.id))
        .returning();
      return NextResponse.json(restored);
    }
    const [last] = await db
      .select({ value: max(subMoments.sortOrder) })
      .from(subMoments)
      .where(eq(subMoments.momentId, body.momentId));
    const [created] = await db
      .insert(subMoments)
      .values({ momentId: body.momentId, name: body.name, sortOrder: Number(last?.value ?? 0) + 1 })
      .returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}

const reorderSchema = z.object({ orderedIds: z.array(z.number().int().positive()).min(1) });

export async function PATCH(req: Request) {
  try {
    await requireUser();
    const body = reorderSchema.parse(await req.json());
    await db.transaction(async (tx) => {
      for (const [index, id] of body.orderedIds.entries()) {
        await tx.update(subMoments).set({ sortOrder: index + 1 }).where(eq(subMoments.id, id));
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
