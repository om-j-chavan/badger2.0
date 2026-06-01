import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { frequencyToMonthly, frequencyToYearly } from "@/lib/finance/effective-cost";
import { PageHeader } from "@/components/shared/page-header";
import { SubscriptionManager } from "@/components/subscriptions/subscription-manager";

export default async function SubscriptionsPage() {
  const user = await requireUser();
  const subs = await prisma.subscription.findMany({
    where: { userId: user.id },
    orderBy: { renewalDate: "asc" },
  });

  const active = subs.filter((s) => s.isActive);
  const monthlyTotal = active.reduce((sum, s) => sum + frequencyToMonthly(toNumber(s.cost), s.frequency), 0);
  const yearlyTotal = active.reduce((sum, s) => sum + frequencyToYearly(toNumber(s.cost), s.frequency), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="All your recurring services in one place — and what they really cost you each month."
      />
      <SubscriptionManager
        subscriptions={subs.map((s) => ({
          id: s.id,
          name: s.name,
          cost: toNumber(s.cost),
          frequency: s.frequency,
          renewalDate: s.renewalDate.toISOString(),
          monthlyImpact: frequencyToMonthly(toNumber(s.cost), s.frequency),
          isActive: s.isActive,
          color: s.color,
        }))}
        monthlyTotal={monthlyTotal}
        yearlyTotal={yearlyTotal}
        currency={user.currency}
      />
    </div>
  );
}
