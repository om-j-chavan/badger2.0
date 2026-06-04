"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { distributedSchema } from "@/lib/validators";
import { awardXp } from "@/lib/services/gamification";

function revalidateDistributed() {
  ["/distributed", "/commitments", "/dashboard", "/expenses"].forEach((p) => revalidatePath(p));
}

/**
 * Create a distributed expense AND log the actual money-out expense on the
 * start date, linked back to the distributed record. The dashboard then
 * spreads the cost across coverage months for the "effective" view.
 */
export async function createDistributed(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = distributedSchema.parse(input);
    await requireOwnership("category", data.categoryId, userId);

    const dist = await prisma.$transaction(async (tx) => {
      const created = await tx.distributedExpense.create({
        data: {
          userId,
          categoryId: data.categoryId,
          name: data.name,
          totalAmount: data.totalAmount,
          amountPaid: data.amountPaid,
          coverageMonths: data.coverageMonths,
          startDate: data.startDate,
          importance: data.importance,
          note: data.note ?? null,
        },
      });

      // Log the actual money already paid (if any) as a real expense, linked
      // back to this distributed item. The full cost is still spread across
      // coverage months for the "effective" view regardless of how much is paid.
      if (data.amountPaid > 0) {
        await tx.expense.create({
          data: {
            userId,
            categoryId: data.categoryId,
            date: data.startDate,
            amount: data.amountPaid,
            importance: data.importance,
            note: `${data.name} (paid ${data.amountPaid} of ${data.totalAmount}, covers ${data.coverageMonths} months)`,
            distributedExpenseId: created.id,
          },
        });
      }

      await audit(userId, "distributed.create", "DistributedExpense", created.id, undefined, tx);
      return created;
    });

    await awardXp(userId, 5);
    revalidateDistributed();
    return { id: dist.id };
  });
}

export async function deleteDistributed(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("distributedExpense", id, userId);
    // Linked expenses have onDelete: SetNull, so they remain as actual spend.
    await prisma.distributedExpense.delete({ where: { id } });
    await audit(userId, "distributed.delete", "DistributedExpense", id);
    revalidateDistributed();
    return { id };
  });
}
