"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { accountSchema } from "@/lib/validators";

export async function createAccount(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = accountSchema.parse(input);
    const account = await prisma.account.create({
      data: { ...data, userId },
    });
    await audit(userId, "account.create", "Account", account.id);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { id: account.id };
  });
}

export async function updateAccount(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("account", id, userId);
    const data = accountSchema.partial().parse(input);
    await prisma.account.update({ where: { id }, data });
    await audit(userId, "account.update", "Account", id);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { id };
  });
}

export async function archiveAccount(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("account", id, userId);
    await prisma.account.update({ where: { id }, data: { isArchived: true } });
    await audit(userId, "account.archive", "Account", id);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { id };
  });
}

export async function unarchiveAccount(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("account", id, userId);
    await prisma.account.update({ where: { id }, data: { isArchived: false } });
    await audit(userId, "account.unarchive", "Account", id);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { id };
  });
}
