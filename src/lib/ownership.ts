import { prisma } from "./prisma";
import { ForbiddenError } from "./auth";

/**
 * Models that carry a `userId` ownership column. Used by `requireOwnership`
 * to assert that a record belongs to the acting user before mutation.
 */
type OwnedModel =
  | "account"
  | "category"
  | "expense"
  | "recurringExpense"
  | "distributedExpense"
  | "subscription"
  | "loan"
  | "loanPayment"
  | "insurance"
  | "membership"
  | "budget"
  | "goal"
  | "goalContribution";

/**
 * Verify that `id` exists and is owned by `userId`. Throws ForbiddenError
 * otherwise. Returns nothing – callers should re-query within their txn.
 */
export async function requireOwnership(
  model: OwnedModel,
  id: string,
  userId: string,
): Promise<void> {
  // @ts-expect-error – dynamic delegate access is safe for the listed models.
  const record = await prisma[model].findUnique({
    where: { id },
    select: { userId: true },
  });
  if (!record) throw new ForbiddenError("That item could not be found.");
  if (record.userId !== userId) {
    throw new ForbiddenError();
  }
}

/** Returns a reusable `where` clause scoping queries to a user. */
export function ownedBy(userId: string) {
  return { userId };
}
