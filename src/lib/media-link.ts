import "server-only";

import { createHash, randomBytes, randomUUID } from "crypto";
import { mediaQuery, withMediaTransaction } from "@/lib/media-db";
import { ensureMediaWorkspace, type LocalMediaAccount } from "@/lib/media-workspace";

function tokenHash(token: string) {
  return createHash("sha256").update(token.trim()).digest("hex");
}

export async function getMediaLinkStatus(account: LocalMediaAccount) {
  const { mediaWorkspace } = await ensureMediaWorkspace(account);
  const result = await mediaQuery<{ appId: string }>(
    `SELECT "appId" FROM "MediaAccount" WHERE "mediaWorkspaceId" = $1 ORDER BY "appId" ASC`,
    [mediaWorkspace.id]
  );
  const linkedApps = [...new Set(result.rows.map((row) => row.appId))];
  return { linkedApps, linked: linkedApps.length > 1 };
}

export async function createMediaLinkToken(account: LocalMediaAccount) {
  const { mediaWorkspace } = await ensureMediaWorkspace(account);
  const token = randomBytes(24).toString("base64url");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
  await mediaQuery(
    `INSERT INTO "MediaLinkToken" ("id", "mediaWorkspaceId", "tokenHash", "expiresAt", "createdAt")
     VALUES ($1, $2, $3, $4, now())`,
    [`mlt_${randomUUID()}`, mediaWorkspace.id, tokenHash(token), expiresAt]
  );
  return { token, expiresAt: expiresAt.toISOString() };
}

export async function claimMediaLinkToken(account: LocalMediaAccount, token: string) {
  const normalized = token.trim();
  if (normalized.length < 20) throw new Error("Enter a valid cloud library linking code.");
  const { mediaWorkspace: currentWorkspace } = await ensureMediaWorkspace(account);

  await withMediaTransaction(async (client) => {
    const linkResult = await client.query<{
      id: string;
      mediaWorkspaceId: string;
    }>(
      `SELECT "id", "mediaWorkspaceId"
         FROM "MediaLinkToken"
        WHERE "tokenHash" = $1 AND "usedAt" IS NULL AND "expiresAt" > now()
        FOR UPDATE`,
      [tokenHash(normalized)]
    );
    const link = linkResult.rows[0];
    if (!link) throw new Error("This linking code is invalid, expired or has already been used.");

    if (link.mediaWorkspaceId !== currentWorkspace.id) {
      const source = currentWorkspace.id;
      const target = link.mediaWorkspaceId;
      await client.query(`UPDATE "MediaAsset" SET "mediaWorkspaceId" = $1, "updatedAt" = now() WHERE "mediaWorkspaceId" = $2`, [target, source]);
      await client.query(`UPDATE "MediaReference" SET "mediaWorkspaceId" = $1, "updatedAt" = now() WHERE "mediaWorkspaceId" = $2`, [target, source]);
      await client.query(`UPDATE "MediaAccount" SET "mediaWorkspaceId" = $1, "updatedAt" = now() WHERE "mediaWorkspaceId" = $2`, [target, source]);
      await client.query(`UPDATE "MediaLinkToken" SET "mediaWorkspaceId" = $1 WHERE "mediaWorkspaceId" = $2`, [target, source]);
      await client.query(`DELETE FROM "MediaWorkspace" WHERE "id" = $1`, [source]);
    }

    await client.query(`UPDATE "MediaLinkToken" SET "usedAt" = now() WHERE "id" = $1`, [link.id]);
  });

  return getMediaLinkStatus(account);
}
