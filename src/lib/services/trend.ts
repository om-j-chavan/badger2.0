import { startOfMonth, subMonths } from "date-fns";
import { prisma } from "../prisma";
import { toNumber, round2 } from "../utils";
import { monthRange, MONTH_NAMES } from "../dates";
import { distributedContributionForMonth } from "../finance/effective-cost";

export interface TrendPoint {
  label: string;
  year: number;
  month: number;
  actual: number;
  effective: number;
}

/**
 * Lightweight N-month spending trend (actual vs effective). One expense query
 * + one distributed query total, bucketed in memory.
 */
export async function getSpendingTrend(userId: string, months = 6): Promise<TrendPoint[]> {
  const now = new Date();
  const from = startOfMonth(subMonths(now, months - 1));

  const [expenses, distributed] = await Promise.all([
    prisma.expense.findMany({
      where: { userId, date: { gte: from } },
      select: { date: true, amount: true, distributedExpenseId: true },
    }),
    prisma.distributedExpense.findMany({ where: { userId } }),
  ]);

  const points: TrendPoint[] = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = subMonths(now, i);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const { start, end } = monthRange(year, month);

    let actual = 0;
    let actualExclDistributed = 0;
    for (const e of expenses) {
      if (e.date >= start && e.date <= end) {
        const amt = toNumber(e.amount);
        actual += amt;
        if (!e.distributedExpenseId) actualExclDistributed += amt;
      }
    }

    let distributedThisMonth = 0;
    for (const dist of distributed) {
      distributedThisMonth += distributedContributionForMonth({
        totalAmount: toNumber(dist.totalAmount),
        coverageMonths: dist.coverageMonths,
        startDate: dist.startDate,
        year,
        month1to12: month,
      });
    }

    points.push({
      label: MONTH_NAMES[month - 1].slice(0, 3),
      year,
      month,
      actual: round2(actual),
      effective: round2(actualExclDistributed + distributedThisMonth),
    });
  }

  return points;
}
