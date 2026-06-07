import { addDays, differenceInCalendarDays, format } from "date-fns";
import { prisma } from "../prisma";
import { toNumber } from "../utils";
import { formatCurrency } from "../currency";
import { sendEmail, emailLayout } from "../notify/email";
import { sendPushToUser } from "../notify/push";
import { hasEmail, hasPush, env } from "../env";

export interface ReminderItem {
  type: "subscription" | "insurance" | "loan" | "membership";
  name: string;
  amount: number;
  dueDate: string;
  daysUntil: number;
}

const TYPE_LABEL: Record<ReminderItem["type"], string> = {
  subscription: "Subscription",
  insurance: "Insurance",
  loan: "Loan EMI",
  membership: "Membership",
};

/**
 * Days-before a payment that trigger a reminder: 5 days ahead, and on the day.
 */
export const REMINDER_OFFSETS = [5, 0];

/**
 * Payments that hit a reminder offset (T-5 or due-day) for a user, across
 * loan EMIs, subscriptions, insurance and memberships. Uses calendar-day
 * difference so the time-of-day a record was created doesn't matter.
 */
export async function getUpcomingReminders(userId: string, now = new Date()): Promise<ReminderItem[]> {
  // Pull anything due within the next ~6 days, then keep only T-5 and T-0.
  const lo = addDays(now, -1);
  const hi = addDays(now, 6);

  const [subs, insurances, loans, memberships] = await Promise.all([
    prisma.subscription.findMany({ where: { userId, isActive: true, renewalDate: { gte: lo, lte: hi } } }),
    prisma.insurance.findMany({ where: { userId, isActive: true, renewalDate: { gte: lo, lte: hi } } }),
    prisma.loan.findMany({ where: { userId, status: "ACTIVE", nextDueDate: { gte: lo, lte: hi } } }),
    prisma.membership.findMany({ where: { userId, isActive: true, renewalDate: { gte: lo, lte: hi } } }),
  ]);

  const items: ReminderItem[] = [];
  const push = (type: ReminderItem["type"], name: string, amount: number, due: Date) => {
    const daysUntil = differenceInCalendarDays(due, now);
    if (REMINDER_OFFSETS.includes(daysUntil)) {
      items.push({ type, name, amount, dueDate: due.toISOString(), daysUntil });
    }
  };

  for (const s of subs) push("subscription", s.name, toNumber(s.cost), s.renewalDate);
  for (const i of insurances) push("insurance", i.name, toNumber(i.premium), i.renewalDate);
  for (const l of loans) push("loan", l.name, toNumber(l.emiAmount), l.nextDueDate);
  for (const m of memberships) push("membership", m.name, toNumber(m.cost), m.renewalDate);

  return items.sort((a, b) => a.daysUntil - b.daysUntil);
}

function whenLabel(daysUntil: number): string {
  if (daysUntil <= 0) return "today";
  if (daysUntil === 1) return "tomorrow";
  return `in ${daysUntil} days`;
}

/**
 * Build an iCalendar (.ics) file with an all-day event per upcoming payment,
 * each with a reminder alarm. Attaching this to the email lets the user add
 * the payments to Google/Apple/Outlook calendar in one tap.
 */
function buildReminderIcs(items: ReminderItem[], currency: string): string {
  const stamp = format(new Date(), "yyyyMMdd'T'HHmmss'Z'");
  const esc = (s: string) => s.replace(/([,;\\])/g, "\\$1").replace(/\n/g, "\\n");

  const events = items
    .map((i) => {
      const due = new Date(i.dueDate);
      const start = format(due, "yyyyMMdd");
      const end = format(addDays(due, 1), "yyyyMMdd");
      const uid = `${i.type}-${i.name}-${start}`.replace(/[^a-zA-Z0-9-]/g, "") + "@badger";
      const title = `Pay ${i.name} (${formatCurrency(i.amount, currency)})`;
      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${start}`,
        `DTEND;VALUE=DATE:${end}`,
        `SUMMARY:${esc(title)}`,
        `DESCRIPTION:${esc(`${TYPE_LABEL[i.type]} payment due. Logged in Badger.`)}`,
        "BEGIN:VALARM",
        "TRIGGER:-P1D",
        "ACTION:DISPLAY",
        "DESCRIPTION:Payment reminder",
        "END:VALARM",
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Badger//Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    events,
    "END:VCALENDAR",
  ].join("\r\n");
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
      const ics = buildReminderIcs(items, user.currency);
      const ok = await sendEmail({
        to: user.email,
        toName: user.name,
        subject: `Badger: ${items.length} payment${items.length === 1 ? "" : "s"} coming up`,
        html,
        attachments: [
          { name: "badger-reminders.ics", content: Buffer.from(ics, "utf8").toString("base64") },
        ],
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
