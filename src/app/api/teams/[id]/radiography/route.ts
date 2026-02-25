import { NextResponse } from "next/server";
import { getRadiography } from "@/server/radiography";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const teamId = Number(params.id);
  if (Number.isNaN(teamId)) return NextResponse.json({ error: "Invalid team id" }, { status: 400 });
  try {
    const data = await getRadiography(teamId);
    return NextResponse.json(data);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
