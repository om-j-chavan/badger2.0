"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { DEFAULT_CATEGORIES } from "@/lib/constants";
import { audit } from "@/lib/audit";
import { runAction, type ActionResult } from "@/lib/action-result";
import { requireUserId } from "@/lib/auth";
import {
  hashPassword,
  verifyPassword,
  createSession,
  destroySession,
  SESSION_COOKIE,
} from "@/lib/auth-local";
import { cookies } from "next/headers";

const signUpSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "At least 3 characters")
    .max(30)
    .regex(/^[a-zA-Z0-9_.-]+$/, "Letters, numbers, . _ - only"),
  email: z.string().trim().email("Enter a valid email"),
  name: z.string().trim().max(80).optional(),
  password: z.string().min(8, "At least 8 characters").max(200),
});

const signInSchema = z.object({
  identifier: z.string().trim().min(1, "Enter your username or email"),
  password: z.string().min(1, "Enter your password"),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "At least 8 characters").max(200),
});

export async function signUpLocal(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const data = signUpSchema.parse(input);
    const username = data.username.toLowerCase();
    const email = data.email.toLowerCase();

    const clash = await prisma.user.findFirst({
      where: { OR: [{ username }, { email }] },
      select: { username: true, email: true },
    });
    if (clash?.username === username) throw new Error("That username is taken.");
    if (clash?.email === email) throw new Error("That email is already registered.");

    const passwordHash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        username,
        email,
        name: data.name || null,
        passwordHash,
        currency: env.app.defaultCurrency,
        categories: { create: DEFAULT_CATEGORIES.map((c) => ({ ...c, isDefault: true })) },
        gamification: { create: {} },
      },
    });

    await createSession(user.id);
    await audit(user.id, "auth.signup", "User", user.id);
    return { id: user.id };
  });
}

export async function signInLocal(input: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const data = signInSchema.parse(input);
    const identifier = data.identifier.toLowerCase();

    const user = await prisma.user.findFirst({
      where: { OR: [{ username: identifier }, { email: identifier }] },
    });
    // Constant-ish failure path: don't reveal whether the account exists.
    if (!user || !user.passwordHash) {
      throw new Error("Incorrect username or password.");
    }
    const valid = await verifyPassword(data.password, user.passwordHash);
    if (!valid) throw new Error("Incorrect username or password.");

    await createSession(user.id);
    await audit(user.id, "auth.signin", "User", user.id);
    return { id: user.id };
  });
}

export async function signOutLocal(): Promise<void> {
  await destroySession();
  redirect("/");
}

/**
 * Change the signed-in user's password (local auth only). Verifies the current
 * password, stores a new hash, and revokes all *other* sessions so any other
 * devices are logged out — while keeping the current session alive.
 */
export async function changePasswordLocal(input: unknown): Promise<ActionResult<{ ok: true }>> {
  return runAction(async () => {
    const userId = await requireUserId();
    const data = changePasswordSchema.parse(input);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    if (!user.passwordHash) {
      throw new Error("Password changes aren't available for this account.");
    }
    const valid = await verifyPassword(data.currentPassword, user.passwordHash);
    if (!valid) throw new Error("Your current password is incorrect.");
    if (await verifyPassword(data.newPassword, user.passwordHash)) {
      throw new Error("Your new password must be different from the current one.");
    }

    const passwordHash = await hashPassword(data.newPassword);
    const jar = await cookies();
    const currentToken = jar.get(SESSION_COOKIE)?.value;

    await prisma.$transaction([
      prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Revoke every other session for safety.
      prisma.session.deleteMany({
        where: { userId, ...(currentToken ? { NOT: { sessionToken: currentToken } } : {}) },
      }),
    ]);

    await audit(userId, "auth.change_password", "User", userId);
    return { ok: true as const };
  });
}
