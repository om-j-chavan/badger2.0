"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { goalSchema, goalContributionSchema } from "@/lib/validators";
import { grantBadge, awardXp } from "@/lib/services/gamification";
import { toNumber } from "@/lib/utils";

function revalidateGoals() {
  ["/goals", "/dashboard"].forEach((p) => revalidatePath(p));
}

export async function createGoal(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = goalSchema.parse(input);

    const goal = await prisma.goal.create({
      data: {
        userId,
        name: data.name,
        icon: data.icon,
        color: data.color,
        targetAmount: data.targetAmount,
        currentAmount: data.currentAmount,
        targetDate: data.targetDate ?? null,
      },
    });

    const isFirst = (await prisma.goal.count({ where: { userId } })) === 1;
    if (isFirst) await grantBadge(userId, "first_goal");
    await awardXp(userId, 10);
    await audit(userId, "goal.create", "Goal", goal.id);
    revalidateGoals();
    return { id: goal.id };
  });
}

export async function updateGoal(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("goal", id, userId);
    const data = goalSchema.partial().parse(input);
    await prisma.goal.update({
      where: { id },
      data: { ...data, targetDate: data.targetDate ?? undefined },
    });
    await audit(userId, "goal.update", "Goal", id);
    revalidateGoals();
    return { id };
  });
}

export async function deleteGoal(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("goal", id, userId);
    await prisma.goal.delete({ where: { id } });
    await audit(userId, "goal.delete", "Goal", id);
    revalidateGoals();
    return { id };
  });
}

/** Add money to a goal; auto-completes it and awards a badge when reached. */
export async function contributeToGoal(input: unknown): Promise<ActionResult<{ id: string; achieved: boolean }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = goalContributionSchema.parse(input);
    await requireOwnership("goal", data.goalId, userId);

    const achieved = await prisma.$transaction(async (tx) => {
      const goal = await tx.goal.findUniqueOrThrow({ where: { id: data.goalId } });
      const newAmount = toNumber(goal.currentAmount) + data.amount;
      const reached = newAmount >= toNumber(goal.targetAmount);

      await tx.goalContribution.create({
        data: {
          userId,
          goalId: data.goalId,
          amount: data.amount,
          date: data.date ?? new Date(),
          note: data.note ?? null,
        },
      });
      await tx.goal.update({
        where: { id: data.goalId },
        data: {
          currentAmount: newAmount,
          status: reached ? "ACHIEVED" : goal.status,
        },
      });
      await audit(userId, "goal.contribute", "Goal", data.goalId, { amount: data.amount }, tx);
      return reached;
    });

    if (achieved) await grantBadge(userId, "goal_achiever");
    await awardXp(userId, 8);
    revalidateGoals();
    return { id: data.goalId, achieved };
  });
}
