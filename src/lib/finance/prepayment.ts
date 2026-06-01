import { addMonths } from "date-fns";
import { round2 } from "../utils";
import { buildSchedule, summarizeSchedule } from "./emi";

export interface PrepaymentResult {
  baseline: {
    months: number;
    totalInterest: number;
    totalPaid: number;
    payoffDate: string;
  };
  withPrepayment: {
    months: number;
    totalInterest: number;
    totalPaid: number;
    payoffDate: string;
  };
  interestSaved: number;
  monthsSaved: number;
}

/**
 * Compare the baseline payoff of a loan against a scenario with extra monthly
 * payments and/or a one-time lump sum. Operates on the *remaining* balance.
 */
export function simulatePrepayment(params: {
  remainingPrincipal: number;
  annualRatePct: number;
  emi: number;
  extraMonthly?: number;
  lumpSum?: number;
  from?: Date;
}): PrepaymentResult {
  const {
    remainingPrincipal,
    annualRatePct,
    emi,
    extraMonthly = 0,
    lumpSum = 0,
    from = new Date(),
  } = params;

  const baseRows = buildSchedule({ principal: remainingPrincipal, annualRatePct, emi });
  const base = summarizeSchedule(baseRows);

  const prepayRows = buildSchedule({
    principal: remainingPrincipal,
    annualRatePct,
    emi,
    extraMonthly,
    lumpSum,
    lumpSumMonth: 1,
  });
  const prepay = summarizeSchedule(prepayRows);

  return {
    baseline: {
      months: base.months,
      totalInterest: base.totalInterest,
      totalPaid: base.totalPaid,
      payoffDate: addMonths(from, base.months).toISOString(),
    },
    withPrepayment: {
      months: prepay.months,
      totalInterest: prepay.totalInterest,
      totalPaid: prepay.totalPaid,
      payoffDate: addMonths(from, prepay.months).toISOString(),
    },
    interestSaved: round2(base.totalInterest - prepay.totalInterest),
    monthsSaved: base.months - prepay.months,
  };
}
