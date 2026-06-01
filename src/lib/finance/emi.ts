import { round2 } from "../utils";

/**
 * Standard reducing-balance EMI.
 *
 *   EMI = P * r * (1+r)^n / ((1+r)^n - 1)
 *
 * where r = monthly interest rate (annualRate / 12 / 100), n = tenure months.
 * Handles the 0% interest edge case (straight-line repayment).
 */
export function calculateEmi(
  principal: number,
  annualRatePct: number,
  tenureMonths: number,
): number {
  if (principal <= 0 || tenureMonths <= 0) return 0;
  const r = annualRatePct / 12 / 100;
  if (r === 0) return round2(principal / tenureMonths);
  const factor = Math.pow(1 + r, tenureMonths);
  return round2((principal * r * factor) / (factor - 1));
}

export interface AmortizationRow {
  month: number;
  emi: number;
  principalPart: number;
  interestPart: number;
  balance: number;
}

/**
 * Build a full amortization schedule. Optionally apply recurring extra monthly
 * payments and/or a one-time lump sum at a given month (used by the simulator).
 */
export function buildSchedule(params: {
  principal: number;
  annualRatePct: number;
  emi: number;
  extraMonthly?: number;
  lumpSum?: number;
  lumpSumMonth?: number;
  maxMonths?: number;
}): AmortizationRow[] {
  const {
    principal,
    annualRatePct,
    emi,
    extraMonthly = 0,
    lumpSum = 0,
    lumpSumMonth = 1,
    maxMonths = 1200,
  } = params;

  const r = annualRatePct / 12 / 100;
  const rows: AmortizationRow[] = [];
  let balance = principal;
  let month = 0;

  while (balance > 0.01 && month < maxMonths) {
    month += 1;
    const interestPart = round2(balance * r);
    let payment = emi + extraMonthly;
    if (month === lumpSumMonth) payment += lumpSum;

    // Never pay more than the outstanding balance + this month's interest.
    const maxPayment = round2(balance + interestPart);
    if (payment > maxPayment) payment = maxPayment;

    let principalPart = round2(payment - interestPart);
    if (principalPart > balance) principalPart = balance;
    balance = round2(balance - principalPart);

    rows.push({
      month,
      emi: round2(payment),
      principalPart,
      interestPart,
      balance: balance < 0 ? 0 : balance,
    });
  }
  return rows;
}

export interface LoanSummary {
  totalPaid: number;
  totalInterest: number;
  months: number;
  payoffMonthIndex: number; // months from start
}

export function summarizeSchedule(rows: AmortizationRow[]): LoanSummary {
  const totalPaid = round2(rows.reduce((s, r) => s + r.emi, 0));
  const totalInterest = round2(rows.reduce((s, r) => s + r.interestPart, 0));
  return {
    totalPaid,
    totalInterest,
    months: rows.length,
    payoffMonthIndex: rows.length,
  };
}

/**
 * Progress metrics for an active loan given its current remaining principal.
 */
export function loanProgress(params: {
  principal: number;
  remainingPrincipal: number;
  emi: number;
  annualRatePct: number;
}) {
  const { principal, remainingPrincipal, emi, annualRatePct } = params;
  const paidPrincipal = round2(principal - remainingPrincipal);
  const percentComplete = principal > 0 ? round2((paidPrincipal / principal) * 100) : 0;

  // Remaining tenure from the outstanding balance at the current EMI.
  const remainingRows = buildSchedule({
    principal: remainingPrincipal,
    annualRatePct,
    emi,
  });
  const remaining = summarizeSchedule(remainingRows);

  return {
    paidPrincipal,
    percentComplete,
    remainingMonths: remaining.months,
    remainingInterest: remaining.totalInterest,
    remainingTotal: round2(remaining.totalPaid),
  };
}
