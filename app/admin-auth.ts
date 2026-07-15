import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE_NAME = "koake_admin_session";

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 32) throw new Error("SESSION_SECRET must contain at least 32 characters");
  return value;
}

function expectedToken() {
  return createHmac("sha256", secret()).update("koake-photo-admin-v1").digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function getAdminUser() {
  const token = (await cookies()).get(COOKIE_NAME)?.value ?? "";
  return safeEqual(token, expectedToken()) ? { displayName: "KoAke Admin" } : null;
}

export async function requireAdminUser() {
  const user = await getAdminUser();
  if (!user) redirect("/studio/login");
  return user;
}

export function verifyAdminPassword(password: string) {
  const configured = process.env.ADMIN_PASSWORD ?? "";
  return configured.length >= 8 && safeEqual(password, configured);
}

export async function setAdminSession() {
  (await cookies()).set(COOKIE_NAME, expectedToken(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 });
}

export async function clearAdminSession() {
  (await cookies()).set(COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 0 });
}
