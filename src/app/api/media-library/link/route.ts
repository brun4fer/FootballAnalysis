export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { claimMediaLinkToken, createMediaLinkToken, getMediaLinkStatus } from "@/lib/media-link";

export async function GET() {
  try {
    return NextResponse.json(await getMediaLinkStatus(await requireUser()));
  } catch (error) {
    console.error("[media-library-link]", error);
    return NextResponse.json({ error: "Could not load the cloud library connection." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const account = await requireUser();
    const body = await request.json();
    if (body.action === "create") return NextResponse.json(await createMediaLinkToken(account), { status: 201 });
    if (body.action === "claim") {
      return NextResponse.json(await claimMediaLinkToken(account, typeof body.token === "string" ? body.token : ""));
    }
    return NextResponse.json({ error: "Invalid cloud library linking action." }, { status: 400 });
  } catch (error) {
    console.error("[media-library-link]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not link the cloud library." },
      { status: 500 }
    );
  }
}
