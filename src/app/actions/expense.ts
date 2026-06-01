"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { expenseSchema, expenseUpdateSchema } from "@/lib/validators";
import { awardXp, grantBadge, bumpStreak } from "@/lib/services/gamification";
import { toNumber } from "@/lib/utils";

function revalidateExpenseViews() {
  ["/dashboard", "/expenses", "/calendar", "/review", "/accounts"].forEach((p) =>
    revalidatePath(p),
  );
}

export async function createExpense(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = expenseSchema.parse(input);

    if (data.accountId) await requireOwnership("account", data.accountId, userId);
    await requireOwnership("category", data.categoryId, userId);

    const created = await prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          userId,
          accountId: data.accountId ?? null,
          categoryId: data.categoryId,
          date: data.date,
          amount: data.amount,
          importance: data.importance,
          note: data.note ?? null,
          mood: data.mood ?? null,
          paymentMethod: data.paymentMethod ?? null,
        },
      });

      if (data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { decrement: data.amount } },
        });
      }

      await audit(userId, "expense.create", "Expense", expense.id, { amount: data.amount }, tx);
      return expense;
    });

    // Gamification (outside the critical txn; best-effort).
    const isFirst = (await prisma.expense.count({ where: { userId } })) === 1;
    if (isFirst) await grantBadge(userId, "first_expense");
    await awardXp(userId, 5);
    const streak = await bumpStreak(userId, "daily_logging");
    if (streak.current >= 30) await grantBadge(userId, "tracking_30");

    revalidateExpenseViews();
    return { id: created.id };
  });
}

export async function updateExpense(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = expenseUpdateSchema.parse(input);
    await requireOwnership("expense", data.id, userId);

    const existing = await prisma.expense.findUniqueOrThrow({ where: { id: data.id } });
    if (data.categoryId) await requireOwnership("category", data.categoryId, userId);
    if (data.accountId) await requireOwnership("account", data.accountId, userId);

    await prisma.$transaction(async (tx) => {
      // Reverse the old account effect, apply the new one.
      const oldAmount = toNumber(existing.amount);
      const newAmount = data.amount ?? oldAmount;
      const oldAccountId = existing.accountId;
      const newAccountId = data.accountId === undefined ? oldAccountId : data.accountId;

      if (oldAccountId) {
        await tx.account.update({
          where: { id: oldAccountId },
          data: { currentBalance: { increment: oldAmount } },
        });
      }
      if (newAccountId) {
        await tx.account.update({
          where: { id: newAccountId },
          data: { currentBalance: { decrement: newAmount } },
        });
      }

      await tx.expense.update({
        where: { id: data.id },
        data: {
          accountId: newAccountId,
          categoryId: data.categoryId ?? existing.categoryId,
          date: data.date ?? existing.date,
          amount: newAmount,
          importance: data.importance ?? existing.importance,
          note: data.note ?? existing.note,
          mood: data.mood ?? existing.mood,
          paymentMethod: data.paymentMethod ?? existing.paymentMethod,
        },
      });
      await audit(userId, "expense.update", "Expense", data.id, undefined, tx);
    });

    revalidateExpenseViews();
    return { id: data.id };
  });
}

export async function deleteExpense(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("expense", id, userId);
    const existing = await prisma.expense.findUniqueOrThrow({ where: { id } });

    await prisma.$transaction(async (tx) => {
      if (existing.accountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { increment: toNumber(existing.amount) } },
        });
      }
      await tx.expense.delete({ where: { id } });
      await audit(userId, "expense.delete", "Expense", id, undefined, tx);
    });

    revalidateExpenseViews();
    return { id };
  });
}

/** Move an expense to a new date (used by calendar drag-and-drop). */
export async function moveExpense(id: string, date: Date): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("expense", id, userId);
    await prisma.expense.update({ where: { id }, data: { date } });
    await audit(userId, "expense.move", "Expense", id, { date: date.toISOString() });
    revalidateExpenseViews();
    return { id };
  });
}
