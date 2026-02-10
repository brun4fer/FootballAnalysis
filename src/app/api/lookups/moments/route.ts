import { NextResponse } from "next/server";
import { ZodError, z } from "zod";
import { db } from "@/db/client";
import { moments } from "@/schema/schema";

const schema = z.object({ name: z.string().min(2) });

export async function POST(req: Request) {
  try {
    const body = schema.parse(await req.json());
    const existing = await db.query.moments.findFirst({ where: (fields, { eq }) => eq(fields.name, body.name) });
    if (existing) return NextResponse.json(existing);
    const [created] = await db.insert(moments).values({ name: body.name }).returning();
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}
