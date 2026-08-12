"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { logActivity } from "@/lib/audit";

const SESSION_COOKIE = "ekdant_session";
const SESSION_DAYS = 7;
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? "ekdant-dev-secret-change-in-production"
);
// NOTE: keep the fallback secret identical to the one in src/lib/auth.ts,
// or move these helpers into that module, so tokens verify consistently.

export type AuthResult = { ok: true } | { ok: false; error: string };

export async function login(
  _prevState: unknown,
  formData: FormData
): Promise<AuthResult> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!loginId || !password) {
    return { ok: false, error: "Please enter both Login ID and Password." };
  }

  const user = await db.user.findUnique({ where: { loginId } });
  if (!user || user.status !== "ACTIVE") {
    return { ok: false, error: "Invalid Login ID or Password." };
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Invalid Login ID or Password." };
  }

  // Create session token
  const token = await new SignJWT({
    loginId: user.loginId,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(SECRET);

  // Session cookie (no maxAge): the browser clears it when the app closes,
  // so reopening the app always shows the login page. The JWT still carries
  // a 7-day expiry as a server-side safety net.
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await logActivity({
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    description: `User ${user.loginId} logged in`,
  });

  return { ok: true };
}

export async function changePassword(formData: FormData): Promise<AuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return { ok: false, error: "Not authenticated." };

  let userId: string;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    userId = payload.sub as string;
  } catch {
    return { ok: false, error: "Session expired. Please log in again." };
  }

  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { ok: false, error: "All fields are required." };
  }

  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters long." };
  }

  if (newPassword !== confirmPassword) {
    return { ok: false, error: "New passwords do not match." };
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false, error: "User not found." };

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    return { ok: false, error: "Current password is incorrect." };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.user.update({
    where: { id: userId },
    data: { passwordHash: newHash },
  });

  await logActivity({
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: userId,
    description: `Password changed for user ${user.loginId}`,
  });

  return { ok: true };
}

export async function requestPasswordReset(
  _prevState: unknown,
  formData: FormData
): Promise<AuthResult> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  if (!loginId) return { ok: false, error: "Please enter your Login ID." };

  const user = await db.user.findUnique({ where: { loginId } });
  if (!user) {
    // Don't reveal whether the user exists
    return { ok: true };
  }

  // Generate a reset token (random 8-character code)
  const token = Array.from(
    { length: 8 },
    () => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random() * 32)]
  ).join("");

  await db.passwordReset.create({
    data: {
      userId: user.id,
      token,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    },
  });

  // No email infrastructure configured — store the reset code in the DB.
  // The administrator can read it from the server console (documented approach).
  console.log(
    `[PASSWORD RESET] Login ID: ${loginId} — Reset code: ${token} (valid 30 min)`
  );

  return { ok: true };
}

export async function resetPassword(
  _prevState: unknown,
  formData: FormData
): Promise<AuthResult> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const resetCode = String(formData.get("resetCode") ?? "").trim().toUpperCase();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!loginId || !resetCode || !newPassword) {
    return { ok: false, error: "All fields are required." };
  }

  if (newPassword.length < 8) {
    return { ok: false, error: "New password must be at least 8 characters long." };
  }

  const user = await db.user.findUnique({ where: { loginId } });
  if (!user) return { ok: false, error: "Invalid reset code." };

  const reset = await db.passwordReset.findFirst({
    where: {
      userId: user.id,
      token: resetCode,
      usedAt: null,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!reset) {
    return { ok: false, error: "Invalid or expired reset code." };
  }

  const newHash = await bcrypt.hash(newPassword, 12);
  await db.$transaction([
    db.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash },
    }),
    db.passwordReset.update({
      where: { id: reset.id },
      data: { usedAt: new Date() },
    }),
  ]);

  await logActivity({
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: user.id,
    description: `Password reset for user ${user.loginId}`,
  });

  return { ok: true };
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
  redirect("/login");
}