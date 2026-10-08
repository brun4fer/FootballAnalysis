export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { db } from "@/db/client";
import { subMoments } from "@/schema/schema";
import { eq } from "drizzle-orm";
import { requireUser } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional()
});

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const id = z.coerce.number().int().positive().parse(params.id);
    const body = updateSchema.parse(await req.json());
    const [updated] = await db.update(subMoments).set(body).where(eq(subMoments.id, id)).returning();
    if (!updated) return NextResponse.json({ error: "Sub-moment not found" }, { status: 404 });
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
    const [updated] = await db
      .update(subMoments)
      .set({ isActive: false })
      .where(eq(subMoments.id, id))
      .returning();
    if (!updated) return NextResponse.json({ error: "Sub-moment not found" }, { status: 404 });
    return NextResponse.json(updated);
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
