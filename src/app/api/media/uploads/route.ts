export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createMediaAsset, serializeMediaAsset } from "@/lib/media-library";
import { createMediaUploadUrl } from "@/lib/media-r2";
import { ensureMediaWorkspace } from "@/lib/media-workspace";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const fileName = typeof body.fileName === "string" ? body.fileName.trim() : "";
    const fileSize = Number(body.fileSize);
    const durationSeconds = Number(body.durationSeconds);
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim().toLowerCase() : "";
    const lastModified = body.lastModified == null ? null : Number(body.lastModified);

    if (!fileName || fileName.length > 255) return NextResponse.json({ error: "Invalid file name." }, { status: 400 });
    if (!Number.isSafeInteger(fileSize) || fileSize <= 0 || fileSize > 5 * 1024 ** 3) {
      return NextResponse.json({ error: "The video must be between 1 byte and 5 GB." }, { status: 400 });
    }
    if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
      return NextResponse.json({ error: "Invalid video duration." }, { status: 400 });
    }
    if (!mimeType.startsWith("video/")) return NextResponse.json({ error: "Select a video file." }, { status: 400 });

    const { mediaWorkspace } = await ensureMediaWorkspace(user);
    const asset = await createMediaAsset({
      mediaWorkspaceId: mediaWorkspace.id,
      fileName,
      fileSize,
      durationSeconds,
      mimeType,
      lastModified: Number.isFinite(lastModified) ? lastModified : null
    });
    return NextResponse.json(
      { asset: serializeMediaAsset(asset), uploadUrl: createMediaUploadUrl(asset.storageKey) },
      { status: 201 }
    );
  } catch (error) {
    console.error("[media-upload-create]", error);
    return NextResponse.json({ error: "Could not start the cloud upload." }, { status: 500 });
  }
}
