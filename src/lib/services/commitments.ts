import type { CommitmentType } from "@prisma/client";
import { prisma } from "../prisma";
import { toNumber, round2 } from "../utils";
import { distributedMonthlyImpact, frequencyToMonthly } from "../finance/effective-cost";
import { addMonths } from "date-fns";

export interface Commitment {
  id: string;
  type: CommitmentType;
  name: string;
  monthlyImpact: number;
  nextDueDate: string | null;
  status: "ACTIVE" | "COMPLETED" | "PAUSED";
  amount: number; // headline amount (EMI / cost / premium / total)
  meta?: Record<string, unknown>;
}

/**
 * The unified commitment engine. Reads every commitment-bearing entity for a
 * user and projects each into a common { monthlyImpact, nextDueDate, status }
 * shape. There is no separate "commitments" table — this is the single source
 * of truth derived from the underlying records, so nothing can drift.
 */
export async function getCommitments(userId: string): Promise<Commitment[]> {
  const [loans, subscriptions, distributed, insurances, memberships] = await Promise.all([
    prisma.loan.findMany({ where: { userId, status: "ACTIVE" } }),
    prisma.subscription.findMany({ where: { userId, isActive: true } }),
    prisma.distributedExpense.findMany({ where: { userId } }),
    prisma.insurance.findMany({ where: { userId, isActive: true } }),
    prisma.membership.findMany({ where: { userId, isActive: true } }),
  ]);

  const now = new Date();
  const commitments: Commitment[] = [];

  for (const loan of loans) {
    commitments.push({
      id: loan.id,
      type: "LOAN",
      name: loan.name,
      monthlyImpact: round2(toNumber(loan.emiAmount)),
      nextDueDate: loan.nextDueDate.toISOString(),
      status: "ACTIVE",
      amount: round2(toNumber(loan.emiAmount)),
      meta: { type: loan.type, remaining: toNumber(loan.remainingPrincipal) },
    });
  }

  for (const sub of subscriptions) {
    commitments.push({
      id: sub.id,
      type: "SUBSCRIPTION",
      name: sub.name,
      monthlyImpact: frequencyToMonthly(toNumber(sub.cost), sub.frequency),
      nextDueDate: sub.renewalDate.toISOString(),
      status: "ACTIVE",
      amount: round2(toNumber(sub.cost)),
      meta: { frequency: sub.frequency },
    });
  }

  for (const d of distributed) {
    const endDate = addMonths(d.startDate, d.coverageMonths);
    const completed = endDate <= now;
    commitments.push({
      id: d.id,
      type: "DISTRIBUTED_EXPENSE",
      name: d.name,
      monthlyImpact: completed ? 0 : distributedMonthlyImpact(toNumber(d.totalAmount), d.coverageMonths),
      nextDueDate: completed ? null : endDate.toISOString(),
      status: completed ? "COMPLETED" : "ACTIVE",
      amount: round2(toNumber(d.totalAmount)),
      meta: { coverageMonths: d.coverageMonths, startDate: d.startDate.toISOString() },
    });
  }

  for (const ins of insurances) {
    commitments.push({
      id: ins.id,
      type: "INSURANCE",
      name: ins.name,
      monthlyImpact: frequencyToMonthly(toNumber(ins.premium), ins.frequency),
      nextDueDate: ins.renewalDate.toISOString(),
      status: "ACTIVE",
      amount: round2(toNumber(ins.premium)),
      meta: { insuranceType: ins.type },
    });
  }

  for (const m of memberships) {
    commitments.push({
      id: m.id,
      type: "MEMBERSHIP",
      name: m.name,
      monthlyImpact: frequencyToMonthly(toNumber(m.cost), m.frequency),
      nextDueDate: m.renewalDate.toISOString(),
      status: "ACTIVE",
      amount: round2(toNumber(m.cost)),
    });
  }

  return commitments;
}

export interface CommitmentSummary {
  totalMonthlyImpact: number;
  byType: Record<CommitmentType, number>;
  upcoming: Commitment[]; // next 30 days, soonest first
  count: number;
}

export async function getCommitmentSummary(userId: string): Promise<CommitmentSummary> {
  const commitments = await getCommitments(userId);
  const active = commitments.filter((c) => c.status === "ACTIVE");

  const byType = {
    LOAN: 0,
    SUBSCRIPTION: 0,
    DISTRIBUTED_EXPENSE: 0,
    INSURANCE: 0,
    MEMBERSHIP: 0,
  } as Record<CommitmentType, number>;

  for (const c of active) byType[c.type] = round2(byType[c.type] + c.monthlyImpact);

  const total = round2(active.reduce((s, c) => s + c.monthlyImpact, 0));

  const horizon = addMonths(new Date(), 1);
  const upcoming = active
    .filter((c) => c.nextDueDate && new Date(c.nextDueDate) <= horizon)
    .sort((a, b) => new Date(a.nextDueDate!).getTime() - new Date(b.nextDueDate!).getTime());

  return {
    totalMonthlyImpact: total,
    byType,
    upcoming,
    count: active.length,
  };
}
