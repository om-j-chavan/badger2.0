import { DEFAULT_CATEGORIES, IMPORTANCE_META } from "../constants";
import type { DraftAction } from "./types";

/**
 * Deterministic natural-language parser for data entry. Used directly as the
 * dev fallback (no API key) and as a fast pre-parser even when an LLM is
 * configured. Returns a DraftAction the user must confirm, or null.
 *
 * Handles, e.g.:
 *   "Spent 500 on fuel today"
 *   "Paid 4000 for internet valid for 6 months"
 *   "Add Netflix 649 monthly"
 *   "Create a 2 lakh loan at 10 percent for 3 years"
 *   "New goal gaming pc 80000 by december"
 */

const KNOWN_SUBSCRIPTIONS = [
  "netflix", "spotify", "prime", "amazon prime", "youtube", "hotstar", "disney",
  "chatgpt", "openai", "claude", "icloud", "google one", "notion", "github",
  "apple music", "audible", "canva", "adobe", "dropbox",
];

/** Parse a money amount supporting k / lakh / crore suffixes. */
export function parseAmount(text: string): number | null {
  const m = text.match(
    /(?:₹|rs\.?|inr|\$)?\s*([\d,]+(?:\.\d+)?)\s*(k|thousand|lakhs?|lacs?|crores?|cr)?/i,
  );
  if (!m) return null;
  let value = Number(m[1].replace(/,/g, ""));
  if (Number.isNaN(value)) return null;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit.startsWith("k") || unit === "thousand") value *= 1_000;
  else if (unit.startsWith("lakh") || unit.startsWith("lac")) value *= 100_000;
  else if (unit.startsWith("cr")) value *= 10_000_000;
  return value;
}

function matchCategory(text: string): string {
  const lower = text.toLowerCase();
  const found = DEFAULT_CATEGORIES.find((c) => lower.includes(c.name.toLowerCase()));
  if (found) return found.name;
  // a few common synonyms
  if (/\b(petrol|diesel|gas)\b/.test(lower)) return "Fuel";
  if (/\b(groceries|grocery|lunch|dinner|breakfast|coffee|pizza|restaurant)\b/.test(lower)) return "Food";
  if (/\b(uber|ola|taxi|cab|metro|train|bus)\b/.test(lower)) return "Transport";
  if (/\b(movie|game|gaming)\b/.test(lower)) return "Entertainment";
  if (/\b(doctor|medicine|pharmacy|hospital)\b/.test(lower)) return "Health";
  return "Miscellaneous";
}

function guessImportance(text: string, category: string): keyof typeof IMPORTANCE_META {
  const lower = text.toLowerCase();
  if (/\b(invest|sip|stock|mutual fund|protein|course|book|gym)\b/.test(lower)) return "INVESTMENT";
  if (["Rent", "Utilities", "Internet", "Insurance", "Health"].includes(category)) return "ESSENTIAL";
  if (["Entertainment", "Shopping", "Travel"].includes(category)) return "LUXURY";
  return "USEFUL";
}

function parseRelativeDate(text: string): string {
  const lower = text.toLowerCase();
  const now = new Date();
  if (/\byesterday\b/.test(lower)) {
    const d = new Date(now);
    d.setDate(d.getDate() - 1);
    return d.toISOString();
  }
  // "on the 12th" – day of current month
  const dom = lower.match(/\bon (?:the )?(\d{1,2})(?:st|nd|rd|th)?\b/);
  if (dom) {
    const day = Number(dom[1]);
    if (day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      return d.toISOString();
    }
  }
  return now.toISOString();
}

