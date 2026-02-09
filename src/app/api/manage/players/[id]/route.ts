import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { deletePlayer, updatePlayer } from "@/server/admin";

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const json = await req.json();
    const updated = await updatePlayer(Number(params.id), json);
    return NextResponse.json(updated);
  } catch (error) {
    const status = error instanceof ZodError ? 400 : 500;
    const message = error instanceof ZodError ? error.flatten() : (error as Error).message;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await deletePlayer(Number(params.id));
  return NextResponse.json({ ok: true });
}
