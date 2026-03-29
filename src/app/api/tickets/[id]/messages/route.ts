import { NextRequest, NextResponse } from "next/server";
import { getAuthFromApiKey, getAdminSession } from "@/lib/auth";
import {
  getTicket,
  getMessages,
  insertMessage,
  updateTicketStatus,
} from "@/lib/supabase";
import { sendTicketReplyEmail } from "@/lib/email";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenant = await getAuthFromApiKey(req);
  const admin = await getAdminSession(req);

  if (!tenant && !admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await getTicket(id);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (tenant && ticket.tenant_id !== tenant.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const messages = await getMessages(id);
  return NextResponse.json(messages);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tenant = await getAuthFromApiKey(req);
  const admin = await getAdminSession(req);

  if (!tenant && !admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ticket = await getTicket(id);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
  }

  if (tenant && ticket.tenant_id !== tenant.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { content, authorEmail, authorName, isAdmin, attachments } = body;

  if (!content || !authorEmail || !authorName) {
    return NextResponse.json(
      { error: "Missing required fields: content, authorEmail, authorName" },
      { status: 400 }
    );
  }

  const message = await insertMessage({
    ticket_id: id,
    author_email: authorEmail,
    author_name: authorName,
    is_admin: isAdmin || false,
    content,
    attachments: attachments || [],
  });

  // Auto-reopen RESOLVED tickets if non-admin replies
  if (!isAdmin && ticket.status === "RESOLVED") {
    await updateTicketStatus(id, "OPEN");
  }

  // Send email notification (non-blocking)
  const replyPreview = content.slice(0, 200);
  // Notify ticket creator if admin replied, or admin if customer replied
  const notifyEmail = isAdmin
    ? ticket.created_by_email
    : (process.env.ADMIN_EMAILS?.split(",")[0]?.trim() || "");

  if (notifyEmail) {
    sendTicketReplyEmail({
      to: notifyEmail,
      ticketSubject: ticket.subject,
      replyAuthor: authorName,
      replyPreview,
    }).catch((err) => console.error("Reply email error:", err));
  }

  return NextResponse.json(message, { status: 201 });
}
