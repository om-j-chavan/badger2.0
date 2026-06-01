import type { Prisma, PrismaClient } from "@prisma/client";
import { differenceInCalendarDays, isSameDay, startOfDay } from "date-fns";
import { prisma } from "../prisma";
import { LEVELS } from "../constants";

type Db = PrismaClient | Prisma.TransactionClient;

export function levelForXp(xp: number) {
  let current: (typeof LEVELS)[number] = LEVELS[0];
  for (const lvl of LEVELS) {
    if (xp >= lvl.minXp) current = lvl;
  }
  const next = LEVELS.find((l) => l.minXp > xp) ?? null;
  return {
    level: current.level,
    name: current.name,
    xp,
    nextLevelXp: next?.minXp ?? null,
    nextLevelName: next?.name ?? null,
    progressToNext: next
      ? Math.round(((xp - current.minXp) / (next.minXp - current.minXp)) * 100)
      : 100,
  };
}

/** Award XP and recompute level. Safe to call inside a transaction. */
export async function awardXp(userId: string, amount: number, db: Db = prisma) {
  const gam = await db.gamification.upsert({
    where: { userId },
    create: { userId, xp: amount },
    update: { xp: { increment: amount } },
  });
  const computed = levelForXp(gam.xp);
  if (computed.level !== gam.level) {
    await db.gamification.update({ where: { userId }, data: { level: computed.level } });
  }
  return computed;
}

/** Grant a badge by key if the user doesn't already have it. Returns true if newly awarded. */
export async function grantBadge(userId: string, badgeKey: string, db: Db = prisma): Promise<boolean> {
  const badge = await db.badge.findUnique({ where: { key: badgeKey } });
  if (!badge) return false;
  const existing = await db.userBadge.findUnique({
    where: { userId_badgeId: { userId, badgeId: badge.id } },
  });
  if (existing) return false;
  await db.userBadge.create({ data: { userId, badgeId: badge.id } });
  await awardXp(userId, 50, db);
  return true;
}

/**
 * Update a streak when an activity happens "today". Resets if a day was missed.
 */
export async function bumpStreak(userId: string, kind: string, when = new Date(), db: Db = prisma) {
  const today = startOfDay(when);
  const streak = await db.streak.findUnique({ where: { userId_kind: { userId, kind } } });

  if (!streak) {
    return db.streak.create({
      data: { userId, kind, current: 1, longest: 1, lastDate: today },
    });
  }

  if (streak.lastDate && isSameDay(streak.lastDate, today)) {
    return streak; // already counted today
  }

  const gap = streak.lastDate ? differenceInCalendarDays(today, streak.lastDate) : 999;
  const current = gap === 1 ? streak.current + 1 : 1;
  const longest = Math.max(streak.longest, current);

  return db.streak.update({
    where: { userId_kind: { userId, kind } },
    data: { current, longest, lastDate: today },
  });
}
