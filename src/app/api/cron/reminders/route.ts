import { env } from "@/lib/env";
import { runDailyReminders } from "@/lib/services/reminders";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily reminder digest. Triggered by Vercel Cron (see vercel.json), which
 * sends `Authorization: Bearer <CRON_SECRET>`. We reject anything else when a
 * secret is configured, so the endpoint can't be hit by the public.
 */
export async function GET(req: Request) {
  if (env.cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${env.cronSecret}`) {
      return new Response("Unauthorized", { status: 401 });
    }
  }

  try {
    const result = await runDailyReminders();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[cron/reminders] failed", err);
    return new Response("Reminder run failed", { status: 500 });
  }
}
