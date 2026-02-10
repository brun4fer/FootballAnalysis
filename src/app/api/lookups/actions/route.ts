import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { db } from "@/db/client";
import { actions } from "@/schema/schema";

const schema = z.object({
  subMomentId: z.number().int().positive(),
  name: z.string().min(2),
  context: z.enum(["field", "field_goal"]).default("field_goal")
});

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const existing = await db.query.actions.findFirst({
      where: (fields, { and, eq }) => and(eq(fields.subMomentId, body.subMomentId), eq(fields.name, body.name))
    });
    if (existing) return NextResponse.json(existing);
    const [created] = await db.insert(actions).values({ subMomentId: body.subMomentId, name: body.name, context: body.context }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
