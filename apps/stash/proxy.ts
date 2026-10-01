import { type NextRequest, NextResponse } from "next/server";

const LOGIN_URL = "/auth/sign-in";

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
  if (!request.cookies.has(SESSION_COOKIE)) {
    return toSignIn(request);
  }
  if (!request.cookies.has(SESSION_DATA_COOKIE)) {
    return refreshSessionCache(request);
  }
  return NextResponse.next();
}

function toSignIn(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL(LOGIN_URL, request.url));
}

/**
 * The session's cached copy has expired. Pages can't write cookies, so when their
 * getSession() went to Neon and got a refreshed cookie back, it threw ("Cookies can
 * only be modified in a Server Action or Route Handler") and the page failed as
 * signed out, on every load. Refresh it here instead, through our own auth route (a
 * route handler, which may set cookies): the browser gets the new cookies, and so does
 * this request's render, which then reads the fresh cache without going to Neon.
 * Runs about once per cache lifetime (5 minutes), not on every request.
 * Same as apps/hectors-recipes/proxy.ts.
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
    : toSignIn(request);
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
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|auth).*)",
  ],
};
