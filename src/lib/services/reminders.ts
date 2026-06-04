import { addDays, format } from "date-fns";
import { prisma } from "../prisma";
import { toNumber } from "../utils";
import { formatCurrency } from "../currency";
import { sendEmail, emailLayout } from "../notify/email";
import { sendPushToUser } from "../notify/push";
import { hasEmail, hasPush, env } from "../env";

export interface ReminderItem {
  type: "subscription" | "insurance" | "loan";
  name: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
}

const TYPE_LABEL: Record<ReminderItem["type"], string> = {
  subscription: "Subscription",
  insurance: "Insurance",
  loan: "Loan EMI",
};

/**
 * Items due soon for a user:
 *  - subscriptions: within their own remindDaysBefore window
 *  - insurance: within 7 days
 *  - loan EMIs: within 3 days
 */
export async function getUpcomingReminders(userId: string, now = new Date()): Promise<ReminderItem[]> {
  const dayMs = 86_400_000;
  const lowerBound = addDays(now, -1); // include just-passed (today) due dates

  const [subs, insurances, loans] = await Promise.all([
    prisma.subscription.findMany({
      where: { userId, isActive: true, renewalDate: { gte: lowerBound, lte: addDays(now, 60) } },
    }),
    prisma.insurance.findMany({
      where: { userId, isActive: true, renewalDate: { gte: lowerBound, lte: addDays(now, 7) } },
    }),
    prisma.loan.findMany({
      where: { userId, status: "ACTIVE", nextDueDate: { gte: lowerBound, lte: addDays(now, 3) } },
    }),
  ]);

  const items: ReminderItem[] = [];
  const daysUntil = (d: Date) => Math.ceil((d.getTime() - now.getTime()) / dayMs);

  for (const s of subs) {
    const d = daysUntil(s.renewalDate);
    if (d <= s.remindDaysBefore) {
      items.push({ type: "subscription", name: s.name, amount: toNumber(s.cost), dueDate: s.renewalDate.toISOString(), daysUntil: d });
    }
  }
  for (const i of insurances) {
    items.push({ type: "insurance", name: i.name, amount: toNumber(i.premium), dueDate: i.renewalDate.toISOString(), daysUntil: daysUntil(i.renewalDate) });
  }
  for (const l of loans) {
    items.push({ type: "loan", name: l.name, amount: toNumber(l.emiAmount), dueDate: l.nextDueDate.toISOString(), daysUntil: daysUntil(l.nextDueDate) });
  }

  return items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

function whenLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

export interface DigestResult {
  usersChecked: number;
  digestsSent: number;
  emails: number;
  pushes: number;
}

/**
 * Daily reminder digest for every user. Idempotent per user per UTC day via
 * ReminderLog, so re-running the cron won't double-send.
 */
export async function runDailyReminders(now = new Date()): Promise<DigestResult> {
  const today = format(now, "yyyy-MM-dd");
  const result: DigestResult = { usersChecked: 0, digestsSent: 0, emails: 0, pushes: 0 };

  // Only consider users who can actually receive something.
  const users = await prisma.user.findMany({
    where: {
      OR: [{ emailReminders: true }, { pushSubscriptions: { some: {} } }],
    },
    select: { id: true, email: true, name: true, currency: true, emailReminders: true },
  });

  for (const user of users) {
    result.usersChecked += 1;

    // Skip if we've already sent today (dedupe).
    const already = await prisma.reminderLog.findUnique({
      where: { userId_date: { userId: user.id, date: today } },
    });
    if (already) continue;

    const items = await getUpcomingReminders(user.id, now);
    if (items.length === 0) continue;

    const channels: string[] = [];

    // Email
    if (user.emailReminders && hasEmail()) {
      const rows = items
        .map(
          (i) =>
            `<tr><td style="padding:6px 0">${TYPE_LABEL[i.type]} — <b>${i.name}</b><br><span style="color:#6b7280;font-size:13px">due ${whenLabel(i.daysUntil)}</span></td><td style="padding:6px 0;text-align:right;font-weight:600">${formatCurrency(i.amount, user.currency)}</td></tr>`,
        )
        .join("");
      const html = emailLayout(
        `You have ${items.length} upcoming payment${items.length === 1 ? "" : "s"} 🦡`,
        `<table style="width:100%;border-collapse:collapse">${rows}</table>`,
        `${env.app.url}/commitments`,
      );
      const ok = await sendEmail({
        to: user.email,
        toName: user.name,
        subject: `Badger: ${items.length} payment${items.length === 1 ? "" : "s"} coming up`,
        html,
      });
      if (ok) {
        result.emails += 1;
        channels.push("email");
      }
    }

    // Push
    if (hasPush()) {
      const soonest = items[0];
      const sent = await sendPushToUser(user.id, {
        title: `${items.length} upcoming payment${items.length === 1 ? "" : "s"}`,
        body:
          items.length === 1
            ? `${soonest.name} — ${formatCurrency(soonest.amount, user.currency)} due ${whenLabel(soonest.daysUntil)}`
            : `Starting with ${soonest.name}, due ${whenLabel(soonest.daysUntil)}. Tap to review.`,
        url: "/commitments",
      });
      if (sent > 0) {
        result.pushes += sent;
        channels.push("push");
      }
    }

    if (channels.length > 0) {
      await prisma.reminderLog.create({
        data: { userId: user.id, date: today, channels: channels.join(","), itemCount: items.length },
      });
      result.digestsSent += 1;
    }
  }

  return result;
}
