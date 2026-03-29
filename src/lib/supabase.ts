// Raw Supabase REST API client — same pattern as SiteCheck

function getUrl() {
  return process.env.SUPABASE_URL!;
}
function getKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY!;
}

function headers(prefer = "return=minimal") {
  return {
    apikey: getKey(),
    Authorization: `Bearer ${getKey()}`,
    "Content-Type": "application/json",
    Prefer: prefer,
  };
}

// ---------- Tenant ----------

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  api_key: string;
  webhook_url: string | null;
  created_at: string;
}

export async function getTenantByApiKey(apiKey: string): Promise<Tenant | null> {
  const res = await fetch(
    `${getUrl()}/rest/v1/tenants?api_key=eq.${encodeURIComponent(apiKey)}&select=*&limit=1`,
    { headers: headers("return=representation"), cache: "no-store" }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

export async function getTenantBySlug(slug: string): Promise<Tenant | null> {
  const res = await fetch(
    `${getUrl()}/rest/v1/tenants?slug=eq.${encodeURIComponent(slug)}&select=*&limit=1`,
    { headers: headers("return=representation"), cache: "no-store" }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

export async function listTenants(): Promise<Tenant[]> {
  const res = await fetch(
    `${getUrl()}/rest/v1/tenants?select=*&order=name.asc`,
    { headers: headers("return=representation"), cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

// ---------- Ticket ----------

export interface Ticket {
  id: string;
  tenant_id: string;
  external_id: string | null;
  created_by_email: string;
  created_by_name: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  closed_at: string | null;
  activity_log: string | null;
  ai_summary: string | null;
  created_at: string;
  updated_at: string;
  // joined
  tenant_slug?: string;
  tenant_name?: string;
  message_count?: number;
}

export async function insertTicket(data: {
  tenant_id: string;
  external_id?: string;
  created_by_email: string;
  created_by_name: string;
  subject: string;
  category?: string;
  priority?: string;
}): Promise<Ticket> {
  const res = await fetch(`${getUrl()}/rest/v1/tickets`, {
    method: "POST",
    headers: headers("return=representation"),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert ticket failed: ${res.status} ${text}`);
  }
  const rows = await res.json();
  return rows[0];
}

export async function getTicket(id: string): Promise<Ticket | null> {
  const res = await fetch(
    `${getUrl()}/rest/v1/tickets?id=eq.${id}&select=*,tenants(slug,name)&limit=1`,
    { headers: headers("return=representation"), cache: "no-store" }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  if (!rows[0]) return null;
  const row = rows[0];
  // Flatten tenant join
  if (row.tenants) {
    row.tenant_slug = row.tenants.slug;
    row.tenant_name = row.tenants.name;
    delete row.tenants;
  }
  return row;
}

export async function listTickets(filters: {
  tenant_id?: string;
  status?: string;
  category?: string;
  priority?: string;
  limit?: number;
}): Promise<Ticket[]> {
  const params = new URLSearchParams();
  params.set("select", "*,tenants(slug,name),messages(count)");
  params.set("order", "updated_at.desc");
  if (filters.tenant_id) params.set("tenant_id", `eq.${filters.tenant_id}`);
  if (filters.status) params.set("status", `eq.${filters.status}`);
  if (filters.category) params.set("category", `eq.${filters.category}`);
  if (filters.priority) params.set("priority", `eq.${filters.priority}`);
  if (filters.limit) params.set("limit", String(filters.limit));

  const res = await fetch(
    `${getUrl()}/rest/v1/tickets?${params.toString()}`,
    { headers: headers("return=representation"), cache: "no-store" }
  );
  if (!res.ok) return [];
  const rows = await res.json();
  return rows.map((row: Record<string, unknown>) => {
    const tenants = row.tenants as { slug: string; name: string } | null;
    const messages = row.messages as { count: number }[] | null;
    if (tenants) {
      row.tenant_slug = tenants.slug;
      row.tenant_name = tenants.name;
      delete row.tenants;
    }
    if (messages && messages.length > 0) {
      row.message_count = messages[0].count;
    } else {
      row.message_count = 0;
    }
    delete row.messages;
    return row as unknown as Ticket;
  });
}

export async function updateTicketStatus(
  id: string,
  status: string
): Promise<void> {
  const body: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "CLOSED" || status === "RESOLVED") {
    body.closed_at = new Date().toISOString();
  }
  const res = await fetch(
    `${getUrl()}/rest/v1/tickets?id=eq.${id}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify(body),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update ticket status failed: ${res.status} ${text}`);
  }
}

export async function updateTicketFields(
  id: string,
  fields: Partial<Pick<Ticket, "category" | "priority" | "ai_summary" | "activity_log">>
): Promise<void> {
  const res = await fetch(
    `${getUrl()}/rest/v1/tickets?id=eq.${id}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ ...fields, updated_at: new Date().toISOString() }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Update ticket fields failed: ${res.status} ${text}`);
  }
}

// ---------- Message ----------

export interface Message {
  id: string;
  ticket_id: string;
  author_email: string;
  author_name: string;
  is_admin: boolean;
  content: string;
  attachments: string[];
  created_at: string;
}

export async function insertMessage(data: {
  ticket_id: string;
  author_email: string;
  author_name: string;
  is_admin?: boolean;
  content: string;
  attachments?: string[];
}): Promise<Message> {
  const res = await fetch(`${getUrl()}/rest/v1/messages`, {
    method: "POST",
    headers: headers("return=representation"),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert message failed: ${res.status} ${text}`);
  }
  const rows = await res.json();
  return rows[0];
}

export async function getMessages(ticketId: string): Promise<Message[]> {
  const res = await fetch(
    `${getUrl()}/rest/v1/messages?ticket_id=eq.${ticketId}&select=*&order=created_at.asc`,
    { headers: headers("return=representation"), cache: "no-store" }
  );
  if (!res.ok) return [];
  return res.json();
}

// ---------- Admin Users ----------

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export async function getAdminByEmail(email: string): Promise<AdminUser | null> {
  const res = await fetch(
    `${getUrl()}/rest/v1/admin_users?email=eq.${encodeURIComponent(email)}&select=*&limit=1`,
    { headers: headers("return=representation"), cache: "no-store" }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

// ---------- Magic Link ----------

export async function insertMagicLink(data: {
  email: string;
  token_hash: string;
  expires_at: string;
}): Promise<void> {
  const res = await fetch(`${getUrl()}/rest/v1/magic_link_attempts`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Insert magic link failed: ${res.status} ${text}`);
  }
}

export async function getMagicLink(
  tokenHash: string
): Promise<{ id: string; email: string; used: boolean; expires_at: string } | null> {
  const res = await fetch(
    `${getUrl()}/rest/v1/magic_link_attempts?token_hash=eq.${encodeURIComponent(tokenHash)}&select=id,email,used,expires_at&limit=1`,
    { headers: headers("return=representation"), cache: "no-store" }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows[0] || null;
}

export async function markMagicLinkUsed(id: string): Promise<void> {
  const res = await fetch(
    `${getUrl()}/rest/v1/magic_link_attempts?id=eq.${id}`,
    {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ used: true }),
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Mark magic link used failed: ${res.status} ${text}`);
  }
}
