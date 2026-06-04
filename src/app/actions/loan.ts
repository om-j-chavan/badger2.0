"use server";

import { revalidatePath } from "next/cache";
import { addMonths } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/auth";
import { requireOwnership } from "@/lib/ownership";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { loanSchema, loanPaymentSchema, prepaymentSimSchema } from "@/lib/validators";
import { calculateEmi } from "@/lib/finance/emi";
import { simulatePrepayment, type PrepaymentResult } from "@/lib/finance/prepayment";
import { grantBadge, awardXp } from "@/lib/services/gamification";
import { toNumber, round2 } from "@/lib/utils";

function revalidateLoans() {
  ["/loans", "/commitments", "/dashboard"].forEach((p) => revalidatePath(p));
}

export async function createLoan(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = loanSchema.parse(input);

    const emi =
      data.emiAmount && data.emiAmount > 0
        ? data.emiAmount
        : calculateEmi(data.principalAmount, data.interestRate, data.tenureMonths);

    // Outstanding balance = principal minus whatever has already been repaid,
    // so loans you're partway through are tracked accurately from day one.
    const remaining = Math.max(0, data.principalAmount - (data.amountPaid ?? 0));
    const fullyPaid = remaining <= 0.5;

    const loan = await prisma.loan.create({
      data: {
        userId,
        name: data.name,
        lender: data.lender ?? null,
        type: data.type,
        principalAmount: data.principalAmount,
        interestRate: data.interestRate,
        tenureMonths: data.tenureMonths,
        startDate: data.startDate,
        emiAmount: emi,
        remainingPrincipal: remaining,
        nextDueDate: addMonths(data.startDate, 1),
        status: fullyPaid ? "CLOSED" : "ACTIVE",
      },
    });
    await audit(userId, "loan.create", "Loan", loan.id, { principal: data.principalAmount });
    await awardXp(userId, 15);
    revalidateLoans();
    return { id: loan.id };
  });
}

export async function deleteLoan(id: string): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    await requireOwnership("loan", id, userId);
    await prisma.loan.delete({ where: { id } });
    await audit(userId, "loan.delete", "Loan", id);
    revalidateLoans();
    return { id };
  });
}

/**
 * Record a loan payment. Splits the payment into interest (on the current
 * balance) and principal, decrements the remaining principal, advances the
 * next due date, and closes the loan when fully paid.
 */
export async function recordLoanPayment(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = loanPaymentSchema.parse(input);
    await requireOwnership("loan", data.loanId, userId);

    const result = await prisma.$transaction(async (tx) => {
      const loan = await tx.loan.findUniqueOrThrow({ where: { id: data.loanId } });
      const balance = toNumber(loan.remainingPrincipal);
      const monthlyRate = toNumber(loan.interestRate) / 12 / 100;

      const interestPart = data.isPrepayment ? 0 : round2(balance * monthlyRate);
      let principalPart = round2(data.amount - interestPart);
      if (principalPart < 0) principalPart = 0;
      if (principalPart > balance) principalPart = balance;

      const newBalance = round2(balance - principalPart);
      const closed = newBalance <= 0.5;

      const payment = await tx.loanPayment.create({
        data: {
          userId,
          loanId: data.loanId,
          date: data.date,
          amount: data.amount,
          principalPart,
          interestPart,
          isPrepayment: data.isPrepayment,
          note: data.note ?? null,
        },
      });

      await tx.loan.update({
        where: { id: data.loanId },
        data: {
          remainingPrincipal: closed ? 0 : newBalance,
          status: closed ? "CLOSED" : "ACTIVE",
          nextDueDate: closed ? loan.nextDueDate : addMonths(loan.nextDueDate, 1),
        },
      });

      await audit(userId, "loan.payment", "Loan", data.loanId, { amount: data.amount }, tx);
      return { paymentId: payment.id, closed };
    });

    if (result.closed) await grantBadge(userId, "debt_crusher");
    await awardXp(userId, 10);
    revalidateLoans();
    return { id: result.paymentId };
  });
}

export async function simulateLoanPrepayment(
  input: unknown,
): Promise<ActionResult<PrepaymentResult>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = prepaymentSimSchema.parse(input);
    await requireOwnership("loan", data.loanId, userId);

    const loan = await prisma.loan.findUniqueOrThrow({ where: { id: data.loanId } });
    return simulatePrepayment({
      remainingPrincipal: toNumber(loan.remainingPrincipal),
      annualRatePct: toNumber(loan.interestRate),
      emi: toNumber(loan.emiAmount),
      extraMonthly: data.extraMonthly,
      lumpSum: data.lumpSum,
    });
  });
}
