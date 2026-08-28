import "server-only";

import { randomUUID } from "crypto";
import { mediaQuery, withMediaTransaction } from "@/lib/media-db";

export type LocalMediaAccount = {
  id: number;
  username: string;
  workspaceId: number;
  workspaceName: string;
};

export type MediaWorkspace = { id: string; displayName: string };

export function mediaAppId() {
  const value = process.env.MEDIA_LIBRARY_APP_ID?.trim();
  if (!value) throw new Error("Missing MEDIA_LIBRARY_APP_ID.");
  return value;
}

async function findMapping(appId: string, externalWorkspaceId: string) {
  const result = await mediaQuery<{
    mediaWorkspaceId: string;
    displayName: string;
  }>(
    `SELECT a."mediaWorkspaceId", w."displayName"
       FROM "MediaAccount" a
       JOIN "MediaWorkspace" w ON w."id" = a."mediaWorkspaceId"
      WHERE a."appId" = $1 AND a."externalWorkspaceId" = $2
      LIMIT 1`,
    [appId, externalWorkspaceId]
  );
  const row = result.rows[0];
  return row ? { id: row.mediaWorkspaceId, displayName: row.displayName } : null;
}

export async function ensureMediaWorkspace(account: LocalMediaAccount) {
  const appId = mediaAppId();
  const externalWorkspaceId = String(account.workspaceId);
  const existing = await findMapping(appId, externalWorkspaceId);
  if (existing) return { appId, mediaWorkspace: existing };

  try {
    const mediaWorkspace = await withMediaTransaction(async (client) => {
      const workspaceId = `mw_${randomUUID()}`;
      const accountId = `ma_${randomUUID()}`;
      await client.query(
        `INSERT INTO "MediaWorkspace" ("id", "displayName", "createdAt", "updatedAt")
         VALUES ($1, $2, now(), now())`,
        [workspaceId, account.workspaceName || account.username]
      );
      await client.query(
        `INSERT INTO "MediaAccount"
          ("id", "mediaWorkspaceId", "appId", "externalWorkspaceId", "externalUserId", "username", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, now(), now())`,
        [accountId, workspaceId, appId, externalWorkspaceId, String(account.id), account.username]
      );
      return { id: workspaceId, displayName: account.workspaceName || account.username };
    });
    return { appId, mediaWorkspace };
  } catch (error) {
    const created = await findMapping(appId, externalWorkspaceId);
    if (!created) throw error;
    return { appId, mediaWorkspace: created };
  }
}
