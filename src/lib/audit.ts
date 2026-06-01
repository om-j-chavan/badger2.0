import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./prisma";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Append an audit log entry. Best-effort: failures are swallowed so audit
 * logging can never break a user-facing mutation. Pass a transaction client
 * to keep the log atomic with the mutation it records.
 */
export async function audit(
  userId: string,
  action: string,
  entity: string,
  entityId?: string | null,
  metadata?: Prisma.InputJsonValue,
  db: Db = prisma,
): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        userId,
        action,
        entity,
        entityId: entityId ?? null,
        metadata: metadata ?? undefined,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write log", { action, entity, err });
  }
}
