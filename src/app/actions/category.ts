"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { categorySchema } from "@/lib/validators";

export async function createCategory(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = categorySchema.parse(input);

    const existing = await prisma.category.findFirst({
      where: { userId, name: { equals: data.name, mode: "insensitive" } },
    });
    if (existing) throw new Error("You already have a category with that name.");

    const category = await prisma.category.create({
      data: { ...data, userId, isDefault: false },
    });
    await audit(userId, "category.create", "Category", category.id);
    ["/expenses", "/settings", "/dashboard"].forEach((p) => revalidatePath(p));
    return { id: category.id };
  });
}

export async function updateCategory(
  id: string,
  input: unknown,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("category", id, userId);
    const data = categorySchema.partial().parse(input);
    await prisma.category.update({ where: { id }, data });
    await audit(userId, "category.update", "Category", id);
    ["/expenses", "/settings"].forEach((p) => revalidatePath(p));
    return { id };
  });
}

export async function deleteCategory(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("category", id, userId);

    const inUse = await prisma.expense.count({ where: { categoryId: id } });
    if (inUse > 0) {
      throw new Error(
        `That category is used by ${inUse} expense${inUse === 1 ? "" : "s"}. Reassign them first.`,
      );
    }
    await prisma.category.delete({ where: { id } });
    await audit(userId, "category.delete", "Category", id);
    ["/expenses", "/settings"].forEach((p) => revalidatePath(p));
    return { id };
  });
}
