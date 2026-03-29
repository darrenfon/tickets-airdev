"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Ticket {
  id: string;
  tenant_id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_by_name: string;
  created_by_email: string;
  ai_summary: string | null;
  tenant_slug?: string;
  tenant_name?: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  author_email: string;
  author_name: string;
  is_admin: boolean;
  content: string;
  created_at: string;
}

const STATUS_OPTIONS = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

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

function Badge({ text, colorClass }: { text: string; colorClass: string }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colorClass}`}
    >
      {text}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyContent, setReplyContent] = useState("");
  const [sending, setSending] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [catLoading, setCatLoading] = useState(false);

  const fetchData = useCallback(async () => {
    const [ticketRes, messagesRes] = await Promise.all([
      fetch(`/api/tickets/${id}`),
      fetch(`/api/tickets/${id}/messages`),
    ]);

    if (ticketRes.status === 401) {
      router.push("/login");
      return;
    }

    if (ticketRes.ok) {
      setTicket(await ticketRes.json());
    }
    if (messagesRes.ok) {
      setMessages(await messagesRes.json());
    }
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleStatusChange(newStatus: string) {
    await fetch(`/api/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    setTicket((prev) => (prev ? { ...prev, status: newStatus } : prev));
  }

  async function handleSendReply() {
    if (!replyContent.trim()) return;
    setSending(true);

    const res = await fetch(`/api/tickets/${id}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: replyContent,
        authorEmail: "admin@airdev.us",
        authorName: "AirDev Support",
        isAdmin: true,
      }),
    });

    if (res.ok) {
      const msg = await res.json();
      setMessages((prev) => [...prev, msg]);
      setReplyContent("");
      setAiSuggestion("");
    }
    setSending(false);
  }

  async function handleSuggestReply() {
    setAiLoading(true);
    try {
      const res = await fetch("/api/ai/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiSuggestion(data.suggestion);
      }
    } catch (err) {
      console.error("AI suggest error:", err);
    }
    setAiLoading(false);
  }

  async function handleCategorize() {
    setCatLoading(true);
    try {
      const res = await fetch("/api/ai/categorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: id }),
      });
      if (res.ok) {
        const data = await res.json();
        setTicket((prev) =>
          prev
            ? {
                ...prev,
                category: data.category,
                priority: data.priority,
                ai_summary: data.summary,
              }
            : prev
        );
      }
    } catch (err) {
      console.error("AI categorize error:", err);
    }
    setCatLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-lg">Ticket not found</p>
          <Link
            href="/dashboard"
            className="text-emerald-400 hover:text-emerald-300 mt-4 inline-block"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16 gap-4">
            <Link
              href="/dashboard"
              className="text-gray-400 hover:text-white transition-colors"
              aria-label="Back to dashboard"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <h1 className="text-lg font-bold text-white truncate flex-1">
              {ticket.subject}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Ticket meta */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-6">
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {/* Status dropdown */}
            <select
              value={ticket.status}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              aria-label="Ticket status"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s === "IN_PROGRESS" ? "In Progress" : s.charAt(0) + s.slice(1).toLowerCase()}
                </option>
              ))}
            </select>

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
                text={ticket.tenant_name || ticket.tenant_slug}
                colorClass="bg-sky-500/10 text-sky-400 border-sky-500/20"
              />
            )}
          </div>

          <div className="text-sm text-gray-400">
            Created by <span className="text-gray-300">{ticket.created_by_name}</span>{" "}
            ({ticket.created_by_email}) &middot; {formatDate(ticket.created_at)}
          </div>

          {ticket.ai_summary && (
            <div className="mt-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <p className="text-xs text-emerald-400 font-medium mb-1">AI Summary</p>
              <p className="text-sm text-gray-300">{ticket.ai_summary}</p>
            </div>
          )}

          {/* AI buttons */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSuggestReply}
              disabled={aiLoading}
              className="px-3 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-sm hover:bg-emerald-600/30 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? "Thinking..." : "Suggest Reply"}
            </button>
            <button
              onClick={handleCategorize}
              disabled={catLoading}
              className="px-3 py-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm hover:bg-blue-600/30 disabled:opacity-50 transition-colors"
            >
              {catLoading ? "Analyzing..." : "Categorize"}
            </button>
          </div>
        </div>

        {/* AI Suggestion panel */}
        {aiSuggestion && (
          <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-xl p-5 mb-6">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-emerald-400">
                AI Suggested Reply
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setReplyContent(aiSuggestion);
                    setAiSuggestion("");
                  }}
                  className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs hover:bg-emerald-500 transition-colors"
                >
                  Use as Reply
                </button>
                <button
                  onClick={() => setAiSuggestion("")}
                  className="px-3 py-1 bg-gray-700 text-gray-300 rounded-lg text-xs hover:bg-gray-600 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-300 whitespace-pre-wrap">
              {aiSuggestion}
            </p>
          </div>
        )}

        {/* Message thread */}
        <div className="space-y-4 mb-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`rounded-xl p-4 ${
                msg.is_admin
                  ? "bg-emerald-900/10 border border-emerald-500/20 ml-8"
                  : "bg-gray-900 border border-gray-800 mr-8"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-sm font-medium ${
                    msg.is_admin ? "text-emerald-400" : "text-gray-300"
                  }`}
                >
                  {msg.author_name}
                </span>
                {msg.is_admin && (
                  <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                    Admin
                  </span>
                )}
                <span className="text-xs text-gray-500">
                  {formatDate(msg.created_at)}
                </span>
              </div>
              <p className="text-sm text-gray-300 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          ))}
        </div>

        {/* Reply box */}
        {ticket.status !== "CLOSED" && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Type your reply..."
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-y text-sm"
            />
            <div className="flex justify-end mt-3">
              <button
                onClick={handleSendReply}
                disabled={sending || !replyContent.trim()}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors text-sm"
              >
                {sending ? "Sending..." : "Send Reply"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
