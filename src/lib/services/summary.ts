import type { Importance } from "@prisma/client";
import { prisma } from "../prisma";
import { toNumber, round2, pct } from "../utils";
import { monthRange } from "../dates";
import { distributedContributionForMonth } from "../finance/effective-cost";
import { calculateHealthScore, classifyEmiBurden } from "../finance/health-score";
import { getCommitmentSummary } from "./commitments";

export interface MonthlySummary {
  year: number;
  month: number; // 1-12
  monthlyIncome: number;

  actualSpending: number;
  effectiveSpending: number;

  byImportance: Record<Importance, number>;
  byCategory: { categoryId: string; name: string; color: string; total: number }[];

  monthlyDebt: number; // active loan EMIs
  commitmentBurden: number; // all commitments' monthly impact
  emiBurden: ReturnType<typeof classifyEmiBurden>;

  savings: number;
  savingsRate: number;
  investmentRate: number;
  investmentSpending: number;
  essentialSpending: number;
  luxurySpending: number;

  budgetTotal: number | null;
  budgetRemaining: number | null;

  healthScore: ReturnType<typeof calculateHealthScore>;
  expenseCount: number;
}

const EMPTY_IMPORTANCE = (): Record<Importance, number> => ({
  ESSENTIAL: 0,
  USEFUL: 0,
  LUXURY: 0,
  INVESTMENT: 0,
});

/**
 * Compute the full monthly financial summary used by the dashboard and the
 * AI assistant. "Effective" spending spreads distributed-expense lump sums
 * across their coverage period; "actual" is money out the door this month.
 */
export async function getMonthlySummary(
  userId: string,
  year: number,
  month: number,
): Promise<MonthlySummary> {
  const { start, end } = monthRange(year, month);

  const [user, expenses, distributed, loans, budget, commitmentSummary, goalContribs] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({ where: { id: userId } }),
      prisma.expense.findMany({
        where: { userId, date: { gte: start, lte: end } },
        include: { category: true },
      }),
      prisma.distributedExpense.findMany({ where: { userId } }),
      prisma.loan.findMany({ where: { userId, status: "ACTIVE" } }),
      prisma.budget.findUnique({
        where: { userId_month_year: { userId, month, year } },
        include: { items: true },
      }),
      getCommitmentSummary(userId),
      prisma.goalContribution.findMany({
        where: { userId, date: { gte: start, lte: end } },
      }),
    ]);

  const monthlyIncome = toNumber(user.monthlyIncome);

  // --- Actual spending + breakdowns ---
  const byImportance = EMPTY_IMPORTANCE();
  const categoryMap = new Map<string, { name: string; color: string; total: number }>();
  let actualSpending = 0;
  let actualExcludingDistributed = 0;

  for (const e of expenses) {
    const amt = toNumber(e.amount);
    actualSpending = round2(actualSpending + amt);
    byImportance[e.importance] = round2(byImportance[e.importance] + amt);

    const cat = categoryMap.get(e.categoryId) ?? {
      name: e.category.name,
      color: e.category.color,
      total: 0,
    };
    cat.total = round2(cat.total + amt);
    categoryMap.set(e.categoryId, cat);

    if (!e.distributedExpenseId) actualExcludingDistributed = round2(actualExcludingDistributed + amt);
  }

  // --- Effective spending: spread distributed lump sums for THIS month ---
  let distributedThisMonth = 0;
  for (const d of distributed) {
    distributedThisMonth = round2(
      distributedThisMonth +
        distributedContributionForMonth({
          totalAmount: toNumber(d.totalAmount),
          coverageMonths: d.coverageMonths,
          startDate: d.startDate,
          year,
          month1to12: month,
        }),
    );
  }
  const effectiveSpending = round2(actualExcludingDistributed + distributedThisMonth);

  // --- Debt / commitments ---
  const monthlyDebt = round2(loans.reduce((s, l) => s + toNumber(l.emiAmount), 0));
  const emiBurden = classifyEmiBurden(monthlyDebt, monthlyIncome);

  // --- Investment & savings ---
  const investmentSpending = round2(byImportance.INVESTMENT + goalContribs.reduce((s, g) => s + toNumber(g.amount), 0));
  const essentialSpending = byImportance.ESSENTIAL;
  const luxurySpending = byImportance.LUXURY;

  const savings = round2(Math.max(0, monthlyIncome - effectiveSpending - monthlyDebt));
  const savingsRate = pct(savings, monthlyIncome);
  const investmentRate = pct(investmentSpending, monthlyIncome);

  // --- Budget ---
  let budgetTotal: number | null = null;
  let budgetRemaining: number | null = null;
  if (budget) {
    budgetTotal = round2(budget.items.reduce((s, i) => s + toNumber(i.amount), 0));
    budgetRemaining = round2(budgetTotal - actualSpending);
  }

  const healthScore = calculateHealthScore({
    monthlyIncome,
    totalSpending: actualSpending,
    essentialSpending,
    luxurySpending,
    investmentSpending,
    monthlyDebt,
    savings,
  });

  const byCategory = Array.from(categoryMap.entries())
    .map(([categoryId, v]) => ({ categoryId, ...v }))
    .sort((a, b) => b.total - a.total);

  return {
    year,
    month,
    monthlyIncome,
    actualSpending,
    effectiveSpending,
    byImportance,
    byCategory,
    monthlyDebt,
    commitmentBurden: commitmentSummary.totalMonthlyImpact,
    emiBurden,
    savings,
    savingsRate,
    investmentRate,
    investmentSpending,
    essentialSpending,
    luxurySpending,
    budgetTotal,
    budgetRemaining,
    healthScore,
    expenseCount: expenses.length,
  };
}
