import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getTicket, getMessages } from "@/lib/supabase";
import { suggestReply } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const admin = await getAdminSession(req);
  if (!admin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 401 });
  }

  const body = await req.json();
  const { ticketId } = body;

  if (!ticketId) {
    return NextResponse.json({ error: "Missing ticketId" }, { status: 400 });
  }

  const ticket = await getTicket(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  const messages = await getMessages(ticketId);
  if (messages.length === 0) {
    return NextResponse.json({ error: "No messages to analyze" }, { status: 400 });
  }

  const suggestion = await suggestReply(ticket.subject, messages);
  return NextResponse.json({ suggestion });
}
