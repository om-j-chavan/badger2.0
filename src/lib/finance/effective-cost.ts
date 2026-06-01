import type { SubscriptionFrequency } from "@prisma/client";
import { SUBSCRIPTION_FREQUENCY_META } from "../constants";
import { round2 } from "../utils";

/**
 * Effective monthly cost of a distributed expense: total spread across its
 * coverage period.  ₹4000 over 6 months => ₹666.67 / month.
 */
export function distributedMonthlyImpact(totalAmount: number, coverageMonths: number): number {
  if (coverageMonths <= 0) return round2(totalAmount);
  return round2(totalAmount / coverageMonths);
}

/** Normalise any subscription/insurance/membership cadence to a monthly figure. */
export function frequencyToMonthly(cost: number, frequency: SubscriptionFrequency): number {
  const perYear = SUBSCRIPTION_FREQUENCY_META[frequency].perYear;
  return round2((cost * perYear) / 12);
}

/** Annualised figure from a cadence (useful for "yearly burden" widgets). */
export function frequencyToYearly(cost: number, frequency: SubscriptionFrequency): number {
  const perYear = SUBSCRIPTION_FREQUENCY_META[frequency].perYear;
  return round2(cost * perYear);
}

/**
 * Whether a distributed expense is "active" (still within its coverage window)
 * for a given month, and that month's effective contribution.
 */
export function distributedContributionForMonth(params: {
  totalAmount: number;
  coverageMonths: number;
  startDate: Date;
  year: number;
  month1to12: number;
}): number {
  const { totalAmount, coverageMonths, startDate, year, month1to12 } = params;
  const startIndex = startDate.getFullYear() * 12 + startDate.getMonth();
  const targetIndex = year * 12 + (month1to12 - 1);
  const offset = targetIndex - startIndex;
  if (offset < 0 || offset >= coverageMonths) return 0;
  return distributedMonthlyImpact(totalAmount, coverageMonths);
}
