import Link from "next/link";
import { format } from "date-fns";
import { Layers, ArrowRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { getCommitments, getCommitmentSummary } from "@/lib/services/commitments";
import { formatCurrency } from "@/lib/currency";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CommitmentExtras } from "@/components/commitments/commitment-extras";
import type { CommitmentType } from "@prisma/client";

const TYPE_LABEL: Record<CommitmentType, string> = {
  LOAN: "Loans",
  SUBSCRIPTION: "Subscriptions",
  DISTRIBUTED_EXPENSE: "Distributed",
  INSURANCE: "Insurance",
  MEMBERSHIP: "Memberships",
};

const TYPE_LINK: Record<CommitmentType, string> = {
  LOAN: "/loans",
  SUBSCRIPTION: "/subscriptions",
  DISTRIBUTED_EXPENSE: "/distributed",
  INSURANCE: "/commitments",
  MEMBERSHIP: "/commitments",
};

export default async function CommitmentsPage() {
  const user = await requireUser();
  const [commitments, summary] = await Promise.all([
    getCommitments(user.id),
    getCommitmentSummary(user.id),
  ]);
  const fmt = (n: number) => formatCurrency(n, user.currency);
  const active = commitments.filter((c) => c.status === "ACTIVE");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Commitments"
        description="Every recurring financial obligation, unified — with its true monthly impact."
        action={<CommitmentExtras />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Total monthly impact" value={fmt(summary.totalMonthlyImpact)} icon={Layers} accent="warning" />
        <StatCard label="Active commitments" value={summary.count} accent="primary" />
        <StatCard
          label="Annualised"
          value={fmt(summary.totalMonthlyImpact * 12)}
          accent="muted"
        />
      </div>

      {/* By-type breakdown */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {(Object.keys(summary.byType) as CommitmentType[]).map((type) => (
          <Card key={type}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{TYPE_LABEL[type]}</p>
              <p className="mt-1 text-lg font-bold">{fmt(summary.byType[type])}</p>
              <p className="text-xs text-muted-foreground">/month</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {active.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No commitments yet"
          description="Add a loan, subscription, distributed expense, insurance or membership and it'll appear here."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All commitments</CardTitle>
          </CardHeader>
          <CardContent className="divide-y">
            {active
              .sort((a, b) => b.monthlyImpact - a.monthlyImpact)
              .map((c) => (
                <div key={`${c.type}-${c.id}`} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{c.name}</p>
                      <Badge variant="secondary" className="text-[10px]">{TYPE_LABEL[c.type]}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.nextDueDate ? `Next: ${format(new Date(c.nextDueDate), "d MMM yyyy")}` : "Ongoing"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-semibold">{fmt(c.monthlyImpact)}</p>
                      <p className="text-xs text-muted-foreground">/month</p>
                    </div>
                    <Link href={TYPE_LINK[c.type]} className="text-muted-foreground hover:text-primary">
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
