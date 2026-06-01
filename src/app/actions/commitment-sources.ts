"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { insuranceSchema, membershipSchema } from "@/lib/validators";

function revalidate() {
  ["/commitments", "/dashboard"].forEach((p) => revalidatePath(p));
}

// --- Insurance --------------------------------------------------------------
export async function createInsurance(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = insuranceSchema.parse(input);
    const ins = await prisma.insurance.create({
      data: {
        userId,
        name: data.name,
        type: data.type,
        premium: data.premium,
        frequency: data.frequency,
        coverageAmount: data.coverageAmount ?? null,
        renewalDate: data.renewalDate,
        provider: data.provider ?? null,
      },
    });
    await audit(userId, "insurance.create", "Insurance", ins.id);
    revalidate();
    return { id: ins.id };
  });
}

export async function deleteInsurance(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("insurance", id, userId);
    await prisma.insurance.delete({ where: { id } });
    await audit(userId, "insurance.delete", "Insurance", id);
    revalidate();
    return { id };
  });
}

// --- Membership -------------------------------------------------------------
export async function createMembership(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = membershipSchema.parse(input);
    const m = await prisma.membership.create({
      data: {
        userId,
        name: data.name,
        cost: data.cost,
        frequency: data.frequency,
        renewalDate: data.renewalDate,
      },
    });
    await audit(userId, "membership.create", "Membership", m.id);
    revalidate();
    return { id: m.id };
  });
}

export async function deleteMembership(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("membership", id, userId);
    await prisma.membership.delete({ where: { id } });
    await audit(userId, "membership.delete", "Membership", id);
    revalidate();
    return { id };
  });
}
