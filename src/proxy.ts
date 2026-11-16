import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Kept in step with SESSION_COOKIE in lib/auth/session. Not imported, so the
// proxy stays free of database code.
const SESSION_COOKIE = "lumenai_session";

const PUBLIC_PAGES = new Set([
  "/",
  "/book-a-demo",
  "/login",
  "/signup",
  "/accept-invite",
  "/forgot-password",
  "/reset-password",
  // What a phone reads to add LumenAI to its home screen.
  "/manifest.webmanifest",
]);
// The scheduled clean-up has no session; it checks its own secret.
const PUBLIC_API = ["/api/auth/", "/api/demo-requests", "/api/cron/"];
// Editor preview links: the page checks the link's secret itself.
const PUBLIC_PREFIXES = ["/preview/", "/icons/"];

/**
 * First gate: no session cookie, no entry. The cookie is checked against the
 * database by the app layout and by each API route, so a made-up cookie gets
 * past here but no further.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (
    PUBLIC_PAGES.has(pathname) ||
    [...PUBLIC_API, ...PUBLIC_PREFIXES].some((prefix) => pathname.startsWith(prefix))
  ) {
    return NextResponse.next();
  }
  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Signed out. Sign in again." }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
