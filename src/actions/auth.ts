"use server";

import { eq, sql } from "drizzle-orm";
import { randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sessions, users, workspaces } from "@/schema";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function databaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const candidate = error as { code?: unknown; cause?: unknown };
  if (typeof candidate.code === "string") return candidate.code;
  return databaseErrorCode(candidate.cause);
}

function workspaceSlug(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 55) || "workspace";
  return `${base}-${randomBytes(4).toString("hex")}`;
}

export async function loginAction(formData: FormData) {
  const username = readText(formData, "username");
  const password = readText(formData, "password");

  if (!username || !password || username.length > 80 || password.length > 256) {
    redirect("/login?error=invalid");
  }

  let user: typeof users.$inferSelect | undefined;
  try {
    const rows = await db
      .select()
      .from(users)
      .where(sql`lower(${users.username}) = lower(${username})`)
      .limit(1);
    user = rows[0];

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      redirect("/login?error=invalid");
    }

    await createSession(user.id);
  } catch (error) {
    if (databaseErrorCode(error) === "42P01") redirect("/login?error=setup");
    throw error;
  }

  redirect(user.mustChangePassword ? "/account" : "/");
}

export async function registerAction(formData: FormData) {
  const workspaceName = readText(formData, "workspaceName");
  const username = readText(formData, "username");
  const password = readText(formData, "password");
  const confirmation = readText(formData, "confirmPassword");

  if (workspaceName.length < 2 || workspaceName.length > 120) {
    redirect("/register?error=workspace");
  }
  if (!/^[\p{L}\p{N}_.-]{3,40}$/u.test(username)) {
    redirect("/register?error=username");
  }
  if (password.length < 10 || password.length > 256 || password !== confirmation) {
    redirect("/register?error=password");
  }

  let userId: number;
  try {
    userId = await db.transaction(async (tx) => {
      const duplicate = await tx
        .select({ id: users.id })
        .from(users)
        .where(sql`lower(${users.username}) = lower(${username})`)
        .limit(1);
      if (duplicate.length > 0) throw Object.assign(new Error("Username already exists."), { code: "USERNAME_TAKEN" });

      const workspaceRows = await tx
        .insert(workspaces)
        .values({ name: workspaceName, slug: workspaceSlug(workspaceName) })
        .returning({ id: workspaces.id });
      const newWorkspaceId = workspaceRows[0]?.id;
      if (!newWorkspaceId) throw new Error("Could not create the workspace.");

      const userRows = await tx
        .insert(users)
        .values({
          username,
          passwordHash: await hashPassword(password),
          workspaceId: newWorkspaceId,
          mustChangePassword: false
        })
        .returning({ id: users.id });
      const newUserId = userRows[0]?.id;
      if (!newUserId) throw new Error("Could not create the account.");
      return newUserId;
    });

    await createSession(userId);
  } catch (error) {
    const code = databaseErrorCode(error);
    if (code === "42P01") redirect("/register?error=setup");
    if (code === "23505" || code === "USERNAME_TAKEN") redirect("/register?error=taken");
    throw error;
  }

  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function updateCredentialsAction(formData: FormData) {
  const currentUser = await requireUser({ allowPasswordChange: true });
  const username = readText(formData, "username");
  const currentPassword = readText(formData, "currentPassword");
  const newPassword = readText(formData, "newPassword");
  const confirmPassword = readText(formData, "confirmPassword");

  if (!/^[\p{L}\p{N}_.-]{3,40}$/u.test(username)) {
    redirect("/account?error=username");
  }
  if (newPassword.length < 10 || newPassword.length > 256 || newPassword !== confirmPassword) {
    redirect("/account?error=password");
  }

  const existing = await db.select().from(users).where(eq(users.id, currentUser.id)).limit(1);
  if (!existing[0] || !(await verifyPassword(currentPassword, existing[0].passwordHash))) {
    redirect("/account?error=current");
  }

  const duplicate = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username}) and ${users.id} <> ${currentUser.id}`)
    .limit(1);
  if (duplicate.length > 0) redirect("/account?error=taken");

  await db
    .update(users)
    .set({
      username,
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false
    })
    .where(eq(users.id, currentUser.id));

  await db.delete(sessions).where(eq(sessions.userId, currentUser.id));
  await createSession(currentUser.id);
  redirect("/?credentialsUpdated=1");
}
