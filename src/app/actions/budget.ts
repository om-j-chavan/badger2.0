"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { budgetSchema } from "@/lib/validators";
import { grantBadge, awardXp } from "@/lib/services/gamification";

function revalidateBudget() {
  ["/budget", "/dashboard"].forEach((p) => revalidatePath(p));
}

/** Create or replace the budget for a given month (upsert by month/year). */
export async function saveBudget(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = budgetSchema.parse(input);

    const budget = await prisma.$transaction(async (tx) => {
      const existing = await tx.budget.findUnique({
        where: { userId_month_year: { userId, month: data.month, year: data.year } },
      });

      if (existing) {
        await tx.budgetItem.deleteMany({ where: { budgetId: existing.id } });
        const updated = await tx.budget.update({
          where: { id: existing.id },
          data: {
            name: data.name,
            monthlyIncome: data.monthlyIncome,
            items: {
              create: data.items.map((i) => ({
                label: i.label,
                amount: i.amount,
                priority: i.priority,
                categoryId: i.categoryId ?? null,
              })),
            },
          },
        });
        await audit(userId, "budget.update", "Budget", updated.id, undefined, tx);
        return updated;
      }

      const created = await tx.budget.create({
        data: {
          userId,
          name: data.name,
          month: data.month,
          year: data.year,
          monthlyIncome: data.monthlyIncome,
          items: {
            create: data.items.map((i) => ({
              label: i.label,
              amount: i.amount,
              priority: i.priority,
              categoryId: i.categoryId ?? null,
            })),
          },
        },
      });
      await audit(userId, "budget.create", "Budget", created.id, undefined, tx);
      return created;
    });

    // Keep the user's headline monthly income in sync with their latest budget.
    await prisma.user.update({
      where: { id: userId },
      data: { monthlyIncome: data.monthlyIncome },
    });

    const count = await prisma.budget.count({ where: { userId } });
    if (count === 1) await grantBadge(userId, "first_budget");
    await awardXp(userId, 12);

    revalidateBudget();
    return { id: budget.id };
  });
}

export async function deleteBudget(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("budget", id, userId);
    await prisma.budget.delete({ where: { id } });
    await audit(userId, "budget.delete", "Budget", id);
    revalidateBudget();
    return { id };
  });
}
