import { NextRequest, NextResponse } from "next/server";
import { getAuthFromApiKey, getAdminSession } from "@/lib/auth";
import { getTicket, updateTicketStatus } from "@/lib/supabase";

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

  // API key users can only see own tenant's tickets
  if (tenant && ticket.tenant_id !== tenant.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json(ticket);
}

export async function PATCH(
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
  const { status } = body;

  if (!status) {
    return NextResponse.json({ error: "Missing status field" }, { status: 400 });
  }

  // API key users can only close or reopen
  if (tenant && !["CLOSED", "OPEN"].includes(status)) {
    return NextResponse.json(
      { error: "API key users can only set status to OPEN or CLOSED" },
      { status: 403 }
    );
  }

  const validStatuses = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
      { status: 400 }
    );
  }

  await updateTicketStatus(id, status);
  return NextResponse.json({ ok: true, status });
}
