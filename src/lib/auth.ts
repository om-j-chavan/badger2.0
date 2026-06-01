import { auth, currentUser as clerkCurrentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import type { User } from "@prisma/client";
import { prisma } from "./prisma";
import { env } from "./env";
import { DEFAULT_CATEGORIES } from "./constants";
import { IS_LOCAL_AUTH } from "./dev-auth";
import { getSessionUser } from "./auth-local";

/**
 * Resolve the Badger DB user for the current session. In local-auth mode this
 * reads the session cookie; in Clerk mode it reads the Clerk session and
 * lazily provisions the DB user on first sight. Returns null when there is no
 * authenticated session.
 */
export async function getCurrentUser(): Promise<User | null> {
  if (IS_LOCAL_AUTH) {
    return getSessionUser();
  }

  const { userId: clerkId } = await auth();
  if (!clerkId) return null;

  const existing = await prisma.user.findUnique({ where: { clerkId } });
  if (existing) return existing;

  // First login – provision the user + default categories in one transaction.
  const clerkUser = await clerkCurrentUser();
  const email =
    clerkUser?.emailAddresses?.[0]?.emailAddress ?? `${clerkId}@placeholder.badger`;
  const name =
    [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(" ") || null;

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        clerkId,
        email,
        name,
        avatar: clerkUser?.imageUrl ?? null,
        currency: env.app.defaultCurrency,
        categories: {
          create: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true })),
        },
        gamification: { create: {} },
      },
    });
    return user;
  });
}

/** Require an authenticated, provisioned user or redirect to sign-in. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/**
 * Lightweight variant for server actions / route handlers that should throw
 * (rather than redirect) when unauthenticated.
 */
export async function requireUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) throw new UnauthorizedError();
  return user.id;
}

export class UnauthorizedError extends Error {
  constructor() {
    super("You must be signed in to do that.");
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have access to this resource.") {
    super(message);
    this.name = "ForbiddenError";
  }
}
