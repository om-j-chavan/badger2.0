import type { Importance } from "@prisma/client";
import { subMonths } from "date-fns";
import { prisma } from "../prisma";
import { DEFAULT_CATEGORIES, IMPORTANCE_META } from "../constants";

export interface SearchResult {
  type: "expenses" | "subscriptions" | "loans" | "insurance" | "goals";
  label: string;
  count: number;
  total?: number;
  items: unknown[];
}

/**
 * Structured search over a user's financial data. Interprets simple queries
 * like "all food expenses", "subscriptions", "insurance payments",
 * "expenses last month".
 */
export async function runSearch(userId: string, query: string): Promise<SearchResult | null> {
  const q = query.toLowerCase();

  if (/\bsubscription/.test(q)) {
    const items = await prisma.subscription.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    });
    return {
      type: "subscriptions",
      label: "Your subscriptions",
      count: items.length,
      total: items.reduce((s, i) => s + Number(i.cost), 0),
      items,
    };
  }

  if (/\bloan|emi\b/.test(q)) {
    const items = await prisma.loan.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { nextDueDate: "asc" },
    });
    return {
      type: "loans",
      label: "Your active loans",
      count: items.length,
      total: items.reduce((s, i) => s + Number(i.emiAmount), 0),
      items,
    };
  }

  if (/\binsurance\b/.test(q)) {
    const items = await prisma.insurance.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    });
    return {
      type: "insurance",
      label: "Your insurance policies",
      count: items.length,
      total: items.reduce((s, i) => s + Number(i.premium), 0),
      items,
    };
  }

  if (/\bgoal/.test(q)) {
    const items = await prisma.goal.findMany({
      where: { userId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    return { type: "goals", label: "Your goals", count: items.length, items };
  }

  // Default: expense search (by category / importance / time window).
  const category = DEFAULT_CATEGORIES.find((c) => q.includes(c.name.toLowerCase()));
  const importance = (Object.keys(IMPORTANCE_META) as Importance[]).find((k) =>
    q.includes(IMPORTANCE_META[k].label.toLowerCase()),
  );

  const where: Record<string, unknown> = { userId };
  if (category) {
    const cat = await prisma.category.findFirst({
      where: { userId, name: category.name },
      select: { id: true },
    });
    if (cat) where.categoryId = cat.id;
  }
  if (importance) where.importance = importance;
  if (/last month/.test(q)) {
    where.date = { gte: subMonths(new Date(), 1) };
  } else if (/last (\d+) months?/.test(q)) {
    const n = Number(q.match(/last (\d+) months?/)![1]);
    where.date = { gte: subMonths(new Date(), n) };
  }

  const items = await prisma.expense.findMany({
    where,
    include: { category: true, account: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  const labelParts = [
    importance ? IMPORTANCE_META[importance].label.toLowerCase() : "",
    category ? category.name.toLowerCase() : "",
    "expenses",
  ].filter(Boolean);

  return {
    type: "expenses",
    label: `Showing ${labelParts.join(" ")}`,
    count: items.length,
    total: items.reduce((s, i) => s + Number(i.amount), 0),
    items,
  };
}

/** Heuristic: does this message look like a search request? */
export function looksLikeSearch(message: string): boolean {
  return /^(show|list|find|search|all|display|view)\b/i.test(message.trim());
}
