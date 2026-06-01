import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../prisma";
import { advanceRecurrence } from "../dates";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Generate any due Expense instances for a user's active recurring rules, up to
 * `until` (default: now). Idempotent — driven by each rule's `nextRunDate`.
 * Returns the number of expenses created.
 */
export async function generateDueRecurringExpenses(
  userId: string,
  until: Date = new Date(),
  db: Db = prisma,
): Promise<number> {
  const rules = await db.recurringExpense.findMany({
    where: { userId, isActive: true, nextRunDate: { lte: until } },
  });

  let created = 0;

  for (const rule of rules) {
    let runDate = new Date(rule.nextRunDate);
    let last = rule.lastRunDate ? new Date(rule.lastRunDate) : null;
    let guard = 0;

    while (runDate <= until && guard < 500) {
      if (rule.endDate && runDate > rule.endDate) break;

      await db.expense.create({
        data: {
          userId,
          categoryId: rule.categoryId,
          date: runDate,
          amount: rule.amount,
          importance: rule.importance,
          note: `${rule.name} (recurring)`,
          recurringExpenseId: rule.id,
        },
      });
      created += 1;
      last = runDate;
      runDate = advanceRecurrence(runDate, rule.frequency, rule.intervalCount);
      guard += 1;
    }

    await db.recurringExpense.update({
      where: { id: rule.id },
      data: { nextRunDate: runDate, lastRunDate: last },
    });
  }

  return created;
}
