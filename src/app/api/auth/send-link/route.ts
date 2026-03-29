import { NextRequest, NextResponse } from "next/server";
import { sendMagicLink } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email } = body;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  const result = await sendMagicLink(email.toLowerCase().trim());

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }

  // Always return success to avoid email enumeration
  return NextResponse.json({ ok: true });
}
