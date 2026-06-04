import { differenceInCalendarMonths } from "date-fns";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { distributedMonthlyImpact } from "@/lib/finance/effective-cost";
import { PageHeader } from "@/components/shared/page-header";
import { DistributedManager } from "@/components/distributed/distributed-manager";

export default async function DistributedPage() {
  const user = await requireUser();
  const [items, categories] = await Promise.all([
    prisma.distributedExpense.findMany({
      where: { userId: user.id },
      include: { category: true },
      orderBy: { startDate: "desc" },
    }),
    prisma.category.findMany({ where: { userId: user.id }, orderBy: { name: "asc" } }),
  ]);

  const now = new Date();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Distributed expenses"
        description="Big one-off payments, spread across the months they cover — so a single bill doesn't distort your month."
      />
      <DistributedManager
        items={items.map((d) => ({
          id: d.id,
          name: d.name,
          totalAmount: toNumber(d.totalAmount),
          amountPaid: toNumber(d.amountPaid),
          coverageMonths: d.coverageMonths,
          monthlyImpact: distributedMonthlyImpact(toNumber(d.totalAmount), d.coverageMonths),
          startDate: d.startDate.toISOString(),
          monthsElapsed: Math.max(0, differenceInCalendarMonths(now, d.startDate)),
          categoryName: d.category.name,
        }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        currency={user.currency}
      />
    </div>
  );
}
