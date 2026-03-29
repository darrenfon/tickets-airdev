import { NextRequest, NextResponse } from "next/server";
import { getAuthFromApiKey, getAdminSession } from "@/lib/auth";
import {
  insertTicket,
  insertMessage,
  listTickets,
} from "@/lib/supabase";
import { sendTicketCreatedEmail } from "@/lib/email";

export async function GET(req: NextRequest) {
  const tenant = await getAuthFromApiKey(req);
  const admin = await getAdminSession(req);

  if (!tenant && !admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const filters: {
    tenant_id?: string;
    status?: string;
    category?: string;
    priority?: string;
    limit?: number;
  } = {};

  if (tenant) filters.tenant_id = tenant.id;
  if (url.searchParams.get("status")) filters.status = url.searchParams.get("status")!;
  if (url.searchParams.get("category")) filters.category = url.searchParams.get("category")!;
  if (url.searchParams.get("priority")) filters.priority = url.searchParams.get("priority")!;
  if (url.searchParams.get("limit")) filters.limit = parseInt(url.searchParams.get("limit")!);
  // Admin can filter by tenant
  if (admin && url.searchParams.get("tenant_id")) {
    filters.tenant_id = url.searchParams.get("tenant_id")!;
  }

  const tickets = await listTickets(filters);
  return NextResponse.json(tickets);
}

export async function POST(req: NextRequest) {
  const tenant = await getAuthFromApiKey(req);
  if (!tenant) {
    return NextResponse.json({ error: "Unauthorized — API key required" }, { status: 401 });
  }

  const body = await req.json();
  const { subject, category, priority, message, createdByEmail, createdByName, externalId, attachments } = body;

  if (!subject || !message || !createdByEmail || !createdByName) {
    return NextResponse.json(
      { error: "Missing required fields: subject, message, createdByEmail, createdByName" },
      { status: 400 }
    );
  }

  // Create ticket
  const ticket = await insertTicket({
    tenant_id: tenant.id,
    external_id: externalId,
    created_by_email: createdByEmail,
    created_by_name: createdByName,
    subject,
    category: category || "GENERAL",
    priority: priority || "NORMAL",
  });

  // Create initial message
  await insertMessage({
    ticket_id: ticket.id,
    author_email: createdByEmail,
    author_name: createdByName,
    is_admin: false,
    content: message,
    attachments: attachments || [],
  });

  // Send admin notification (non-blocking)
  const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
  for (const email of adminEmails) {
    sendTicketCreatedEmail({
      to: email.trim(),
      ticketSubject: subject,
      tenantName: tenant.name,
    }).catch((err) => console.error("Email send error:", err));
  }

  return NextResponse.json(ticket, { status: 201 });
}
