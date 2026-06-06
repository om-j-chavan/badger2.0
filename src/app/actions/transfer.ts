"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { transferSchema } from "@/lib/validators";
import { toNumber } from "@/lib/utils";

function revalidate() {
  ["/accounts", "/dashboard"].forEach((p) => revalidatePath(p));
}

/**
 * Move money between two of the user's accounts. Decrements the source and
 * increments the destination — it is NEVER counted as income or spending.
 * A credit-card bill payment is just a transfer into the card account
 * (which pays down its negative balance), so the original purchases aren't
 * double-counted.
 */
export async function createTransfer(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = transferSchema.parse(input);
    await requireOwnership("account", data.fromAccountId, userId);
    await requireOwnership("account", data.toAccountId, userId);

    const transfer = await prisma.$transaction(async (tx) => {
      const created = await tx.transfer.create({
        data: {
          userId,
          fromAccountId: data.fromAccountId,
          toAccountId: data.toAccountId,
          amount: data.amount,
          date: data.date,
          note: data.note ?? null,
          isCardPayment: data.isCardPayment,
        },
      });
      await tx.account.update({
        where: { id: data.fromAccountId },
        data: { currentBalance: { decrement: data.amount } },
      });
      await tx.account.update({
        where: { id: data.toAccountId },
        data: { currentBalance: { increment: data.amount } },
      });
      await audit(userId, "transfer.create", "Transfer", created.id, { amount: data.amount }, tx);
      return created;
    });

    revalidate();
    return { id: transfer.id };
  });
}

export async function deleteTransfer(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const existing = await prisma.transfer.findUnique({ where: { id } });
    if (!existing || existing.userId !== userId) throw new Error("That transfer could not be found.");

    await prisma.$transaction(async (tx) => {
      // Reverse: give back to source, take from destination.
      await tx.account.update({
        where: { id: existing.fromAccountId },
        data: { currentBalance: { increment: toNumber(existing.amount) } },
      });
      await tx.account.update({
        where: { id: existing.toAccountId },
        data: { currentBalance: { decrement: toNumber(existing.amount) } },
      });
      await tx.transfer.delete({ where: { id } });
      await audit(userId, "transfer.delete", "Transfer", id, undefined, tx);
    });

    revalidate();
    return { id };
  });
}
