"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Ticket {
  id: string;
  tenant_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_by_name: string;
  created_by_email: string;
  created_at: string;
  updated_at: string;
  tenant_slug?: string;
  tenant_name?: string;
  message_count?: number;
}

const STATUS_FILTERS = ["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const;

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  IN_PROGRESS: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  RESOLVED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CLOSED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "bg-red-500/10 text-red-400 border-red-500/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  NORMAL: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  LOW: "bg-gray-500/10 text-gray-500 border-gray-500/20",
};

const CATEGORY_COLORS: Record<string, string> = {
  BILLING: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  TECHNICAL: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  FEATURE_REQUEST: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  GENERAL: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const TENANT_COLORS: Record<string, string> = {
  airmates: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  sitecheck: "bg-violet-500/10 text-violet-400 border-violet-500/20",
};

function Badge({
  text,
  colorClass,
}: {
  text: string;
  colorClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colorClass}`}
    >
      {text}
    </span>
  );
}

function timeAgo(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function DashboardPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [tenantFilter, setTenantFilter] = useState<string>("ALL");
  const [tenants, setTenants] = useState<string[]>([]);

  const fetchTickets = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter !== "ALL") params.set("status", statusFilter);

    const res = await fetch(`/api/tickets?${params.toString()}`);
    if (res.status === 401) {
      router.push("/login");
      return;
    }
    const data = await res.json();
    setTickets(data);

    // Extract unique tenants
    const slugs = [
      ...new Set(data.map((t: Ticket) => t.tenant_slug).filter(Boolean)),
    ] as string[];
    setTenants(slugs);
    setLoading(false);
  }, [statusFilter, router]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const filteredTickets =
    tenantFilter === "ALL"
      ? tickets
      : tickets.filter((t) => t.tenant_slug === tenantFilter);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-bold text-white">
              AirDev <span className="text-emerald-400">Tickets</span>
            </h1>
            <div className="flex items-center gap-4">
              {/* Tenant filter */}
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
                className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                aria-label="Filter by tenant"
              >
                <option value="ALL">All Tenants</option>
                {tenants.map((slug) => (
                  <option key={slug} value={slug}>
                    {slug}
                  </option>
                ))}
              </select>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status filter bar */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {STATUS_FILTERS.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === s
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
              }`}
            >
              {s === "IN_PROGRESS" ? "In Progress" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {/* Tickets list */}
        {loading ? (
          <div className="text-center text-gray-400 py-20">Loading...</div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center text-gray-400 py-20">
            <p className="text-lg">No tickets found</p>
            <p className="text-sm mt-1">Tickets created via the API will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTickets.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/dashboard/${ticket.id}`}
                className="block bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 hover:bg-gray-900/80 transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium group-hover:text-emerald-400 transition-colors truncate">
                      {ticket.subject}
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {ticket.created_by_name} &middot;{" "}
                      {timeAgo(ticket.updated_at)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <Badge
                        text={ticket.status === "IN_PROGRESS" ? "In Progress" : ticket.status}
                        colorClass={STATUS_COLORS[ticket.status] || STATUS_COLORS.OPEN}
                      />
                      <Badge
                        text={ticket.priority}
                        colorClass={PRIORITY_COLORS[ticket.priority] || PRIORITY_COLORS.NORMAL}
                      />
                      <Badge
                        text={ticket.category.replace("_", " ")}
                        colorClass={CATEGORY_COLORS[ticket.category] || CATEGORY_COLORS.GENERAL}
                      />
                      {ticket.tenant_slug && (
                        <Badge
                          text={ticket.tenant_slug}
                          colorClass={
                            TENANT_COLORS[ticket.tenant_slug] ||
                            "bg-gray-500/10 text-gray-400 border-gray-500/20"
                          }
                        />
                      )}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    {ticket.message_count !== undefined && (
                      <span className="text-xs text-gray-500">
                        {ticket.message_count}{" "}
                        {ticket.message_count === 1 ? "message" : "messages"}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
