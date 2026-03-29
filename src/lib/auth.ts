import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { getTenantByApiKey, getAdminByEmail, insertMagicLink } from "./supabase";
import { sendMagicLinkEmail } from "./email";
import type { Tenant } from "./supabase";

const JWT_SECRET_KEY = () =>
  new TextEncoder().encode(process.env.JWT_SECRET!);

const AUTH_COOKIE = "auth-token";

// ---------- API Key Auth ----------

export async function getAuthFromApiKey(
  req: NextRequest
): Promise<Tenant | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer tk_")) return null;
  const apiKey = authHeader.replace("Bearer ", "");
  return getTenantByApiKey(apiKey);
}

// ---------- Admin JWT Auth ----------

export interface AdminPayload {
  email: string;
  iat: number;
  exp: number;
}

export async function signAdminToken(email: string): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET_KEY());
}

export async function getAdminSession(
  req?: NextRequest
): Promise<AdminPayload | null> {
  try {
    let token: string | undefined;
    if (req) {
      token = req.cookies.get(AUTH_COOKIE)?.value;
    } else {
      const cookieStore = await cookies();
      token = cookieStore.get(AUTH_COOKIE)?.value;
    }
    if (!token) return null;
    const { payload } = await jwtVerify(token, JWT_SECRET_KEY());
    return payload as unknown as AdminPayload;
  } catch {
    return null;
  }
}

// ---------- Magic Link ----------

export async function sendMagicLink(email: string): Promise<{ ok: boolean; error?: string }> {
  // Check email is an admin
  const admin = await getAdminByEmail(email);
  if (!admin) {
    // Don't reveal whether email exists
    return { ok: true };
  }

  // Generate token
  const token = crypto.randomUUID();
  const tokenHash = await hashToken(token);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min

  await insertMagicLink({ email, token_hash: tokenHash, expires_at: expiresAt });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${appUrl}/api/auth/verify?token=${token}`;

  await sendMagicLinkEmail({ to: email, url });

  return { ok: true };
}

export async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
