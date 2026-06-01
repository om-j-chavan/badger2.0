import {
  addDays,
  addMonths,
  addQuarters,
  addWeeks,
  addYears,
  endOfMonth,
  startOfMonth,
} from "date-fns";
import type { RecurrenceFrequency, SubscriptionFrequency } from "@prisma/client";

export function monthRange(year: number, month1to12: number) {
  const start = startOfMonth(new Date(year, month1to12 - 1, 1));
  const end = endOfMonth(start);
  return { start, end };
}

export function currentMonthRange(now = new Date()) {
  return { start: startOfMonth(now), end: endOfMonth(now) };
}

/** Advance a date by one recurrence step. */
export function advanceRecurrence(
  date: Date,
  frequency: RecurrenceFrequency,
  intervalCount = 1,
): Date {
  switch (frequency) {
    case "DAILY":
      return addDays(date, 1);
    case "WEEKLY":
      return addWeeks(date, 1);
    case "MONTHLY":
      return addMonths(date, 1);
    case "QUARTERLY":
      return addQuarters(date, 1);
    case "YEARLY":
      return addYears(date, 1);
    case "CUSTOM":
      return addDays(date, Math.max(1, intervalCount));
  }
}

/** Advance a subscription/insurance renewal date by one cycle. */
export function advanceSubscription(date: Date, frequency: SubscriptionFrequency): Date {
  switch (frequency) {
    case "WEEKLY":
      return addWeeks(date, 1);
    case "MONTHLY":
      return addMonths(date, 1);
    case "QUARTERLY":
      return addQuarters(date, 1);
    case "YEARLY":
      return addYears(date, 1);
  }
}

/** Roll a (possibly past) renewal date forward until it is in the future. */
export function nextFutureRenewal(
  renewalDate: Date,
  frequency: SubscriptionFrequency,
  now = new Date(),
): Date {
  let next = new Date(renewalDate);
  let guard = 0;
  while (next < now && guard < 1000) {
    next = advanceSubscription(next, frequency);
    guard += 1;
  }
  return next;
}

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
