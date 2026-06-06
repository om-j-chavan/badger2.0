"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { incomeSchema } from "@/lib/validators";
import { awardXp } from "@/lib/services/gamification";
import { toNumber } from "@/lib/utils";

function revalidate() {
  ["/accounts", "/dashboard", "/review"].forEach((p) => revalidatePath(p));
}

export async function createIncome(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = incomeSchema.parse(input);
    if (data.accountId) await requireOwnership("account", data.accountId, userId);

    const income = await prisma.$transaction(async (tx) => {
      const created = await tx.income.create({
        data: {
          userId,
          accountId: data.accountId ?? null,
          amount: data.amount,
          source: data.source,
          date: data.date,
          note: data.note ?? null,
        },
      });
      if (data.accountId) {
        await tx.account.update({
          where: { id: data.accountId },
          data: { currentBalance: { increment: data.amount } },
        });
      }
      await audit(userId, "income.create", "Income", created.id, { amount: data.amount }, tx);
      return created;
    });

    await awardXp(userId, 3);
    revalidate();
    return { id: income.id };
  });
}

export async function deleteIncome(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    // Income isn't in the ownership helper list; verify directly.
    const existing = await prisma.income.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("That deposit could not be found.");

    await prisma.$transaction(async (tx) => {
      if (existing.accountId) {
        await tx.account.update({
          where: { id: existing.accountId },
          data: { currentBalance: { decrement: toNumber(existing.amount) } },
        });
      }
      await tx.income.delete({ where: { id } });
      await audit(userId, "income.delete", "Income", id, undefined, tx);
    });

    revalidate();
    return { id };
  });
}
