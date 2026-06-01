import { prisma } from "../prisma";
import { audit } from "../audit";

export interface BadgerExport {
  version: 1;
  exportedAt: string;
  user: { email: string; name: string | null; currency: string; timezone: string };
  accounts: unknown[];
  categories: unknown[];
  expenses: unknown[];
  recurringExpenses: unknown[];
  distributedExpenses: unknown[];
  subscriptions: unknown[];
  loans: unknown[];
  loanPayments: unknown[];
  insurances: unknown[];
  memberships: unknown[];
  budgets: unknown[];
  goals: unknown[];
  goalContributions: unknown[];
}

/** Gather a complete, portable snapshot of a user's data. */
export async function gatherUserData(userId: string): Promise<BadgerExport> {
  const [
    user,
    accounts,
    categories,
    expenses,
    recurringExpenses,
    distributedExpenses,
    subscriptions,
    loans,
    loanPayments,
    insurances,
    memberships,
    budgets,
    goals,
    goalContributions,
  ] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId } }),
    prisma.account.findMany({ where: { userId } }),
    prisma.category.findMany({ where: { userId } }),
    prisma.expense.findMany({ where: { userId }, include: { category: true } }),
    prisma.recurringExpense.findMany({ where: { userId } }),
    prisma.distributedExpense.findMany({ where: { userId } }),
    prisma.subscription.findMany({ where: { userId } }),
    prisma.loan.findMany({ where: { userId } }),
    prisma.loanPayment.findMany({ where: { userId } }),
    prisma.insurance.findMany({ where: { userId } }),
    prisma.membership.findMany({ where: { userId } }),
    prisma.budget.findMany({ where: { userId }, include: { items: true } }),
    prisma.goal.findMany({ where: { userId } }),
    prisma.goalContribution.findMany({ where: { userId } }),
  ]);

  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    user: { email: user.email, name: user.name, currency: user.currency, timezone: user.timezone },
    accounts,
    categories,
    expenses,
    recurringExpenses,
    distributedExpenses,
    subscriptions,
    loans,
    loanPayments,
    insurances,
    memberships,
    budgets,
    goals,
    goalContributions,
  };
}

/** Flatten expenses for CSV/Excel export. */
export function expensesToRows(expenses: { date: Date; amount: unknown; importance: string; note: string | null; category?: { name: string } | null; paymentMethod?: string | null; mood?: string | null }[]) {
  return expenses.map((e) => ({
    Date: new Date(e.date).toISOString().slice(0, 10),
    Amount: Number(e.amount),
    Category: e.category?.name ?? "",
    Importance: e.importance,
    PaymentMethod: e.paymentMethod ?? "",
    Mood: e.mood ?? "",
    Note: e.note ?? "",
  }));
}

export interface ImportSummary {
  categories: number;
  accounts: number;
  expenses: number;
  subscriptions: number;
  loans: number;
  goals: number;
  distributedExpenses: number;
}

/**
 * Restore a previously exported snapshot. Idempotent-ish: categories are
 * matched by name; everything else is created fresh. Runs in a single
 * transaction so a partial import can never leave the account inconsistent.
 */
export async function applyImport(userId: string, data: BadgerExport): Promise<ImportSummary> {
  if (data.version !== 1) throw new Error("Unsupported export version.");

  return prisma.$transaction(async (tx) => {
    const summary: ImportSummary = {
      categories: 0,
      accounts: 0,
      expenses: 0,
      subscriptions: 0,
      loans: 0,
      goals: 0,
      distributedExpenses: 0,
    };

    // Categories — map old id -> new/existing id by name.
    const categoryIdMap = new Map<string, string>();
    for (const c of (data.categories ?? []) as any[]) {
      const existing = await tx.category.findFirst({
        where: { userId, name: { equals: c.name, mode: "insensitive" } },
      });
      if (existing) {
        categoryIdMap.set(c.id, existing.id);
      } else {
        const created = await tx.category.create({
          data: {
            userId,
            name: c.name,
            icon: c.icon ?? "circle",
            color: c.color ?? "#64748b",
            isDefault: false,
          },
        });
        categoryIdMap.set(c.id, created.id);
        summary.categories += 1;
      }
    }

    const accountIdMap = new Map<string, string>();
    for (const a of (data.accounts ?? []) as any[]) {
      const created = await tx.account.create({
        data: {
          userId,
          name: a.name,
          type: a.type ?? "BANK",
          currentBalance: a.currentBalance ?? 0,
          color: a.color ?? "#10b981",
          icon: a.icon ?? "wallet",
        },
      });
      accountIdMap.set(a.id, created.id);
      summary.accounts += 1;
    }

    const fallbackCategory = async () => {
      const any = await tx.category.findFirst({ where: { userId } });
      if (any) return any.id;
      const created = await tx.category.create({
        data: { userId, name: "Miscellaneous", isDefault: true },
      });
      return created.id;
    };

    for (const e of (data.expenses ?? []) as any[]) {
      const categoryId = categoryIdMap.get(e.categoryId) ?? (await fallbackCategory());
      await tx.expense.create({
        data: {
          userId,
          categoryId,
          accountId: e.accountId ? accountIdMap.get(e.accountId) ?? null : null,
          date: new Date(e.date),
          amount: e.amount,
          importance: e.importance ?? "USEFUL",
          note: e.note ?? null,
          mood: e.mood ?? null,
          paymentMethod: e.paymentMethod ?? null,
        },
      });
      summary.expenses += 1;
    }

    for (const s of (data.subscriptions ?? []) as any[]) {
      await tx.subscription.create({
        data: {
          userId,
          name: s.name,
          cost: s.cost,
          frequency: s.frequency ?? "MONTHLY",
          renewalDate: new Date(s.renewalDate),
          icon: s.icon ?? "repeat",
          color: s.color ?? "#6366f1",
        },
      });
      summary.subscriptions += 1;
    }

    for (const l of (data.loans ?? []) as any[]) {
      await tx.loan.create({
        data: {
          userId,
          name: l.name,
          lender: l.lender ?? null,
          type: l.type ?? "PERSONAL",
          principalAmount: l.principalAmount,
          interestRate: l.interestRate,
          tenureMonths: l.tenureMonths,
          startDate: new Date(l.startDate),
          emiAmount: l.emiAmount,
          remainingPrincipal: l.remainingPrincipal ?? l.principalAmount,
          nextDueDate: new Date(l.nextDueDate),
          status: l.status ?? "ACTIVE",
        },
      });
      summary.loans += 1;
    }

    for (const d of (data.distributedExpenses ?? []) as any[]) {
      const categoryId = categoryIdMap.get(d.categoryId) ?? (await fallbackCategory());
      await tx.distributedExpense.create({
        data: {
          userId,
          categoryId,
          name: d.name,
          totalAmount: d.totalAmount,
          coverageMonths: d.coverageMonths,
          startDate: new Date(d.startDate),
          importance: d.importance ?? "ESSENTIAL",
          note: d.note ?? null,
        },
      });
      summary.distributedExpenses += 1;
    }

    for (const g of (data.goals ?? []) as any[]) {
      await tx.goal.create({
        data: {
          userId,
          name: g.name,
          icon: g.icon ?? "target",
          color: g.color ?? "#10b981",
          targetAmount: g.targetAmount,
          currentAmount: g.currentAmount ?? 0,
          targetDate: g.targetDate ? new Date(g.targetDate) : null,
          status: g.status ?? "ACTIVE",
        },
      });
      summary.goals += 1;
    }

    await audit(userId, "data.import", "User", userId, summary as unknown as object, tx);
    return summary;
  });
}
