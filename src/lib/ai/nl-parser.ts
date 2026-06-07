import { DEFAULT_CATEGORIES, IMPORTANCE_META, MOOD_META } from "../constants";
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
  if (/\b(snacks?|chips|chocolate|candy|namkeen|tea|chai|coffee|groceries|grocery|lunch|dinner|breakfast|pizza|burger|restaurant|meal|swiggy|zomato)\b/.test(lower)) return "Food";
  if (/\b(uber|ola|taxi|cab|metro|train|bus|auto|rickshaw)\b/.test(lower)) return "Transport";
  if (/\b(movie|game|gaming|concert|netflix|outing)\b/.test(lower)) return "Entertainment";
  if (/\b(doctor|medicine|pharmacy|hospital|clinic)\b/.test(lower)) return "Health";
  if (/\b(clothes|clothing|shoes|amazon|flipkart|myntra)\b/.test(lower)) return "Shopping";
  return "Miscellaneous";
}

/** Explicit importance words in the message, or null to let category-based guessing decide. */
function parseImportance(text: string): keyof typeof IMPORTANCE_META | null {
  const l = text.toLowerCase();
  if (/\b(essential|need|necessary|must)\b/.test(l)) return "ESSENTIAL";
  if (/luxur|luxar|indulg|treat|splurge/.test(l)) return "LUXURY";
  if (/\b(invest|investment|sip|stock|mutual fund)\b/.test(l)) return "INVESTMENT";
  if (/\b(useful|handy|practical)\b/.test(l)) return "USEFUL";
  return null;
}

function guessImportance(text: string, category: string): keyof typeof IMPORTANCE_META {
  const lower = text.toLowerCase();
  if (/\b(sip|stock|mutual fund|protein|creatine|course|book|gym)\b/.test(lower)) return "INVESTMENT";
  if (["Rent", "Utilities", "Internet", "Insurance", "Health"].includes(category)) return "ESSENTIAL";
  if (["Entertainment", "Shopping", "Travel"].includes(category)) return "LUXURY";
  return "USEFUL";
}

/** Detect a feeling/mood from the message. Negations handled first. */
function parseMood(text: string): keyof typeof MOOD_META | null {
  const l = text.toLowerCase();
  if (/not\s+(feeling\s+)?(so |that |too )?bad/.test(l)) return "GOOD";
  if (/not\s+(feeling\s+)?(so |that |too )?good/.test(l)) return "REGRET";
  if (/(feeling\s+)?(great|amazing|awesome|fantastic|so good|really good|very good|so happy|really happy|thrilled|excited|pumped)/.test(l)) return "GREAT";
  if (/regret|guilty|shouldn'?t have|waste of money|wasteful|impulse|bad decision/.test(l)) return "REGRET";
  if (/stress|anxious|worried|tight on money|broke|can'?t afford/.test(l)) return "STRESSED";
  if (/(feeling\s+)?(good|fine|nice|happy|content|satisfied|okay|ok|alright)/.test(l)) return "GOOD";
  if (/(feeling\s+)?(bad|low|down|sad|meh|guilty)/.test(l)) return "REGRET";
  if (/neutral|whatever|indifferent/.test(l)) return "NEUTRAL";
  return null;
}

const ACCOUNT_HINTS: { test: RegExp; hint: string; label: string }[] = [
  { test: /credit\s*card|creditcard|\bcredit\b|\bcc\b/, hint: "credit_card", label: "Credit Card" },
  { test: /\bupi\b|gpay|google\s*pay|phonepe|paytm/, hint: "upi", label: "UPI" },
  { test: /debit\s*card|\bdebit\b/, hint: "bank", label: "Bank" },
  { test: /\bsavings?\b/, hint: "savings", label: "Savings" },
  { test: /\bcash\b|in cash|by cash/, hint: "cash", label: "Cash" },
  { test: /\bbank\b/, hint: "bank", label: "Bank" },
];

function parseAccountHint(text: string): { hint: string; label: string } | null {
  const l = text.toLowerCase();
  for (const a of ACCOUNT_HINTS) if (a.test.test(l)) return { hint: a.hint, label: a.label };
  return null;
}

const NOTE_STOPWORDS = new Set([
  "credit", "card", "debit", "cash", "upi", "bank", "savings", "gpay", "phonepe", "paytm",
  "luxury", "luxary", "essential", "useful", "investment", "today", "yesterday", "monthly",
  "yearly", "weekly", "feeling", "the", "a", "an", "my",
]);

/** Pull the item description out of the message ("...for snacks" -> "Snacks"). */
function extractNote(text: string): string | null {
  let candidate: string | undefined;
  const forM = text.match(/\bfor\s+([a-zA-Z][a-zA-Z\s]{1,40})/i);
  if (forM) candidate = forM[1];
  if (!candidate) {
    for (const om of text.matchAll(/\bon\s+([a-zA-Z][a-zA-Z\s]{1,40})/gi)) {
      const first = om[1].trim().split(/\s+/)[0].toLowerCase();
      if (!NOTE_STOPWORDS.has(first)) {
        candidate = om[1];
        break;
      }
    }
  }
  if (!candidate) return null;
  const cleaned = candidate
    .replace(/\b(on|for|using|with|via|today|yesterday|credit|card|debit|cash|upi|bank|savings|luxur\w*|essential|useful|investment|feeling).*$/i, "")
    // drop any dangling connector word left at the end (e.g. "groceries in")
    .replace(/\s+\b(in|on|at|by|with|from|for|using|via|the|a|an|my)\b\s*$/i, "")
    .trim();
  if (cleaned.length < 2) return null;
  return cleaned.split(/\s+/).map(capitalize).join(" ");
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
    const importance = parseImportance(text) ?? guessImportance(text, category);
    const mood = parseMood(text);
    const account = parseAccountHint(text);
    const rawNote = extractNote(text);
    // Drop the note if it's just the category name again (no extra info).
    const note = rawNote && rawNote.toLowerCase() !== category.toLowerCase() ? rawNote : null;

    const bits = [currency(amount), category, IMPORTANCE_META[importance].label];
    if (account) bits.push(account.label);
    if (mood) bits.push(`${MOOD_META[mood].emoji} ${MOOD_META[mood].label}`);
    const summary = bits.join(" · ") + (note ? ` — "${note}"` : "");

    return {
      kind: "create_expense",
      label: "Add expense",
      summary,
      payload: {
        amount,
        categoryName: category,
        importance,
        date: parseRelativeDate(text),
        note,
        mood,
        accountHint: account?.hint ?? null,
        rawText: text,
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
