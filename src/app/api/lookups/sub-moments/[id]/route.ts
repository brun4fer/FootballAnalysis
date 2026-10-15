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

const normalizeName = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();

const fixedSetPieceSubMoments = new Set([
  "canto",
  "livre",
  "livre direto",
  "livre directo",
  "penalti",
  "penalty",
  "lancamento lateral"
]);

const isFixedSetPieceSubMoment = (name: string) => fixedSetPieceSubMoments.has(normalizeName(name));

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireUser();
    const id = z.coerce.number().int().positive().parse(params.id);
    const body = updateSchema.parse(await req.json());
    const current = await db.query.subMoments.findFirst({ where: eq(subMoments.id, id) });
    if (!current) return NextResponse.json({ error: "Sub-moment not found" }, { status: 404 });
    if (isFixedSetPieceSubMoment(current.name) && (body.isActive === false || (body.name && body.name !== current.name))) {
      return NextResponse.json(
        { error: "Corner, free-kick, throw-in and penalty categories are fixed. Manage their internal actions instead." },
        { status: 400 }
      );
    }
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
    const current = await db.query.subMoments.findFirst({ where: eq(subMoments.id, id) });
    if (!current) return NextResponse.json({ error: "Sub-moment not found" }, { status: 404 });
    if (isFixedSetPieceSubMoment(current.name)) {
      return NextResponse.json(
        { error: "Corner, free-kick, throw-in and penalty categories cannot be removed." },
        { status: 400 }
      );
    }
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
