import "server-only";

import { randomUUID } from "crypto";
import { mediaQuery } from "@/lib/media-db";
import { mediaAppId } from "@/lib/media-workspace";

export type MediaAssetRow = {
  id: string;
  mediaWorkspaceId: string;
  fileName: string;
  fileSize: string;
  durationSeconds: number;
  mimeType: string;
  storageKey: string;
  storageStatus: "UPLOADING" | "READY" | "FAILED";
  etag: string | null;
  uploadedAt: Date | null;
  createdAt: Date;
};

export function serializeMediaAsset(asset: MediaAssetRow) {
  return {
    id: asset.id,
    fileName: asset.fileName,
    fileSize: String(asset.fileSize),
    durationSeconds: Number(asset.durationSeconds),
    mimeType: asset.mimeType,
    storageStatus: asset.storageStatus,
    etag: asset.etag,
    uploadedAt: asset.uploadedAt?.toISOString() ?? null,
    createdAt: asset.createdAt.toISOString()
  };
}

function safeFileName(fileName: string) {
  const cleaned = fileName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return cleaned.slice(-180) || "goal-video.mp4";
}

export async function createMediaAsset(input: {
  mediaWorkspaceId: string;
  fileName: string;
  fileSize: number;
  durationSeconds: number;
  mimeType: string;
  lastModified?: number | null;
}) {
  const id = `mas_${randomUUID()}`;
  const storageKey = `workspaces/${input.mediaWorkspaceId}/goal-clips/${id}/${safeFileName(input.fileName)}`;
  const result = await mediaQuery<MediaAssetRow>(
    `INSERT INTO "MediaAsset"
      ("id", "mediaWorkspaceId", "createdByAppId", "fileName", "fileSize", "durationSeconds", "mimeType", "lastModified", "storageKey", "storageStatus", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'UPLOADING', now(), now())
     RETURNING "id", "mediaWorkspaceId", "fileName", "fileSize", "durationSeconds", "mimeType", "storageKey", "storageStatus", "etag", "uploadedAt", "createdAt"`,
    [
      id,
      input.mediaWorkspaceId,
      mediaAppId(),
      input.fileName,
      input.fileSize,
      input.durationSeconds,
      input.mimeType,
      input.lastModified ? new Date(input.lastModified) : null,
      storageKey
    ]
  );
  return result.rows[0];
}

export async function listReadyMediaAssets(mediaWorkspaceId: string) {
  const result = await mediaQuery<MediaAssetRow>(
    `SELECT "id", "mediaWorkspaceId", "fileName", "fileSize", "durationSeconds", "mimeType", "storageKey", "storageStatus", "etag", "uploadedAt", "createdAt"
       FROM "MediaAsset"
      WHERE "mediaWorkspaceId" = $1 AND "storageStatus" = 'READY'
      ORDER BY "uploadedAt" DESC NULLS LAST, "createdAt" DESC
      LIMIT 200`,
    [mediaWorkspaceId]
  );
  return result.rows;
}

export async function getMediaAsset(mediaWorkspaceId: string, assetId: string) {
  const result = await mediaQuery<MediaAssetRow>(
    `SELECT "id", "mediaWorkspaceId", "fileName", "fileSize", "durationSeconds", "mimeType", "storageKey", "storageStatus", "etag", "uploadedAt", "createdAt"
       FROM "MediaAsset"
      WHERE "id" = $1 AND "mediaWorkspaceId" = $2
      LIMIT 1`,
    [assetId, mediaWorkspaceId]
  );
  return result.rows[0] ?? null;
}

export async function completeMediaAsset(mediaWorkspaceId: string, assetId: string, etag: string | null) {
  const result = await mediaQuery<MediaAssetRow>(
    `UPDATE "MediaAsset"
        SET "storageStatus" = 'READY', "etag" = $3, "uploadedAt" = now(), "updatedAt" = now()
      WHERE "id" = $1 AND "mediaWorkspaceId" = $2
      RETURNING "id", "mediaWorkspaceId", "fileName", "fileSize", "durationSeconds", "mimeType", "storageKey", "storageStatus", "etag", "uploadedAt", "createdAt"`,
    [assetId, mediaWorkspaceId, etag]
  );
  return result.rows[0] ?? null;
}

export async function setGoalMediaReference(input: {
  mediaWorkspaceId: string;
  mediaAssetId: string;
  goalId: number;
}) {
  const appId = mediaAppId();
  const externalVideoId = `goal:${input.goalId}`;
  await mediaQuery(
    `INSERT INTO "MediaReference"
      ("id", "mediaWorkspaceId", "mediaAssetId", "appId", "externalVideoId", "externalMatchId", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, now(), now())
     ON CONFLICT ("appId", "externalVideoId") DO UPDATE
       SET "mediaWorkspaceId" = EXCLUDED."mediaWorkspaceId", "mediaAssetId" = EXCLUDED."mediaAssetId", "externalMatchId" = EXCLUDED."externalMatchId", "updatedAt" = now()`,
    [`mr_${randomUUID()}`, input.mediaWorkspaceId, input.mediaAssetId, appId, externalVideoId, externalVideoId]
  );
}

export async function removeGoalMediaReference(goalId: number) {
  await mediaQuery(`DELETE FROM "MediaReference" WHERE "appId" = $1 AND "externalVideoId" = $2`, [mediaAppId(), `goal:${goalId}`]);
}
