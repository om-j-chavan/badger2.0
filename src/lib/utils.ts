import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Round to 2 decimals, returning a Number (money-safe enough for display math). */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Clamp a number into [min, max]. */
export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** Safely coerce a Prisma Decimal | number | string to a JS number. */
export function toNumber(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value) || 0;
  // Prisma.Decimal exposes toNumber()/toString()
  const anyVal = value as { toNumber?: () => number; toString?: () => string };
  if (typeof anyVal.toNumber === "function") return anyVal.toNumber();
  if (typeof anyVal.toString === "function") return Number(anyVal.toString()) || 0;
  return 0;
}

export function pct(part: number, whole: number): number {
  if (!whole) return 0;
  return round2((part / whole) * 100);
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[\s_]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function initials(name?: string | null): string {
  if (!name) return "🦡";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p.charAt(0).toUpperCase())
    .join("");
}
