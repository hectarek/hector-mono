import { type NextRequest, NextResponse } from "next/server";
import { safeRedirect } from "@/app/_lib/safe-redirect";

// Where signed-out visitors start: the welcome screen, which leads to sign-up or sign-in.
const WELCOME_PATH = "/welcome";

// Pages that open signed out too (KTD3, KTD18): a friend link shows A3, which names nobody, and
// makes the two friends once its visitor is in.
// A friend link (A3) and a night's link (D14), and nothing under them; and the privacy policy and
// the terms of use, which Google's consent screen links to.
const OPEN_SIGNED_OUT = [
  /^\/f\/[^/]+\/?$/,
  /^\/n\/[^/]+\/?$/,
  /^\/(privacy|terms)\/?$/,
];

// Primary session cookie set by @neondatabase/auth (Better Auth under the hood), and its
// signed copy, kept a day (lib/auth/server.ts). See: node_modules/@neondatabase/auth/dist/server-*.mjs
const SESSION_COOKIE = "__Secure-neon-auth.session_token";
const SESSION_DATA_COOKIE = "__Secure-neon-auth.local.session_data";

// What Neon Auth adds to the address when it sends someone back from Google: a one-time verifier
// that its own middleware swaps for the session cookies (the SDK's NEON_AUTH_SESSION_VERIFIER_PARAM_NAME).
const OAUTH_VERIFIER_PARAM = "neon_auth_session_verifier";

/**
 * Optimistic auth check — reads the cookie, and only calls the auth server when the
 * session's cached copy has expired (see refreshSessionCache). Recipes' proxy.
 *
 * Next.js 16 guidance: proxy.ts should only perform fast, optimistic checks
 * (cookie presence). Full session validation belongs in Server Components,
 * Server Actions, and Route Handlers where it runs closer to the data.
 *
 * Every signed-out request goes to the welcome screen, except the welcome screen itself and
 * Neon's forms under /auth (the matcher below). Each page that opens signed out (docs/build-plan.md
 * KTD3: the friend and night links, the privacy policy and terms, the service worker, the
 * manifest and icons) adds its own line here, with a proxy test.
 *
 * @see https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-proxy-optional
 * @see https://www.better-auth.com/docs/integrations/next (getSessionCookie pattern)
 * @see docs/proxy-auth-research.md for full context
 */
export default async function proxy(
  request: NextRequest,
): Promise<NextResponse> {
  // Back from Google, with no session cookie yet: the check below would send them to the welcome
  // screen with the verifier unused, and a Google sign-in would never finish (2026-11-23).
  if (request.nextUrl.searchParams.has(OAUTH_VERIFIER_PARAM)) {
    return finishOAuthSignIn(request);
  }
  const signedIn = request.cookies.has(SESSION_COOKIE);
  if (request.nextUrl.pathname === WELCOME_PATH) {
    return signedIn ? pastWelcome(request) : NextResponse.next();
  }
  if (!signedIn) {
    return OPEN_SIGNED_OUT.some((path) => path.test(request.nextUrl.pathname))
      ? NextResponse.next()
      : toWelcome(request);
  }
  if (!request.cookies.has(SESSION_DATA_COOKIE)) {
    return refreshSessionCache(request);
  }
  return NextResponse.next();
}

// Swaps the verifier for the session cookies as Neon's own middleware does (the SDK's
// exchangeOAuthToken: get-session with the verifier and the challenge cookie), through our auth
// route, which passes the address's query on to Neon. Then on to the same page without it. If the
// swap fails, that page finds no session and sends them to the welcome screen.
async function finishOAuthSignIn(request: NextRequest): Promise<NextResponse> {
  const page = request.nextUrl.clone();
  page.searchParams.delete(OAUTH_VERIFIER_PARAM);
  const exchange = new URL("/api/auth/get-session", request.url);
  exchange.search = request.nextUrl.search;
  let setCookies: string[] = [];
  try {
    const response = await fetch(exchange, {
      headers: { cookie: request.headers.get("cookie") ?? "" },
      cache: "no-store",
    });
    if (response.ok) setCookies = response.headers.getSetCookie();
  } catch {
    // Can't reach auth: on to the page, which finds no session.
  }
  const onward = NextResponse.redirect(page);
  for (const cookie of setCookies) onward.headers.append("set-cookie", cookie);
  return onward;
}

function toWelcome(request: NextRequest): NextResponse {
  // Send people back where they were going (e.g. a friend's page) after signing in.
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
 * Runs once per copy lifetime (a day, lib/auth/server.ts), not on every request: it waits on
 * Neon Auth and often on the database waking up, before the page's first byte.
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
    // Route handlers check their own access (the auth route lets sign-in through), and Neon's
    // forms under /auth open signed out. So do the manifest, the icons, the service worker and
    // the link previews (KTD19): a phone and a chat app fetch them without cookies.
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|auth|manifest.webmanifest|icon.svg|apple-icon.png|icons/|sw.js|previews/).*)",
  ],
};
