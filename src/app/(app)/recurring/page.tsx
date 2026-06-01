import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { RecurringManager } from "@/components/recurring/recurring-manager";

export default async function RecurringPage() {
  const user = await requireUser();
  const [rules, categories] = await Promise.all([
    prisma.recurringExpense.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Recurring expenses"
        description="Expenses that repeat on a schedule. Badger creates each instance automatically when it's due."
      />
      <RecurringManager
        rules={rules.map((r) => ({
          id: r.id,
          name: r.name,
          amount: toNumber(r.amount),
          frequency: r.frequency,
          importance: r.importance,
          nextRunDate: r.nextRunDate.toISOString(),
          isActive: r.isActive,
          categoryName: r.category.name,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        currency={user.currency}
      />
    </div>
  );
}
