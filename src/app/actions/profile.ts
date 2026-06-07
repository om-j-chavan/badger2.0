"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { profileSchema } from "@/lib/validators";

export async function updateProfile(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = profileSchema.parse(input);

    // Email is unique — guard against collisions with a friendly message.
    if (data.email) {
      const clash = await prisma.user.findFirst({
        where: { email: data.email, NOT: { id: userId } },
        select: { id: true },
      });
      if (clash) throw new Error("That email is already in use by another account.");
    }

    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name ?? undefined,
        email: data.email ?? undefined,
        currency: data.currency ?? undefined,
        timezone: data.timezone ?? undefined,
        monthlyIncome: data.monthlyIncome ?? undefined,
      },
    });
    await audit(userId, "profile.update", "User", userId);
    ["/settings", "/dashboard"].forEach((p) => revalidatePath(p));
    return { id: userId };
  });
}

export async function completeOnboarding(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = profileSchema.parse(input);
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name ?? undefined,
        currency: data.currency ?? undefined,
        monthlyIncome: data.monthlyIncome ?? undefined,
        onboardedAt: new Date(),
      },
    });
    await audit(userId, "onboarding.complete", "User", userId);
    return { id: userId };
  });
}
