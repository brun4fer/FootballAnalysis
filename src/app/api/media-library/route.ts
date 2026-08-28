export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { listReadyMediaAssets, serializeMediaAsset } from "@/lib/media-library";
import { ensureMediaWorkspace } from "@/lib/media-workspace";

export async function GET() {
  try {
    const user = await requireUser();
    const { mediaWorkspace } = await ensureMediaWorkspace(user);
    const assets = await listReadyMediaAssets(mediaWorkspace.id);
    return NextResponse.json({ assets: assets.map(serializeMediaAsset) });
  } catch (error) {
    console.error("[media-library]", error);
    return NextResponse.json({ error: "Could not load the shared cloud library." }, { status: 500 });
  }
}
