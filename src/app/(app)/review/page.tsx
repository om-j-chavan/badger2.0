import { subMonths } from "date-fns";
import { TrendingUp, TrendingDown, Sparkles, Trophy } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMonthlySummary } from "@/lib/services/summary";
import { getSpendingTrend } from "@/lib/services/trend";
import { formatCurrency } from "@/lib/currency";
import { pct } from "@/lib/utils";
import { IMPORTANCE_META } from "@/lib/constants";
import { MONTH_NAMES } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CategoryDonut, ImportanceBar, TrendLine } from "@/components/charts";

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ y?: string; m?: string }>;
}) {
  const user = await requireUser();
  const { y, m } = await searchParams;
  const now = new Date();
  const year = Number(y) || now.getFullYear();
  const month = Number(m) || now.getMonth() + 1;
  const prev = subMonths(new Date(year, month - 1, 1), 1);

  const [summary, prevSummary, trend] = await Promise.all([
    getMonthlySummary(user.id, year, month),
    getMonthlySummary(user.id, prev.getFullYear(), prev.getMonth() + 1),
    getSpendingTrend(user.id, 6),
  ]);

  const fmt = (n: number) => formatCurrency(n, user.currency);
  const delta = summary.actualSpending - prevSummary.actualSpending;
  const deltaPct = prevSummary.actualSpending > 0 ? pct(Math.abs(delta), prevSummary.actualSpending) : 0;

  const categoryData = summary.byCategory.slice(0, 8).map((c) => ({ name: c.name, value: c.total, color: c.color }));
  const importanceData = (Object.keys(IMPORTANCE_META) as (keyof typeof IMPORTANCE_META)[]).map((k) => ({
    name: IMPORTANCE_META[k].label,
    value: summary.byImportance[k],
    color: IMPORTANCE_META[k].color,
  }));

  return (
    <div className="space-y-6">
      <PageHeader title={`${MONTH_NAMES[month - 1]} ${year} review`} description="A friendly recap of your month." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total spending" value={fmt(summary.actualSpending)} icon={summary.actualSpending >= prevSummary.actualSpending ? TrendingUp : TrendingDown} accent={delta > 0 ? "warning" : "success"} hint={prevSummary.actualSpending > 0 ? `${delta >= 0 ? "+" : "−"}${deltaPct}% vs last month` : undefined} />
        <StatCard label="Effective spending" value={fmt(summary.effectiveSpending)} accent="muted" />
        <StatCard label="Luxury spend" value={fmt(summary.luxurySpending)} icon={Sparkles} accent="warning" />
        <StatCard label="Investment spend" value={fmt(summary.investmentSpending)} icon={Trophy} accent="primary" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Spending by category</CardTitle></CardHeader>
          <CardContent>
            <CategoryDonut data={categoryData} currency={user.currency} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>By importance</CardTitle></CardHeader>
          <CardContent>
            <ImportanceBar data={importanceData} currency={user.currency} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>6-month trend</CardTitle></CardHeader>
        <CardContent><TrendLine data={trend} currency={user.currency} /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top categories</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {summary.byCategory.length === 0 && <p className="text-sm text-muted-foreground">No spending recorded this month.</p>}
          {summary.byCategory.slice(0, 6).map((c) => (
            <div key={c.categoryId}>
              <div className="flex justify-between text-sm">
                <span className="font-medium">{c.name}</span>
                <span>{fmt(c.total)} · {pct(c.total, summary.actualSpending)}%</span>
              </div>
              <Progress value={pct(c.total, summary.actualSpending)} className="mt-1 h-1.5" indicatorClassName="bg-primary" />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Budget performance</CardTitle></CardHeader>
        <CardContent>
          {summary.budgetTotal != null ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Spent {fmt(summary.actualSpending)}</span>
                <span>of {fmt(summary.budgetTotal)} planned</span>
              </div>
              <Progress value={Math.min(100, pct(summary.actualSpending, summary.budgetTotal))} indicatorClassName={summary.actualSpending > summary.budgetTotal ? "bg-destructive" : "bg-primary"} />
              <p className="text-sm text-muted-foreground">
                {summary.budgetRemaining != null && summary.budgetRemaining >= 0
                  ? `${fmt(summary.budgetRemaining)} left in budget. Nice work staying on track!`
                  : `${fmt(Math.abs(summary.budgetRemaining ?? 0))} over budget — no worries, next month is a fresh start.`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No budget set for this month yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
