import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { BudgetPlanner } from "@/components/budget/budget-planner";
import type { BudgetPriority } from "@prisma/client";

export default async function BudgetPage() {
  const user = await requireUser();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const budget = await prisma.budget.findUnique({
    where: { userId_month_year: { userId: user.id, month, year } },
    include: { items: true },
  });

  const initialItems = (budget?.items ?? []).map((i) => ({
    label: i.label,
    amount: toNumber(i.amount),
    priority: i.priority as BudgetPriority,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget planner"
        description="Tell Badger your income and priorities. We'll build Safe, Savings-Focused and Emergency budgets for you."
      />
      <BudgetPlanner
        currency={user.currency}
        month={month}
        year={year}
        initialIncome={toNumber(budget?.monthlyIncome ?? user.monthlyIncome)}
        initialItems={initialItems}
      />
    </div>
  );
}
