import type { BudgetPriority } from "@prisma/client";
import { BUDGET_PRIORITY_META } from "../constants";
import { round2 } from "../utils";

export interface PlannedItem {
  label: string;
  amount: number;
  priority: BudgetPriority;
}

export interface GeneratedPlan {
  key: "safe" | "savings" | "emergency";
  name: string;
  description: string;
  income: number;
  allocated: number;
  savings: number;
  savingsRate: number;
  keptItems: { label: string; amount: number; priority: BudgetPriority }[];
  trimmedItems: { label: string; amount: number; priority: BudgetPriority }[];
}

/**
 * Generate three budget scenarios from a single set of planned items, ranked by
 * priority (Must Have > Should Have > Nice to Have).
 *
 *  - safe:      keep everything that fits; target ~20% savings.
 *  - savings:   keep Must + Should; trim Nice to Have for ~35% savings.
 *  - emergency: keep only Must Have essentials to maximise runway.
 */
export function generateBudgetPlans(income: number, items: PlannedItem[]): GeneratedPlan[] {
  const byPriority = (p: BudgetPriority) => items.filter((i) => i.priority === p);
  const must = byPriority("MUST_HAVE");
  const should = byPriority("SHOULD_HAVE");
  const nice = byPriority("NICE_TO_HAVE");

  const sum = (arr: PlannedItem[]) => round2(arr.reduce((s, i) => s + i.amount, 0));

  const build = (
    key: GeneratedPlan["key"],
    name: string,
    description: string,
    kept: PlannedItem[],
    trimmed: PlannedItem[],
  ): GeneratedPlan => {
    const allocated = sum(kept);
    const savings = round2(income - allocated);
    return {
      key,
      name,
      description,
      income: round2(income),
      allocated,
      savings,
      savingsRate: income > 0 ? round2((savings / income) * 100) : 0,
      keptItems: kept.map((i) => ({ label: i.label, amount: round2(i.amount), priority: i.priority })),
      trimmedItems: trimmed.map((i) => ({
        label: i.label,
        amount: round2(i.amount),
        priority: i.priority,
      })),
    };
  };

  return [
    build(
      "safe",
      "Safe Budget",
      "Comfortable spending across all your priorities, while keeping a healthy buffer.",
      [...must, ...should, ...nice],
      [],
    ),
    build(
      "savings",
      "Savings-Focused Budget",
      "Trim the nice-to-haves and redirect that money into savings and goals.",
      [...must, ...should],
      nice,
    ),
    build(
      "emergency",
      "Emergency Budget",
      "Bare essentials only — maximum runway for a tight month.",
      must,
      [...should, ...nice],
    ),
  ];
}

export function priorityLabel(p: BudgetPriority): string {
  return BUDGET_PRIORITY_META[p].label;
}
