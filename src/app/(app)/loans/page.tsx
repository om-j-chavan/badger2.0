import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/utils";
import { loanProgress } from "@/lib/finance/emi";
import { classifyEmiBurden } from "@/lib/finance/health-score";
import { formatCurrency } from "@/lib/currency";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { LoanManager, type LoanView } from "@/components/loans/loan-manager";
import { Landmark, Percent } from "lucide-react";

export default async function LoansPage() {
  const user = await requireUser();
  const loans = await prisma.loan.findMany({
    where: { userId: user.id },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  const active = loans.filter((l) => l.status === "ACTIVE");
  const totalEmi = active.reduce((s, l) => s + toNumber(l.emiAmount), 0);
  const totalDebt = active.reduce((s, l) => s + toNumber(l.remainingPrincipal), 0);
  const burden = classifyEmiBurden(totalEmi, toNumber(user.monthlyIncome));

  const views: LoanView[] = loans.map((l) => {
    const progress = loanProgress({
      principal: toNumber(l.principalAmount),
      remainingPrincipal: toNumber(l.remainingPrincipal),
      emi: toNumber(l.emiAmount),
      annualRatePct: toNumber(l.interestRate),
    });
    return {
      id: l.id,
      name: l.name,
      type: l.type,
      lender: l.lender,
      principalAmount: toNumber(l.principalAmount),
      interestRate: toNumber(l.interestRate),
      tenureMonths: l.tenureMonths,
      emiAmount: toNumber(l.emiAmount),
      remainingPrincipal: toNumber(l.remainingPrincipal),
      nextDueDate: l.nextDueDate.toISOString(),
      status: l.status,
      percentComplete: progress.percentComplete,
      remainingMonths: progress.remainingMonths,
      remainingInterest: progress.remainingInterest,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Loans" description="Track your debt, watch it shrink, and plan a faster exit." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total remaining debt" value={formatCurrency(totalDebt, user.currency)} icon={Landmark} accent="destructive" />
        <StatCard label="Monthly EMI" value={formatCurrency(totalEmi, user.currency)} accent="warning" />
        <StatCard
          label="EMI burden"
          value={`${burden.ratio}%`}
          hint={burden.label}
          icon={Percent}
          accent={burden.ratio < 30 ? "success" : burden.ratio < 50 ? "warning" : "destructive"}
        />
      </div>

      <LoanManager loans={views} currency={user.currency} />
    </div>
  );
}
