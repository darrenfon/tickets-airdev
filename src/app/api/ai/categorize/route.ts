import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getTicket, getMessages, updateTicketFields } from "@/lib/supabase";
import { categorizeTicket } from "@/lib/ai";

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
  const firstMessage = messages[0]?.content || "";

  const result = await categorizeTicket(ticket.subject, firstMessage);

  // Store in ticket
  await updateTicketFields(ticketId, {
    category: result.category,
    priority: result.priority,
    ai_summary: result.summary,
  });

  return NextResponse.json(result);
}
