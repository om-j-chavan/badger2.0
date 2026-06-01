import { subDays, format } from "date-fns";
import { Sparkles, Lightbulb } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getMonthlySummary } from "@/lib/services/summary";
import { derivePersonality, ratio } from "@/lib/finance/personality";
import { toNumber, clamp } from "@/lib/utils";
import { formatCurrency } from "@/lib/currency";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function InsightsPage() {
  const user = await requireUser();
  const now = new Date();
  const since = subDays(now, 90);

  const [summary, expenses, budget] = await Promise.all([
    getMonthlySummary(user.id, now.getFullYear(), now.getMonth() + 1),
    prisma.expense.findMany({
      where: { userId: user.id, date: { gte: since } },
      select: { amount: true, importance: true, mood: true, date: true },
    }),
    prisma.budget.findUnique({
      where: { userId_month_year: { userId: user.id, month: now.getMonth() + 1, year: now.getFullYear() } },
      include: { items: true },
    }),
  ]);

  const total = expenses.reduce((s, e) => s + toNumber(e.amount), 0);
  const luxury = expenses.filter((e) => e.importance === "LUXURY").reduce((s, e) => s + toNumber(e.amount), 0);
  const investment = expenses.filter((e) => e.importance === "INVESTMENT").reduce((s, e) => s + toNumber(e.amount), 0);
  const regretCount = expenses.filter((e) => e.mood === "REGRET" || e.mood === "STRESSED").length;
  const loggedDays = new Set(expenses.map((e) => format(e.date, "yyyy-MM-dd"))).size;

  let budgetAdherence = 60;
  if (budget) {
    const planned = budget.items.reduce((s, i) => s + toNumber(i.amount), 0);
    if (planned > 0) {
      budgetAdherence = clamp(100 - (Math.abs(summary.actualSpending - planned) / planned) * 100, 0, 100);
    }
  }

  const personality = derivePersonality({
    savingsRate: summary.savingsRate,
    investmentRatio: ratio(investment, total),
    luxuryRatio: ratio(luxury, total),
    regretRatio: expenses.length > 0 ? (regretCount / expenses.length) * 100 : 0,
    budgetAdherence,
    loggingConsistency: clamp((loggedDays / 90) * 100, 0, 100),
  });

  const insights = buildInsights({
    currency: user.currency,
    savingsRate: summary.savingsRate,
    investmentRate: summary.investmentRate,
    luxuryRatio: ratio(luxury, total),
    emiBurden: summary.emiBurden.ratio,
    topCategory: summary.byCategory[0],
    commitmentBurden: summary.commitmentBurden,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Insights" description="What your money habits say about you — and a few friendly nudges." />

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/15 to-accent p-6">
          <div className="flex items-center gap-4">
            <span className="text-5xl">{personality.emoji}</span>
            <div>
              <p className="text-sm text-muted-foreground">Your spending personality</p>
              <h2 className="text-2xl font-bold">{personality.type}</h2>
            </div>
          </div>
          <p className="mt-3 text-sm">{personality.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {personality.traits.map((t) => (
              <Badge key={t} variant="secondary">{t}</Badge>
            ))}
          </div>
        </div>
      </Card>

      <div>
        <div className="mb-3 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h2 className="font-semibold">Personalised insights</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {insights.map((ins, i) => (
            <Card key={i}>
              <CardContent className="flex gap-3 p-4">
                <span className="text-2xl">{ins.emoji}</span>
                <div>
                  <p className="font-medium">{ins.title}</p>
                  <p className="text-sm text-muted-foreground">{ins.body}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Last 90 days</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Mini label="Logged on" value={`${loggedDays} days`} />
          <Mini label="Total spend" value={formatCurrency(total, user.currency)} />
          <Mini label="Luxury share" value={`${ratio(luxury, total)}%`} />
          <Mini label="Investment share" value={`${ratio(investment, total)}%`} />
        </CardContent>
      </Card>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-semibold">{value}</p>
    </div>
  );
}

function buildInsights(d: {
  currency: string;
  savingsRate: number;
  investmentRate: number;
  luxuryRatio: number;
  emiBurden: number;
  topCategory?: { name: string; total: number };
  commitmentBurden: number;
}) {
  const insights: { emoji: string; title: string; body: string }[] = [];

  if (d.savingsRate >= 20) {
    insights.push({ emoji: "🐿️", title: "Solid saver", body: `You're saving ${Math.round(d.savingsRate)}% of your income — well above the comfort line.` });
  } else {
    insights.push({ emoji: "🌱", title: "Room to save", body: `Saving ${Math.round(d.savingsRate)}% right now. Automating even a small monthly transfer could help it grow.` });
  }

  if (d.topCategory) {
    insights.push({ emoji: "📊", title: "Biggest category", body: `${d.topCategory.name} is your largest spend this month at ${formatCurrency(d.topCategory.total, d.currency)}.` });
  }

  if (d.luxuryRatio > 30) {
    insights.push({ emoji: "✨", title: "Enjoying life", body: `Luxuries are ${Math.round(d.luxuryRatio)}% of spend. Treats are great — just keeping you aware.` });
  } else {
    insights.push({ emoji: "⚖️", title: "Balanced treats", body: `Luxuries are a modest ${Math.round(d.luxuryRatio)}% of your spending. Nicely balanced.` });
  }

  if (d.emiBurden > 40) {
    insights.push({ emoji: "🎯", title: "Debt focus", body: `EMIs take ${Math.round(d.emiBurden)}% of income. The prepayment simulator can map a faster, cheaper exit.` });
  } else if (d.investmentRate < 10) {
    insights.push({ emoji: "📈", title: "Grow your future", body: `Investments are ${Math.round(d.investmentRate)}% of income. When ready, nudging this up compounds beautifully.` });
  } else {
    insights.push({ emoji: "🚀", title: "Building wealth", body: `You're investing ${Math.round(d.investmentRate)}% of income. Future you is grateful.` });
  }

  return insights;
}
