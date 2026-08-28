export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMediaAsset } from "@/lib/media-library";
import { createMediaPlaybackUrl } from "@/lib/media-r2";
import { ensureMediaWorkspace } from "@/lib/media-workspace";

export async function GET(_: Request, { params }: { params: { assetId: string } }) {
  try {
    const user = await requireUser();
    const { mediaWorkspace } = await ensureMediaWorkspace(user);
    const asset = await getMediaAsset(mediaWorkspace.id, params.assetId);
    if (!asset || asset.storageStatus !== "READY") {
      return NextResponse.json({ error: "Video not found in this workspace." }, { status: 404 });
    }
    return NextResponse.redirect(createMediaPlaybackUrl(asset.storageKey), {
      status: 302,
      headers: { "Cache-Control": "private, no-store" }
    });
  } catch (error) {
    console.error("[media-playback]", error);
    return NextResponse.json({ error: "Could not open this cloud video." }, { status: 500 });
  }
}
