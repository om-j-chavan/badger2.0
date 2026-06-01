import { hasAiProvider } from "../env";
import { getMonthlySummary } from "../services/summary";
import { getCommitmentSummary } from "../services/commitments";
import { runSearch, looksLikeSearch } from "../services/search";
import { formatCurrency } from "../currency";
import { prisma } from "../prisma";
import { searchPages, PAGE_REGISTRY } from "./page-registry";
import { parseNaturalLanguage } from "./nl-parser";
import { OpenAiProvider } from "./providers/openai";
import type { AssistantResponse, ChatMessage } from "./types";

function getProvider() {
  if (hasAiProvider()) return new OpenAiProvider();
  return null;
}

/** Build a compact financial context string the LLM can ground answers in. */
async function buildContext(userId: string, currency: string): Promise<string> {
  const now = new Date();
  const summary = await getMonthlySummary(userId, now.getFullYear(), now.getMonth() + 1);
  const commitments = await getCommitmentSummary(userId);
  const fmt = (n: number) => formatCurrency(n, currency);

  const topCats = summary.byCategory
    .slice(0, 5)
    .map((c) => `${c.name}: ${fmt(c.total)}`)
    .join(", ");

  return [
    `Monthly income: ${fmt(summary.monthlyIncome)}`,
    `This month — actual spending: ${fmt(summary.actualSpending)}, effective: ${fmt(summary.effectiveSpending)}`,
    `Savings: ${fmt(summary.savings)} (${summary.savingsRate}% rate)`,
    `Investment rate: ${summary.investmentRate}%`,
    `Monthly debt (EMIs): ${fmt(summary.monthlyDebt)} — ${summary.emiBurden.label}`,
    `Total commitments: ${fmt(commitments.totalMonthlyImpact)}/mo across ${commitments.count} items`,
    `Budget health score: ${summary.healthScore.score}/100 (${summary.healthScore.grade})`,
    `Top categories: ${topCats || "none yet"}`,
    `Essential: ${fmt(summary.essentialSpending)}, Luxury: ${fmt(summary.luxurySpending)}, Investment: ${fmt(summary.investmentSpending)}`,
  ].join("\n");
}

const SYSTEM_PROMPT = `You are Badger AI, a warm, encouraging personal-finance companion inside the Badger app.
Rules:
- Be concise, friendly and jargon-free. Use the user's real numbers from the CONTEXT.
- Never shame the user about money. Frame everything constructively.
- When asked "where is X" / "how do I X", point them to the right screen by name.
- For affordability questions, reason from their savings, commitments and goals.
- Currency amounts in CONTEXT are already formatted; reuse them.
- Keep answers under ~120 words unless the user asks for detail.`;

/**
 * Main entry point for the assistant. Handles four capabilities:
 *  1. Natural-language data entry  -> returns a draft action to confirm
 *  2. Search                       -> returns structured results
 *  3. Navigation / help            -> returns deep links
 *  4. Financial Q&A                -> grounded answer (LLM or deterministic)
 */
export async function askAssistant(
  userId: string,
  message: string,
  history: ChatMessage[] = [],
): Promise<AssistantResponse> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const currency = user.currency;
  const trimmed = message.trim();

  // 1. Natural-language data entry --------------------------------------
  const draft = parseNaturalLanguage(trimmed);
  if (draft) {
    return {
      reply: `Here's what I understood — ${draft.summary}. Want me to save it?`,
      draft,
    };
  }

  // 2. Search ------------------------------------------------------------
  if (looksLikeSearch(trimmed)) {
    const result = await runSearch(userId, trimmed);
    if (result) {
      const totalLine =
        result.total != null ? ` totalling ${formatCurrency(result.total, currency)}` : "";
      return {
        reply: `${result.label}: ${result.count} item${result.count === 1 ? "" : "s"}${totalLine}.`,
        search: { type: result.type, items: result.items },
      };
    }
  }

  // 3. Navigation / help -------------------------------------------------
  if (/\b(where|how do i|how to|find|open|go to|take me|navigate)\b/i.test(trimmed)) {
    const pages = searchPages(trimmed).slice(0, 3);
    if (pages.length > 0) {
      const top = pages[0];
      return {
        reply: `You'll find that under **${top.title}** — ${top.description}`,
        links: pages.map((p) => ({ title: p.title, route: p.route })),
      };
    }
  }

  // 4. Financial Q&A -----------------------------------------------------
  const context = await buildContext(userId, currency);
  const provider = getProvider();

  if (provider) {
    const pageList = PAGE_REGISTRY.map((p) => `- ${p.title} (${p.route}): ${p.description}`).join("\n");
    const completion = await provider.chat({
      messages: [
        { role: "system", content: `${SYSTEM_PROMPT}\n\nSCREENS:\n${pageList}\n\nCONTEXT:\n${context}` },
        ...history.slice(-6),
        { role: "user", content: trimmed },
      ],
      temperature: 0.4,
      maxTokens: 500,
    });
    return { reply: completion.content || "I'm here to help — could you rephrase that?" };
  }

  // Deterministic fallback (no API key configured).
  return { reply: deterministicAnswer(trimmed, context, currency) };
}

/**
 * A best-effort, no-LLM answer used in development or when no provider key is
 * set. Pattern-matches a few common questions and otherwise summarises status.
 */
function deterministicAnswer(message: string, context: string, _currency: string): string {
  const q = message.toLowerCase();
  const get = (label: string) =>
    context.split("\n").find((l) => l.toLowerCase().startsWith(label.toLowerCase())) ?? "";

  if (/can i afford|should i buy|afford/.test(q)) {
    return `Affordability comes down to your buffer. ${get("Savings:")}. If a purchase fits within a couple of months of savings without touching your goals or commitments (${get("Total commitments:")}), it's likely comfortable. Want me to set it up as a goal instead?`;
  }
  if (/food|eating|groceries/.test(q)) {
    return `Here's your spending picture this month:\n${get("Top categories:")}\nIf Food is a big slice, small swaps (cooking a couple more meals a week) add up fast — no pressure though!`;
  }
  if (/sav(e|ing)|how much.*save/.test(q)) {
    return `${get("Savings:")}. ${get("Budget health score:")}. Nudging your savings rate up even a little compounds nicely over time.`;
  }
  if (/where.*money|going|spend/.test(q)) {
    return `This month: ${get("This month")}\n${get("Top categories:")}`;
  }
  if (/health score|how am i doing/.test(q)) {
    return `${get("Budget health score:")}. ${get("Savings:")}, ${get("Investment rate:")}. You're doing better than you might think — keep it up!`;
  }
  return `Here's a quick snapshot:\n${context}\n\nAsk me things like "can I afford a PS5?", "where's my money going?", or add an expense in plain language like "spent 500 on fuel today".`;
}
