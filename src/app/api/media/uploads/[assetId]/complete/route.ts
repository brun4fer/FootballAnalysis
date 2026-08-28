export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { completeMediaAsset, getMediaAsset, serializeMediaAsset } from "@/lib/media-library";
import { headMediaObject } from "@/lib/media-r2";
import { ensureMediaWorkspace } from "@/lib/media-workspace";

export async function POST(_: Request, { params }: { params: { assetId: string } }) {
  try {
    const user = await requireUser();
    const { mediaWorkspace } = await ensureMediaWorkspace(user);
    const asset = await getMediaAsset(mediaWorkspace.id, params.assetId);
    if (!asset) return NextResponse.json({ error: "Video not found in this workspace." }, { status: 404 });

    const object = await headMediaObject(asset.storageKey);
    if (object.contentLength !== Number(asset.fileSize)) {
      return NextResponse.json({ error: "The uploaded video size does not match the selected file." }, { status: 409 });
    }
    const completed = await completeMediaAsset(mediaWorkspace.id, asset.id, object.etag);
    if (!completed) return NextResponse.json({ error: "Video not found in this workspace." }, { status: 404 });
    return NextResponse.json({ asset: serializeMediaAsset(completed) });
  } catch (error) {
    console.error("[media-upload-complete]", error);
    return NextResponse.json({ error: "Could not finish the cloud upload." }, { status: 500 });
  }
}
