# Proxy Authentication Research: Next.js 16 + Neon Auth + Better Auth

> **Date:** February 2026
> **Context:** Stash app (`apps/stash`) using Next.js 16.1.6, React 19, `@neondatabase/auth@0.2.0-beta.1`
> **Trigger:** Runtime error — "An unexpected response was received from the server" — when rendering `<AddItemForm />` on `app/page.tsx`

---

## Table of Contents

1. [The Problem](#the-problem)
2. [Root Cause](#root-cause)
3. [Research Findings](#research-findings)
   - [Next.js 16 Official Guidance](#nextjs-16-official-guidance)
   - [Better Auth Guidance](#better-auth-guidance)
   - [Neon Auth Status](#neon-auth-status)
4. [The Fix](#the-fix)
5. [Security Analysis](#security-analysis)
6. [Cookie Reference](#cookie-reference)
7. [When to Revisit](#when-to-revisit)
8. [References](#references)

---

## The Problem

After migrating to Next.js 16, the stash app started throwing a client-side runtime error:

```
Runtime Error: An unexpected response was received from the server.
app/page.tsx (21:9) @ StashPage
```

The error occurred on initial page load and when invoking server actions (e.g., adding a stash item via `useActionState`). The error was intermittent — it depended on timing, cookie state, and the Neon Auth backend response time.

### Symptoms

- `POST /auth/sign-in 200` appearing in terminal logs immediately before the error
- The error occurred in the React Server Components (RSC) flight client parser
- Server actions returned HTML instead of the expected RSC binary payload

---

## Root Cause

The `proxy.ts` file used `auth.middleware()` from `@neondatabase/auth`, which performs **full remote session validation** on every proxied request:

```typescript
// What auth.middleware() does internally (simplified):
// 1. Reads cookie: __Secure-neon-auth.session_token
// 2. If present → makes remote HTTP call to Neon Auth backend (get-session)
// 3. If session invalid OR cookie missing → returns redirect to /auth/sign-in
```

### Why this breaks RSC

When Next.js performs client-side navigation or invokes a server action, it sends internal requests with special headers:

| Header | Purpose |
|--------|---------|
| `RSC: 1` | React Server Components navigation request |
| `Next-Action` | Server action POST request |

These requests expect an **RSC binary payload** in the response. When `auth.middleware()` intercepted these requests and returned an HTTP redirect (307 to `/auth/sign-in`), the browser followed the redirect (preserving the POST method due to 307 semantics) and received an **HTML page** instead of an RSC payload. The RSC flight client failed to parse this HTML, producing the "unexpected response" error.

### Why the redirect happened to authenticated users

Several factors caused the middleware to fail authentication for users who were actually logged in:

1. **Slow backend response** — The remote `get-session` call took 800-900ms, potentially timing out
2. **Cookie issues** — The `__Secure-` cookie prefix requires HTTPS; localhost `http://` could cause cookies to not be sent
3. **Race conditions** — Session data cookie stale/missing while session token was present

---

## Research Findings

### Next.js 16 Official Guidance

**Source:** [nextjs.org/docs/app/guides/authentication](https://nextjs.org/docs/app/guides/authentication)
**Source:** [nextjs.org/docs/app/getting-started/proxy](https://nextjs.org/docs/app/getting-started/proxy)

Next.js 16 renamed `middleware.ts` to `proxy.ts` and shifted the auth philosophy:

> "Proxy is *not* intended for slow data fetching. While Proxy can be helpful for **optimistic checks** such as permission-based redirects, it should not be used as a full session management or authorization solution."

> "Since Proxy runs on every route, including prefetched routes, it's important to only read the session from the cookie (optimistic checks), and avoid database checks to prevent performance issues."

The official auth guide defines a three-layer architecture:

| Layer | Purpose | Speed |
|-------|---------|-------|
| **proxy.ts** | Optimistic cookie check — redirect if no session cookie exists | Fast (< 1ms, no I/O) |
| **Data Access Layer (DAL)** | Full session validation — decrypt/verify session, check DB | Medium (local crypto + optional DB) |
| **Server Components / Server Actions** | Real auth enforcement — verify permissions, fetch data | Full validation per request |

The official `proxy.ts` example:

```typescript
// From: https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-proxy-optional
import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/app/lib/session';
import { cookies } from 'next/headers';

const protectedRoutes = ['/dashboard'];
const publicRoutes = ['/login', '/signup', '/'];

export default async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.includes(path);
  const isPublicRoute = publicRoutes.includes(path);

  // Local decrypt — no remote calls
  const cookie = (await cookies()).get('session')?.value;
  const session = await decrypt(cookie);

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl));
  }

  if (isPublicRoute && session?.userId && !req.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl));
  }

  return NextResponse.next();
}
```

**Key takeaway:** No remote HTTP calls. Cookie read or local decrypt only.

### Security context (CVE-2025-29927)

Next.js 16's shift away from middleware-based auth was also motivated by CVE-2025-29927, which demonstrated that Edge Runtime middleware authentication could be bypassed under high load. The rename to `proxy.ts` and the default Node.js runtime were part of the response to this vulnerability.

### Layouts vs. Pages for auth

The Next.js docs also warn against relying on layouts for auth:

> "Due to Partial Rendering, be cautious when doing checks in Layouts as these don't re-render on navigation, meaning the user session won't be checked on every route change."

Auth checks should happen in **pages** and **server actions**, not layouts.

### Better Auth Guidance

**Source:** [better-auth.com/docs/integrations/next](https://www.better-auth.com/docs/integrations/next)
*Retrieved via Better Auth MCP on Feb 13, 2026*

Better Auth (the library Neon Auth wraps) explicitly documents two approaches for Next.js 16 `proxy.ts`:

#### Option 1: Full validation (slower, still "not secure")

```typescript
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers()
  });
  // THIS IS NOT SECURE!
  // This is the recommended approach to optimistically redirect users
  // We recommend handling auth checks in each page/route
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  return NextResponse.next();
}
```

#### Option 2: Cookie-only check (recommended for speed)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export async function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);
  // THIS IS NOT SECURE!
  // This is the recommended approach to optimistically redirect users
  // We recommend handling auth checks in each page/route
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}
```

**Key takeaway:** Both approaches are explicitly labeled "THIS IS NOT SECURE" and "We recommend handling auth checks in each page/route." The proxy is a UX convenience for redirecting unauthenticated users early, not a security boundary.

### Neon Auth Status

**Source:** [neon.com/docs/auth/quick-start/nextjs](https://neon.com/docs/auth/quick-start/nextjs)
**Source:** `@neondatabase/auth@0.2.0-beta.1` package source
*Retrieved via Neon MCP on Feb 13, 2026*

Neon Auth's documentation (both UI Components and API Methods quickstarts) still recommends:

```typescript
// proxy.ts
import { auth } from '@/lib/auth/server';

export default auth.middleware({
  loginUrl: '/auth/sign-in',
});
```

This is the pattern that causes the RSC breakage. The `auth.middleware()` function internally:

1. Reads the cookie header for `__Secure-neon-auth.session_token`
2. If present, makes a **remote HTTP call** (`handleAuthProxyRequest` → `get-session`) to the Neon Auth backend
3. If the session is valid, returns `{ action: "allow" }`
4. If invalid or missing, returns `{ action: "redirect_login" }` with a redirect URL

This behavior directly conflicts with Next.js 16's guidance against remote calls in `proxy.ts`.

**Notable:** The `llms.txt` file in the package still references `middleware.ts` instead of `proxy.ts`, and the `NEON_AUTH_SESSION_COOKIE_NAME` constant is only available in the compiled source — it's not exported publicly.

**Status:** Neon Auth is in beta (`0.2.0-beta.1`). This gap is expected to be addressed in a future release.

---

## The Fix

### Before (broken)

```typescript
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";

const authMiddleware = auth.middleware({ loginUrl: "/auth/sign-in" });

export default async function proxy(request: NextRequest) {
  // Workaround: skip RSC and server action requests
  if (
    request.headers.has("Next-Action") ||
    request.headers.get("RSC") === "1"
  ) {
    return NextResponse.next();
  }

  return await authMiddleware(request);
}
```

### After (proper)

```typescript
import { type NextRequest, NextResponse } from "next/server";

const LOGIN_URL = "/auth/sign-in";
const SESSION_COOKIE = "__Secure-neon-auth.session_token";

export default function proxy(request: NextRequest): NextResponse {
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession) {
    return NextResponse.redirect(new URL(LOGIN_URL, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|auth).*)",
  ],
};
```

### What changed

| Aspect | Before | After |
|--------|--------|-------|
| **Session check** | Remote HTTP call via `auth.middleware()` | Local cookie presence check |
| **Latency** | 800-900ms (network round-trip) | < 1ms (cookie read) |
| **RSC compatibility** | Broken (required workaround for RSC/server action headers) | Works natively (no special header checks needed) |
| **Async** | `async function` | Synchronous function |
| **Dependencies** | `@neondatabase/auth`, `@/lib/auth/server`, `@/lib/logger` | `next/server` only |

### Where real auth happens

Auth is already enforced in the proper layers:

- **Server actions** (`app/actions/stash-items.ts`): Each action calls `getInjection("IAuthenticationService").getSession()` and returns `UnauthenticatedError` if no session
- **Server components** (`app/page.tsx`): The page fetches data via controllers that verify auth through the DI container
- **API routes** (`app/(api)/api/auth/[...path]/route.ts`): Auth handler via `auth.handler()`

---

## Security Analysis

**Is removing `auth.middleware()` from proxy safe?**

Yes. The proxy was never a security boundary — it was a UX convenience.

| Concern | Status |
|---------|--------|
| Can unauthenticated users see protected pages? | No — server components and actions verify auth independently |
| Can unauthenticated users invoke server actions? | No — every server action checks `IAuthenticationService.getSession()` |
| Can someone forge the session cookie? | Cookie presence doesn't grant access — the cookie value is validated server-side by `auth.getSession()` in pages/actions |
| What if the cookie is expired? | The optimistic check lets them through, but `auth.getSession()` in the page/action will fail and handle accordingly |

The only behavioral change: users with an expired (but present) cookie will briefly see the page attempt to render before being redirected by the server component, rather than being redirected at the proxy layer. This matches the pattern all three sources recommend.

---

## Cookie Reference

These cookie names come from `@neondatabase/auth` internal constants (not publicly exported):

```
Source: node_modules/@neondatabase/auth/dist/next/server/index.mjs

NEON_AUTH_COOKIE_PREFIX           = "__Secure-neon-auth"
NEON_AUTH_SESSION_COOKIE_NAME     = "__Secure-neon-auth.session_token"
NEON_AUTH_SESSION_DATA_COOKIE_NAME = "__Secure-neon-auth.local.session_data"
NEON_AUTH_SESSION_CHALLENGE_COOKIE_NAME = "__Secure-neon-auth.session_challange"
```

The `__Secure-` prefix is a browser security feature that requires:
- The cookie to be set with `Secure` attribute
- The connection to be HTTPS

**Localhost note:** During development on `http://localhost`, `__Secure-` cookies may not be sent by the browser. This can cause the proxy check to always redirect to sign-in. Use `--experimental-https` or test in a deployed environment.

---

## 2026-09 addendum: refreshing the session cache (hectors-recipes, `@neondatabase/auth@0.5.0-beta`)

The cookie-only proxy left one gap. `auth.getSession()` in a Server Component first reads the signed 5-minute cache cookie (`__Secure-neon-auth.local.session_data`). Once that has expired it asks Neon, and when Neon answers with a refreshed cookie, the SDK tries to set it. Next.js forbids setting cookies while rendering ("Cookies can only be modified in a Server Action or Route Handler"), so `getSession()` threw, the page treated the user as signed out, and every load failed the same way until something else refreshed the cookies. The SDK's Next adapter doesn't catch this (other SSR auth libraries ignore cookie writes from Server Components and rely on middleware), and `createNeonAuth` doesn't accept a custom context.

`apps/hectors-recipes/proxy.ts` now refreshes the cache itself, only when the cache cookie is missing: it calls the app's own `/api/auth/get-session` route (a route handler, which may set cookies), forwards the `Set-Cookie` headers to the browser, and rewrites this request's `cookie` header so the render reads the fresh cache without going to Neon. If the refresh clears the session token it redirects to sign-in; if the call fails it lets the request through as before. That is one extra call per cache lifetime, not per request, and it never redirects RSC requests that have a valid session. `apps/stash/proxy.ts` has the same fix. Tests: `apps/hectors-recipes/tests/proxy.test.ts`, `apps/stash/tests/proxy.test.ts`.

## When to Revisit

- **When `@neondatabase/auth` exits beta** — check if they've updated `auth.middleware()` to handle RSC requests or if they provide a public `getSessionCookie` utility
- **If Neon Auth changes cookie names** — the `__Secure-neon-auth.session_token` name is an internal constant, not a public API. Monitor across version upgrades
- **If Better Auth exposes `getSessionCookie` through Neon Auth** — currently `better-auth/cookies` isn't available as a direct dependency since it's bundled inside `@neondatabase/auth`. If it becomes available, consider using it instead of the hardcoded cookie name
- **If Next.js changes proxy behavior** — unlikely in the near term, but the proxy API could evolve

---

## References

### Next.js 16

- [Proxy documentation](https://nextjs.org/docs/app/getting-started/proxy) — Official proxy.ts guide
- [Authentication guide](https://nextjs.org/docs/app/guides/authentication) — Three-layer auth architecture (proxy → DAL → pages/actions)
- [Optimistic checks with Proxy](https://nextjs.org/docs/app/guides/authentication#optimistic-checks-with-proxy-optional) — Cookie-only pattern
- [Middleware to Proxy migration](https://nextjs.org/docs/messages/middleware-to-proxy) — Codemod and changes
- [Next.js 16 blog post](https://nextjs.org/blog/next-16) — Release announcement
- CVE-2025-29927 — Middleware bypass vulnerability that motivated the proxy redesign

### Better Auth

- [Next.js integration](https://www.better-auth.com/docs/integrations/next) — Two proxy patterns (getSession vs. getSessionCookie)
- [WorkOS migration guide](https://www.better-auth.com/docs/guides/workos-migration-guide) — Same proxy + page-level auth pattern

### Neon Auth

- [Next.js quickstart (UI Components)](https://neon.com/docs/auth/quick-start/nextjs) — Current (beta) docs showing `auth.middleware()`
- [Next.js quickstart (API methods)](https://neon.com/docs/auth/quick-start/nextjs-api-only) — Same `auth.middleware()` pattern
- [AI rules for Neon Auth](https://neon.com/docs/ai/ai-rules-neon-auth) — SDK patterns and common mistakes
- Package: `@neondatabase/auth@0.2.0-beta.1`

### Community

- [Goodbye middleware.ts, Hello proxy.ts](https://www.rabinarayanpatra.com/blogs/hello-proxy-ts-nextjs-16) — Migration guide
- [Next.js 16: What's New for Auth](https://medium.com/@reactjsbd/next-js-16-whats-new-for-authentication-and-authorization-1fed6647cfcc) — Auth architecture analysis
- [Auth0: What's New in Next.js 16](https://auth0.com/blog/whats-new-nextjs-16/) — Third-party perspective
