"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { subscriptionSchema } from "@/lib/validators";
import { awardXp } from "@/lib/services/gamification";

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
