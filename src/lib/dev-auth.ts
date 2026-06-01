/**
 * Authentication mode switch.
 *
 *   AUTH_MODE = "local"  → self-contained username + password auth with
 *                          cookie-backed sessions. No external service.
 *   AUTH_MODE = "clerk"  → Clerk-hosted auth (set the Clerk env keys).
 *
 * Controlled by NEXT_PUBLIC_AUTH_MODE so both server and client code can read
 * it. Defaults to "clerk" for production safety.
 */
export type AuthMode = "local" | "clerk";

export const AUTH_MODE: AuthMode =
  process.env.NEXT_PUBLIC_AUTH_MODE === "local" ? "local" : "clerk";

export const IS_LOCAL_AUTH = AUTH_MODE === "local";
export const IS_CLERK_AUTH = AUTH_MODE === "clerk";

/** Local-auth session cookie name. Kept here (no server-only deps) so it is
 *  safe to import from Edge middleware as well as server code. */
export const SESSION_COOKIE = "badger_session";
