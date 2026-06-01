import { z } from "zod";
import { ForbiddenError, UnauthorizedError } from "./auth";

export type ActionResult<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(
  error: string,
  fieldErrors?: Record<string, string[] | undefined>,
): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/**
 * Wrap a server-action body so thrown errors become typed ActionResults
 * instead of unhandled exceptions. Handles Zod, auth, and unknown errors.
 */
export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  try {
    return ok(await fn());
  } catch (err) {
    if (err instanceof z.ZodError) {
      return fail("Please check the highlighted fields.", err.flatten().fieldErrors);
    }
    if (err instanceof UnauthorizedError) return fail(err.message);
    if (err instanceof ForbiddenError) return fail(err.message);
    if (err instanceof Error) {
      console.error("[action] error", err);
      return fail(err.message || "Something went wrong.");
    }
    console.error("[action] unknown error", err);
    return fail("Something went wrong.");
  }
}
