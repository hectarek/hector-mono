import { type NextRequest, NextResponse } from "next/server";
import { safeRedirect } from "@/app/_lib/safe-redirect";

// Where signed-out visitors start: the welcome screen, which leads to sign-up or sign-in.
const WELCOME_PATH = "/welcome";

// Primary session cookie set by @neondatabase/auth (Better Auth under the hood), and its
// signed 5-minute cache. See: node_modules/@neondatabase/auth/dist/server-*.mjs
const SESSION_COOKIE = "__Secure-neon-auth.session_token";
const SESSION_DATA_COOKIE = "__Secure-neon-auth.local.session_data";

/**
 * Optimistic auth check — reads the cookie, and only calls the auth server when the
 * session's 5-minute cache has expired (see refreshSessionCache).
 *
 * Next.js 16 guidance: proxy.ts should only perform fast, optimistic checks
 * (cookie presence). Full session validation belongs in Server Components,
 * Server Actions, and Route Handlers where it runs closer to the data.
 *
 * @see https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-proxy-optional
 * @see https://www.better-auth.com/docs/integrations/next (getSessionCookie pattern)
 * @see docs/proxy-auth-research.md for full context
 */
export default async function proxy(
  request: NextRequest,
): Promise<NextResponse> {
  const signedIn = request.cookies.has(SESSION_COOKIE);
  if (request.nextUrl.pathname === WELCOME_PATH) {
    return signedIn ? pastWelcome(request) : NextResponse.next();
  }
  if (!signedIn) {
    return toWelcome(request);
  }
  if (!request.cookies.has(SESSION_DATA_COOKIE)) {
    return refreshSessionCache(request);
  }
  return NextResponse.next();
}

function toWelcome(request: NextRequest): NextResponse {
  // Send people back where they were going (e.g. an invite link) after signing in.
  // Built from this request's own path, so it can only ever point inside the app.
  const welcomeUrl = new URL(WELCOME_PATH, request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname !== "/" || search) {
    welcomeUrl.searchParams.set("redirectTo", `${pathname}${search}`);
  }
  return NextResponse.redirect(welcomeUrl);
}

// Someone signed in who lands on the welcome screen (e.g. Back after signing in) goes on
// to where they were headed. A cookie check only, like the rest of the proxy: if the
// session turns out to be dead, the next request refreshes it and comes back here.
function pastWelcome(request: NextRequest): NextResponse {
  const target = safeRedirect(
    request.nextUrl.searchParams.get("redirectTo") ?? undefined,
  );
  return NextResponse.redirect(new URL(target, request.url));
}

/**
 * The session's cached copy has expired. Pages can't write cookies, so when their
 * getSession() went to Neon and got a refreshed cookie back, it threw ("Cookies can
 * only be modified in a Server Action or Route Handler") and the page failed as
 * signed out, on every load. Refresh it here instead, through our own auth route (a
 * route handler, which may set cookies): the browser gets the new cookies, and so does
 * this request's render, which then reads the fresh cache without going to Neon.
 * Runs about once per cache lifetime (5 minutes), not on every request.
 */
async function refreshSessionCache(
  request: NextRequest,
): Promise<NextResponse> {
  let setCookies: string[];
  try {
    const response = await fetch(
      new URL("/api/auth/get-session", request.url),
      {
        headers: { cookie: request.headers.get("cookie") ?? "" },
        cache: "no-store",
      },
    );
    setCookies = response.headers.getSetCookie();
  } catch {
    // Can't reach auth: let the page decide, as before this refresh existed.
    return NextResponse.next();
  }

  const cookies = new Map(
    request.cookies.getAll().map(({ name, value }) => [name, value]),
  );
  for (const header of setCookies) {
    const [pair = "", ...attributes] = header.split(";");
    const split = pair.indexOf("=");
    const name = pair.slice(0, split).trim();
    const value = pair.slice(split + 1).trim();
    const cleared =
      value === "" ||
      attributes.some((attribute) =>
        /^\s*max-age\s*=\s*0\s*$/i.test(attribute),
      );
    if (cleared) cookies.delete(name);
    else cookies.set(name, value);
  }

  const response = cookies.has(SESSION_COOKIE)
    ? NextResponse.next({
        request: {
          headers: withCookies(request.headers, cookies),
        },
      })
    : toWelcome(request);
  for (const header of setCookies) {
    response.headers.append("set-cookie", header);
  }
  return response;
}

function withCookies(headers: Headers, cookies: Map<string, string>): Headers {
  const next = new Headers(headers);
  next.set(
    "cookie",
    [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
  );
  return next;
}

export const config = {
  matcher: [
    // The manifest and icons must load signed out: browsers fetch them without cookies
    // when installing to the home screen.
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|sitemap.xml|robots.txt|auth|manifest.webmanifest|apple-icon|pwa-icon).*)",
  ],
};
