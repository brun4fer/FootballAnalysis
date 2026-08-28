"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { sessions, users } from "@/schema";
import { createSession, destroySession, requireUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

function readText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

export async function loginAction(formData: FormData) {
  const username = readText(formData, "username");
  const password = readText(formData, "password");

  if (!username || !password || username.length > 80 || password.length > 256) {
    redirect("/login?error=invalid");
  }

  const rows = await db
    .select()
    .from(users)
    .where(sql`lower(${users.username}) = lower(${username})`)
    .limit(1);
  const user = rows[0];

  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    redirect("/login?error=invalid");
  }

  await createSession(user.id);
  redirect(user.mustChangePassword ? "/account" : "/");
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