export function parseNaturalLanguage(input: string): DraftAction | null {
  const text = input.trim();
  const lower = text.toLowerCase();
  if (!text) return null;
  const amount = parseAmount(text);

  // --- Loan ---------------------------------------------------------------
  if (/\bloan\b/.test(lower) && amount) {
    const rate = lower.match(/(\d+(?:\.\d+)?)\s*(?:%|percent|pct)/);
    const years = lower.match(/(\d+(?:\.\d+)?)\s*years?/);
    const months = lower.match(/(\d+)\s*months?/);
    const tenureMonths = years
      ? Math.round(Number(years[1]) * 12)
      : months
        ? Number(months[1])
        : 36;
    return {
      kind: "create_loan",
      label: "Create loan",
      summary: `${currency(amount)} loan at ${rate ? rate[1] : "10"}% for ${tenureMonths} months`,
      payload: {
        name: titleFrom(text, "Loan"),
        principalAmount: amount,
        interestRate: rate ? Number(rate[1]) : 10,
        tenureMonths,
        startDate: new Date().toISOString(),
        type: guessLoanType(lower),
      },
    };
  }

  // --- Subscription -------------------------------------------------------
  const subName = KNOWN_SUBSCRIPTIONS.find((s) => lower.includes(s));
  const isSubscription =
    (subName || /\bsubscription\b/.test(lower)) &&
    (/(monthly|yearly|weekly|quarterly|annual|per month|\/mo|\/month)/.test(lower) || !!subName);
  if (isSubscription && amount) {
    const frequency = lower.includes("year") || lower.includes("annual")
      ? "YEARLY"
      : lower.includes("week")
        ? "WEEKLY"
        : lower.includes("quarter")
          ? "QUARTERLY"
          : "MONTHLY";
    const name = subName ? capitalize(subName) : titleFrom(text, "Subscription");
    return {
      kind: "create_subscription",
      label: "Add subscription",
      summary: `${name} — ${currency(amount)} ${frequency.toLowerCase()}`,
      payload: {
        name,
        cost: amount,
        frequency,
        renewalDate: nextMonth().toISOString(),
      },
    };
  }

  // --- Distributed expense (covers N months) ------------------------------
  const coverage = lower.match(/(?:valid|cover(?:s|ing)?|for|over)\s+(?:the\s+)?(\d+)\s*months?/);
  if (coverage && amount) {
    const months = Number(coverage[1]);
    const category = matchCategory(text);
    return {
      kind: "create_distributed_expense",
      label: "Add distributed expense",
      summary: `${currency(amount)} over ${months} months (${currency(
        Math.round(amount / months),
      )}/mo) — ${category}`,
      payload: {
        name: titleFrom(text, category),
        totalAmount: amount,
        coverageMonths: months,
        categoryName: category,
        startDate: new Date().toISOString(),
        importance: "ESSENTIAL",
      },
    };
  }

  // --- Goal ---------------------------------------------------------------
  if (/\bgoal\b/.test(lower) && amount) {
    return {
      kind: "create_goal",
      label: "Create goal",
      summary: `Save ${currency(amount)} toward "${titleFrom(text, "Goal")}"`,
      payload: {
        name: titleFrom(text, "Goal"),
        targetAmount: amount,
      },
    };
  }

  // --- Plain expense ------------------------------------------------------
  if (amount && /(spent|paid|bought|spend|expense|cost|on|for)/.test(lower)) {
    const category = matchCategory(text);
    return {
      kind: "create_expense",
      label: "Add expense",
      summary: `${currency(amount)} on ${category}`,
      payload: {
        amount,
        categoryName: category,
        importance: guessImportance(text, category),
        date: parseRelativeDate(text),
        note: text,
      },
    };
  }

  return null;
}

// --- helpers ----------------------------------------------------------------

function currency(n: number): string {
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function nextMonth(): Date {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d;
}

function guessLoanType(lower: string): string {
  if (/\b(home|house|mortgage)\b/.test(lower)) return "HOME";
  if (/\b(car|bike|vehicle|auto)\b/.test(lower)) return "VEHICLE";
  if (/\b(education|student|college)\b/.test(lower)) return "EDUCATION";
  return "PERSONAL";
}

/** Extract a reasonable name from free text, falling back to a default. */
function titleFrom(text: string, fallback: string): string {
  const forMatch = text.match(/(?:for|on)\s+([a-zA-Z][a-zA-Z\s]{1,30})/);
  if (forMatch) {
    const cleaned = forMatch[1]
      .replace(/\b(valid|cover\w*|monthly|yearly|weekly|today|yesterday)\b.*$/i, "")
      .trim();
    if (cleaned.length > 1) return cleaned.split(/\s+/).map(capitalize).join(" ");
  }
  return fallback;
}
