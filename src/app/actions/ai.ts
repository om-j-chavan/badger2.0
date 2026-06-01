"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { askAssistant } from "@/lib/ai/assistant";
import type { AssistantResponse, ChatMessage, DraftAction } from "@/lib/ai/types";
import { createExpense } from "./expense";
import { createSubscription } from "./subscription";
import { createDistributed } from "./distributed";
import { createLoan } from "./loan";
import { createGoal } from "./goal";

/** Resolve a category name to an owned category id, creating it if needed. */
async function resolveCategoryId(userId: string, name: string): Promise<string> {
  const existing = await prisma.category.findFirst({
    where: { userId, name: { equals: name, mode: "insensitive" } },
  });
  if (existing) return existing.id;
  const created = await prisma.category.create({
    data: { userId, name, isDefault: false, icon: "circle", color: "#64748b" },
  });
  return created.id;
}

export async function sendAssistantMessage(
  message: string,
  history: ChatMessage[] = [],
): Promise<ActionResult<AssistantResponse>> {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!message.trim()) throw new Error("Type a message first.");

    await prisma.aiMessage.create({ data: { userId, role: "user", content: message } });
    const response = await askAssistant(userId, message, history);
    await prisma.aiMessage.create({
      data: {
        userId,
        role: "assistant",
        content: response.reply,
        meta: (response.draft || response.links || response.search) as object,
      },
    });
    return response;
  });
}

/**
 * Execute a draft action the AI proposed, after explicit user confirmation.
 * Delegates to the same validated server actions used by the UI forms.
 */
export async function commitDraft(draft: DraftAction): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const p = draft.payload;

    switch (draft.kind) {
      case "create_expense": {
        const categoryId = await resolveCategoryId(userId, String(p.categoryName ?? "Miscellaneous"));
        const res = await createExpense({
          categoryId,
          amount: Number(p.amount),
          importance: p.importance ?? "USEFUL",
          date: p.date ? new Date(String(p.date)) : new Date(),
          note: p.note ?? null,
        });
        if (!res.ok) throw new Error(res.error);
        break;
      }
      case "create_subscription": {
        const res = await createSubscription({
          name: String(p.name),
          cost: Number(p.cost),
          frequency: p.frequency ?? "MONTHLY",
          renewalDate: p.renewalDate ? new Date(String(p.renewalDate)) : new Date(),
        });
        if (!res.ok) throw new Error(res.error);
        break;
      }
      case "create_distributed_expense": {
        const categoryId = await resolveCategoryId(userId, String(p.categoryName ?? "Miscellaneous"));
        const res = await createDistributed({
          name: String(p.name),
          categoryId,
          totalAmount: Number(p.totalAmount),
          coverageMonths: Number(p.coverageMonths),
          startDate: p.startDate ? new Date(String(p.startDate)) : new Date(),
          importance: p.importance ?? "ESSENTIAL",
        });
        if (!res.ok) throw new Error(res.error);
        break;
      }
      case "create_loan": {
        const res = await createLoan({
          name: String(p.name),
          principalAmount: Number(p.principalAmount),
          interestRate: Number(p.interestRate),
          tenureMonths: Number(p.tenureMonths),
          startDate: p.startDate ? new Date(String(p.startDate)) : new Date(),
          type: p.type ?? "PERSONAL",
        });
        if (!res.ok) throw new Error(res.error);
        break;
      }
      case "create_goal": {
        const res = await createGoal({
          name: String(p.name),
          targetAmount: Number(p.targetAmount),
        });
        if (!res.ok) throw new Error(res.error);
        break;
      }
      default:
        throw new Error("I'm not sure how to save that.");
    }

    await audit(userId, "ai.commit_draft", "Draft", null, { kind: draft.kind });
    revalidatePath("/dashboard");
    return { ok: true as const };
  });
}
