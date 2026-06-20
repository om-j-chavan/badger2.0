"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { subscriptionSchema } from "@/lib/validators";
import { awardXp } from "@/lib/services/gamification";
import { createExpense } from "@/app/actions/expense";
import { toNumber } from "@/lib/utils";

function revalidateSubs() {
  ["/subscriptions", "/commitments", "/dashboard"].forEach((p) => revalidatePath(p));
}

export async function createSubscription(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = subscriptionSchema.parse(input);
    if (data.categoryId) await requireOwnership("category", data.categoryId, userId);

    const sub = await prisma.subscription.create({
      data: {
        userId,
        name: data.name,
        categoryId: data.categoryId ?? null,
        cost: data.cost,
        frequency: data.frequency,
        renewalDate: data.renewalDate,
        icon: data.icon,
        color: data.color,
        remindDaysBefore: data.remindDaysBefore,
      },
    });
    await audit(userId, "subscription.create", "Subscription", sub.id);
    await awardXp(userId, 5);
    revalidateSubs();
    return { id: sub.id };
  });
}

export async function updateSubscription(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("subscription", id, userId);
    const data = subscriptionSchema.partial().parse(input);
    await prisma.subscription.update({
      where: { id },
      data: { ...data, categoryId: data.categoryId ?? undefined },
    });
    await audit(userId, "subscription.update", "Subscription", id);
    revalidateSubs();
    return { id };
  });
}

export async function toggleSubscription(
  id: string,
  isActive: boolean,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("subscription", id, userId);
    await prisma.subscription.update({ where: { id }, data: { isActive } });
    revalidateSubs();
    return { id };
  });
}

/**
 * Log this subscription as an expense for today, pulling amount and name from
 * the subscription. Uses the subscription's own category if set, otherwise the
 * user's default category. Delegates to createExpense so account balances and
 * gamification stay consistent.
 */
export async function logSubscriptionAsExpense(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  const resolved = await runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("subscription", id, userId);
    const sub = await prisma.subscription.findUniqueOrThrow({ where: { id } });

    let categoryId = sub.categoryId;
    if (!categoryId) {
      const fallback =
        (await prisma.category.findFirst({ where: { userId, isDefault: true } })) ??
        (await prisma.category.findFirst({ where: { userId } }));
      if (!fallback) {
        throw new Error("Add a category first so the expense can be filed.");
      }
      categoryId = fallback.id;
    }
    return { categoryId, amount: toNumber(sub.cost), note: sub.name };
  });
  if (!resolved.ok) return resolved;

  return createExpense({
    categoryId: resolved.data.categoryId,
    amount: resolved.data.amount,
    date: new Date(),
    note: resolved.data.note,
  });
}

export async function deleteSubscription(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("subscription", id, userId);
    await prisma.subscription.delete({ where: { id } });
    await audit(userId, "subscription.delete", "Subscription", id);
    revalidateSubs();
    return { id };
  });
}
