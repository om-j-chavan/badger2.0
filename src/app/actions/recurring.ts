"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { recurringSchema } from "@/lib/validators";
import { generateDueRecurringExpenses } from "@/lib/services/recurring";

function revalidateRecurring() {
  ["/recurring", "/expenses", "/dashboard"].forEach((p) => revalidatePath(p));
}

export async function createRecurring(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = recurringSchema.parse(input);
    await requireOwnership("category", data.categoryId, userId);

    const rule = await prisma.recurringExpense.create({
      data: {
        userId,
        categoryId: data.categoryId,
        name: data.name,
        amount: data.amount,
        importance: data.importance,
        frequency: data.frequency,
        intervalCount: data.intervalCount,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        nextRunDate: data.startDate,
      },
    });

    // Immediately materialise any instances already due.
    await generateDueRecurringExpenses(userId);
    await audit(userId, "recurring.create", "RecurringExpense", rule.id);
    revalidateRecurring();
    return { id: rule.id };
  });
}

export async function toggleRecurring(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("recurringExpense", id, userId);
    await prisma.recurringExpense.update({ where: { id }, data: { isActive } });
    revalidateRecurring();
    return { id };
  });
}

export async function deleteRecurring(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("recurringExpense", id, userId);
    await prisma.recurringExpense.delete({ where: { id } });
    await audit(userId, "recurring.delete", "RecurringExpense", id);
    revalidateRecurring();
    return { id };
  });
}
