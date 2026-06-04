"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { runAction, type ActionResult } from "@/lib/action-result";
import { sendPushToUser } from "@/lib/notify/push";

interface WebPushJson {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export async function savePushSubscription(sub: WebPushJson): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
      throw new Error("That push subscription looks invalid.");
    }
    await prisma.pushSubscription.upsert({
      where: { endpoint: sub.endpoint },
      create: { userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
      update: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
    return { ok: true as const };
  });
}

export async function removePushSubscription(endpoint: string): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    await requireUserId();
    await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return { ok: true as const };
  });
}

export async function sendTestPush(): Promise<ActionResult<{ sent: number }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const sent = await sendPushToUser(userId, {
      title: "🦡 Test from Badger",
      body: "Nice — push notifications are working!",
      url: "/dashboard",
    });
    if (sent === 0) throw new Error("No active push devices found for your account.");
    return { sent };
  });
}

export async function setEmailReminders(enabled: boolean): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await prisma.user.update({ where: { id: userId }, data: { emailReminders: enabled } });
    revalidatePath("/settings");
    return { ok: true as const };
  });
}
