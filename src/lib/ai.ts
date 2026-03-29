import type { Message } from "./supabase";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";

const SYSTEM_PROMPT =
  "You are a support agent for AirDev LLC, a technology company. Generate professional, helpful responses.";

async function callClaude(
  system: string,
  userMessage: string
): Promise<string> {
  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-20250414",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Claude API error: ${res.status} ${text}`);
  }

  const data = await res.json();
  return data.content[0]?.text || "";
}

export async function suggestReply(
  ticketSubject: string,
  messages: Message[]
): Promise<string> {
  const thread = messages
    .map(
      (m) =>
        `[${m.is_admin ? "Admin" : "Customer"} - ${m.author_name}]: ${m.content}`
    )
    .join("\n\n");

  const prompt = `Here is a support ticket titled "${ticketSubject}" with the following conversation thread:

${thread}

Generate a professional, helpful reply to this support ticket. Be concise and actionable. Do not include a greeting or sign-off — just the reply body.`;

  return callClaude(SYSTEM_PROMPT, prompt);
}

export async function categorizeTicket(
  subject: string,
  firstMessage: string
): Promise<{ category: string; priority: string; summary: string }> {
  const prompt = `Analyze this support ticket and return a JSON object with three fields:
- "category": one of BILLING, TECHNICAL, FEATURE_REQUEST, GENERAL
- "priority": one of URGENT, HIGH, NORMAL, LOW
- "summary": a 1-2 sentence summary of the issue

Ticket subject: "${subject}"
First message: "${firstMessage}"

Return ONLY the JSON object, nothing else.`;

  const response = await callClaude(SYSTEM_PROMPT, prompt);

  try {
    return JSON.parse(response);
  } catch {
    return {
      category: "GENERAL",
      priority: "NORMAL",
      summary: response.slice(0, 200),
    };
  }
}
