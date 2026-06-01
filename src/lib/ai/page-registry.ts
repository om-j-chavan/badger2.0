/**
 * Central registry of every navigable screen. Powers the AI's deep-link
 * navigation ("where do I find subscriptions?") and the global search palette.
 * Every page MUST be registered here.
 */
export interface PageMeta {
  route: string;
  title: string;
  description: string;
  keywords: string[];
  /** Optional deep-link query that opens a creation drawer/dialog. */
  createHref?: string;
}

export const PAGE_REGISTRY: PageMeta[] = [
  {
    route: "/dashboard",
    title: "Dashboard",
    description: "Your money at a glance — spending, savings, commitments, goals and health score.",
    keywords: ["home", "overview", "summary", "dashboard", "health"],
  },
  {
    route: "/expenses",
    title: "Expenses",
    description: "Log and browse everything you spend, with categories and importance.",
    keywords: ["expense", "spending", "transactions", "spent", "purchases"],
    createHref: "/expenses?new=1",
  },
  {
    route: "/calendar",
    title: "Calendar",
    description: "A monthly calendar of your spending. Tap any day to see or add expenses.",
    keywords: ["calendar", "month", "daily", "days", "schedule"],
  },
  {
    route: "/recurring",
    title: "Recurring Expenses",
    description: "Set up expenses that repeat daily, weekly, monthly or yearly.",
    keywords: ["recurring", "repeat", "automatic", "regular", "scheduled expense"],
    createHref: "/recurring?new=1",
  },
  {
    route: "/distributed",
    title: "Distributed Expenses",
    description: "Spread a one-off payment (like internet or insurance) across the months it covers.",
    keywords: ["distributed", "spread", "effective", "coverage", "annual", "prepaid"],
    createHref: "/distributed?new=1",
  },
  {
    route: "/subscriptions",
    title: "Subscriptions",
    description: "Track Netflix, Spotify, ChatGPT and friends — costs, renewals and total burden.",
    keywords: ["subscription", "netflix", "spotify", "prime", "chatgpt", "renewal", "recurring payment"],
    createHref: "/subscriptions?new=1",
  },
  {
    route: "/loans",
    title: "Loans",
    description: "Manage loans and EMIs, see payoff progress, and run the prepayment simulator.",
    keywords: ["loan", "emi", "debt", "mortgage", "borrow", "prepayment", "interest"],
    createHref: "/loans?new=1",
  },
  {
    route: "/commitments",
    title: "Commitments",
    description: "Every recurring financial obligation in one place — loans, subs, insurance and more.",
    keywords: ["commitment", "obligations", "monthly impact", "due", "burden"],
  },
  {
    route: "/budget",
    title: "Budget Planner",
    description: "Plan your month by priority and generate Safe, Savings and Emergency budgets.",
    keywords: ["budget", "plan", "income", "planner", "allocate", "must have"],
    createHref: "/budget?new=1",
  },
  {
    route: "/goals",
    title: "Goals",
    description: "Save toward the things you want — track progress and completion estimates.",
    keywords: ["goal", "saving", "target", "emergency fund", "vacation", "gaming pc"],
    createHref: "/goals?new=1",
  },
  {
    route: "/review",
    title: "Monthly Review",
    description: "A friendly recap of your month: breakdowns, top categories and trends.",
    keywords: ["review", "report", "summary", "monthly", "trend", "breakdown"],
  },
  {
    route: "/insights",
    title: "Insights & Personality",
    description: "Your spending personality and personalised insights based on real history.",
    keywords: ["insight", "personality", "profile", "analysis", "saver", "investor"],
  },
  {
    route: "/accounts",
    title: "Accounts & Wallets",
    description: "Manage cash, bank, UPI, credit cards and investment accounts.",
    keywords: ["account", "wallet", "bank", "cash", "balance", "upi", "card"],
    createHref: "/accounts?new=1",
  },
  {
    route: "/achievements",
    title: "Achievements",
    description: "Badges, levels and streaks for staying on top of your money.",
    keywords: ["badge", "achievement", "level", "streak", "gamification", "reward"],
  },
  {
    route: "/settings",
    title: "Settings",
    description: "Profile, currency, income, categories and data import/export.",
    keywords: ["settings", "profile", "currency", "category", "import", "export", "preferences"],
  },
  {
    route: "/assistant",
    title: "Badger AI",
    description: "Ask anything, add expenses in plain language, or find your way around.",
    keywords: ["assistant", "ai", "chat", "help", "badger ai", "ask"],
  },
];

export function findPage(route: string): PageMeta | undefined {
  return PAGE_REGISTRY.find((p) => p.route === route);
}

/** Naive keyword/title relevance search used for navigation answers and search. */
export function searchPages(query: string): PageMeta[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const terms = q.split(/\s+/);
  return PAGE_REGISTRY.map((page) => {
    const haystack = [page.title, page.description, ...page.keywords].join(" ").toLowerCase();
    let score = 0;
    for (const term of terms) {
      if (page.title.toLowerCase().includes(term)) score += 5;
      if (page.keywords.some((k) => k.includes(term))) score += 3;
      if (haystack.includes(term)) score += 1;
    }
    return { page, score };
  })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.page);
}
