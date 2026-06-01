import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse, type NextRequest } from "next/server";
import { IS_LOCAL_AUTH, SESSION_COOKIE } from "@/lib/dev-auth";

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
]);

/**
 * Local-auth gate (Edge-safe): redirect unauthenticated users to /sign-in for
 * app routes. Only checks for the presence of the session cookie here — the
 * cookie is fully validated against the DB in getCurrentUser. API routes are
 * left to their own handlers (which return 401 rather than an HTML redirect).
 */
function localMiddleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic =
    pathname === "/" ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/sign-up") ||
    pathname.startsWith("/api");

  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (!isPublic && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("redirect_url", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

// Ternary only evaluates the chosen branch, so Clerk's middleware is never
// constructed in local mode (and no Clerk keys are required).
export default IS_LOCAL_AUTH
  ? localMiddleware
  : clerkMiddleware(async (auth, req) => {
      if (!isPublicRoute(req)) await auth.protect();
      return NextResponse.next();
    });

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
