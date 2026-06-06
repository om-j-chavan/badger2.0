import Link from "next/link";
import { format } from "date-fns";
import {
  Wallet,
  TrendingUp,
  PiggyBank,
  Layers,
  CalendarClock,
  ArrowRight,
  Sparkles,
  Receipt,
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getMonthlySummary } from "@/lib/services/summary";
import { getCommitmentSummary } from "@/lib/services/commitments";
import { getSpendingTrend } from "@/lib/services/trend";
import { levelForXp } from "@/lib/services/gamification";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/currency";
import { toNumber, pct } from "@/lib/utils";
import { IMPORTANCE_META, ACCOUNT_TYPE_META } from "@/lib/constants";
import { MONTH_NAMES } from "@/lib/dates";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { HealthGauge } from "@/components/shared/health-gauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CategoryDonut, ImportanceBar, TrendLine } from "@/components/charts";

export default async function DashboardPage() {
  const user = await requireUser();
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const currency = user.currency;

  const [summary, commitments, trend, accounts, goals, gamification] = await Promise.all([
    getMonthlySummary(user.id, year, month),
    getCommitmentSummary(user.id),
    getSpendingTrend(user.id, 6),
    prisma.account.findMany({ where: { userId: user.id, isArchived: false }, orderBy: { createdAt: "asc" } }),
    prisma.goal.findMany({ where: { userId: user.id, status: "ACTIVE" }, orderBy: { createdAt: "asc" }, take: 4 }),
    prisma.gamification.findUnique({ where: { userId: user.id } }),
  ]);

  const fmt = (n: number) => formatCurrency(n, currency);
  const level = levelForXp(gamification?.xp ?? 0);

  const categoryData = summary.byCategory.slice(0, 7).map((c) => ({
    name: c.name,
    value: c.total,
    color: c.color,
  }));
  const importanceData = (Object.keys(IMPORTANCE_META) as (keyof typeof IMPORTANCE_META)[]).map((k) => ({
    name: IMPORTANCE_META[k].label,
    value: summary.byImportance[k],
    color: IMPORTANCE_META[k].color,
  }));

  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <PageHeader
        title={`${greeting}${user.name ? `, ${user.name.split(" ")[0]}` : ""} 🦡`}
        description={`Here's your ${MONTH_NAMES[month - 1]} ${year} at a glance.`}
        action={
          <Button asChild>
            <Link href="/expenses?new=1">
              <Receipt className="h-4 w-4" /> Add expense
            </Link>
          </Button>
        }
      />

      {/* Top stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Spending this month"
          value={fmt(summary.actualSpending)}
          hint={`${summary.expenseCount} expense${summary.expenseCount === 1 ? "" : "s"}`}
          icon={Receipt}
        />
        <StatCard
          label="Effective spending"
          value={fmt(summary.effectiveSpending)}
          hint="Distributed costs spread out"
          icon={Layers}
          accent="muted"
        />
        <StatCard
          label="Savings rate"
          value={`${summary.savingsRate}%`}
          hint={`${fmt(summary.savings)} saved${summary.incomeThisMonth > 0 ? ` · ${fmt(summary.incomeThisMonth)} income` : ""}`}
          icon={PiggyBank}
          accent="success"
        />
        <StatCard
          label="Investment rate"
          value={`${summary.investmentRate}%`}
          hint={`${fmt(summary.investmentSpending)} invested`}
          icon={TrendingUp}
          accent="primary"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Health score */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Budget health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <HealthGauge score={summary.healthScore.score} grade={summary.healthScore.grade} />
            <p className="text-center text-sm text-muted-foreground">{summary.healthScore.headline}</p>
            <div className="space-y-2">
              {summary.healthScore.components.map((c) => (
                <div key={c.key}>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{c.label}</span>
                    <span className="font-medium">{Math.round(c.score)}</span>
                  </div>
                  <Progress value={c.score} className="mt-1 h-1.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Spending trend</CardTitle>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-[#10b981]">Actual</span> vs{" "}
              <span className="font-medium text-[#6366f1]">effective</span> over 6 months
            </p>
          </CardHeader>
          <CardContent>
            <TrendLine data={trend} currency={currency} />
          </CardContent>
        </Card>
      </div>

      {/* Budget + commitments row */}
      <div className="grid gap-4 lg:grid-cols-3">
        <StatCard
          label="Budget remaining"
          value={summary.budgetRemaining != null ? fmt(summary.budgetRemaining) : "—"}
          hint={
            summary.budgetTotal != null ? (
              `of ${fmt(summary.budgetTotal)} planned`
            ) : (
              <Link href="/budget" className="text-primary hover:underline">
                Set up a budget →
              </Link>
            )
          }
          icon={PiggyBank}
          accent={summary.budgetRemaining != null && summary.budgetRemaining < 0 ? "destructive" : "success"}
        />
        <StatCard
          label="Monthly commitments"
          value={fmt(commitments.totalMonthlyImpact)}
          hint={`${commitments.count} active · EMI burden ${summary.emiBurden.label}`}
          icon={Layers}
          accent="warning"
        />
        <StatCard
          label={`Level ${level.level} · ${level.name}`}
          value={`${level.xp} XP`}
          hint={
            level.nextLevelXp ? (
              <div className="flex items-center gap-2">
                <Progress value={level.progressToNext} className="h-1.5 w-20" />
                <span>{level.nextLevelName}</span>
              </div>
            ) : (
              "Max level!"
            )
          }
          icon={Sparkles}
          accent="primary"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Where it went</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryDonut data={categoryData} currency={currency} />
            <div className="mt-4 flex flex-wrap gap-2">
              {categoryData.map((c) => (
                <span key={c.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                  {c.name}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>By importance</CardTitle>
          </CardHeader>
          <CardContent>
            <ImportanceBar data={importanceData} currency={currency} />
          </CardContent>
        </Card>
      </div>

      {/* Upcoming + goals + accounts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Upcoming payments</CardTitle>
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {commitments.upcoming.length === 0 && (
              <p className="text-sm text-muted-foreground">Nothing due in the next 30 days. 🎉</p>
            )}
            {commitments.upcoming.slice(0, 5).map((c) => (
              <div key={`${c.type}-${c.id}`} className="flex items-center justify-between text-sm">
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.nextDueDate ? format(new Date(c.nextDueDate), "d MMM") : "—"}
                  </p>
                </div>
                <span className="font-semibold">{fmt(c.amount)}</span>
              </div>
            ))}
            <Button variant="ghost" size="sm" asChild className="w-full">
              <Link href="/commitments">
                View all <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Goals</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/goals">All</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No goals yet.{" "}
                <Link href="/goals?new=1" className="text-primary hover:underline">
                  Set one →
                </Link>
              </p>
            )}
            {goals.map((g) => {
              const progress = pct(toNumber(g.currentAmount), toNumber(g.targetAmount));
              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{g.name}</span>
                    <span className="text-muted-foreground">{progress}%</span>
                  </div>
                  <Progress value={progress} className="mt-1.5" indicatorClassName="bg-primary" />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {fmt(toNumber(g.currentAmount))} of {fmt(toNumber(g.targetAmount))}
                  </p>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Accounts</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No accounts yet.{" "}
                <Link href="/accounts?new=1" className="text-primary hover:underline">
                  Add one →
                </Link>
              </p>
            )}
            {accounts.map((a) => (
              <div key={a.id} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: a.color }} />
                  <div>
                    <p className="font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{ACCOUNT_TYPE_META[a.type].label}</p>
                  </div>
                </div>
                <span className="font-semibold">{fmt(toNumber(a.currentBalance))}</span>
              </div>
            ))}
            {accounts.length > 0 && (
              <>
                <div className="border-t pt-2 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>Total</span>
                    <span>{fmt(accounts.reduce((s, a) => s + toNumber(a.currentBalance), 0))}</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
