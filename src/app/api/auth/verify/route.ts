import { NextRequest, NextResponse } from "next/server";
import { hashToken, signAdminToken } from "@/lib/auth";
import { getMagicLink, markMagicLinkUsed } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.url));
  }

  const tokenHash = await hashToken(token);
  const link = await getMagicLink(tokenHash);

  if (!link || link.used) {
    return NextResponse.redirect(new URL("/login?error=invalid", req.url));
  }

  if (new Date(link.expires_at) < new Date()) {
    return NextResponse.redirect(new URL("/login?error=expired", req.url));
  }

  // Mark as used
  await markMagicLinkUsed(link.id);

  // Create JWT
  const jwt = await signAdminToken(link.email);

  // Set cookie and redirect
  const response = NextResponse.redirect(new URL("/dashboard", req.url));
  response.cookies.set("auth-token", jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });

  return response;
}
