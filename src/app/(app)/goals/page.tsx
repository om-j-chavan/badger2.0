import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { PageHeader } from "@/components/shared/page-header";
import { GoalManager, type GoalView } from "@/components/goals/goal-manager";

export default async function GoalsPage() {
  const user = await requireUser();
  const goals = await prisma.goal.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const views: GoalView[] = goals.map((g) => ({
    id: g.id,
    name: g.name,
    targetAmount: toNumber(g.targetAmount),
    currentAmount: toNumber(g.currentAmount),
    targetDate: g.targetDate?.toISOString() ?? null,
    status: g.status,
    color: g.color,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title="Goals" description="The things you're working toward — track every step of the way." />
      <GoalManager goals={views} currency={user.currency} />
    </div>
  );
}
