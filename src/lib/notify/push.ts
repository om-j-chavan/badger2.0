import webpush from "web-push";
import { env, hasPush } from "../env";
import { prisma } from "../prisma";

let configured = false;
function ensureConfigured(): boolean {
  if (!hasPush()) return false;
  if (!configured) {
    webpush.setVapidDetails(env.push.subject, env.push.publicKey, env.push.privateKey);
    configured = true;
  }
  return true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
}

/**
 * Send a Web Push notification to every device the user has subscribed.
 * Expired/invalid subscriptions (404/410) are pruned. Returns count sent.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!ensureConfigured()) return 0;
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  let sent = 0;

  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
        sent += 1;
      } catch (err) {
        const code = (err as { statusCode?: number })?.statusCode;
        if (code === 404 || code === 410) {
          await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.error("[push] send failed", code, (err as { body?: string })?.body);
        }
      }
    }),
  );

  return sent;
}
