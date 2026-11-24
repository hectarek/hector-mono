---
title: A Google sign-in ended on the welcome screen until the proxy swapped Neon Auth's verifier
date: 2026-11-23
category: integration-issues
module: "apps/community-game-library, and any app here on recipes' proxy that adds Google or another social sign-in"
problem_type: integration_issue
component: authentication
symptoms:
  - "Signing in or making an account with Google creates the user in Neon Auth, then ends on the welcome screen, signed out"
  - "The address back from Google carries neon_auth_session_verifier, and the proxy sends it on to /welcome?redirectTo=/?neon_auth_session_verifier=..."
  - "Email and password sign-in works on the same deployment"
root_cause: missing_workflow_step
resolution_type: code_fix
severity: high
framework_version: "@neondatabase/auth 0.7.0-beta, @neondatabase/auth-ui 0.4.0-beta"
retire_when: "Neon's sign-in kit sends a social sign-in's return to a route the app's proxy already lets through, or @neondatabase/auth stops returning with neon_auth_session_verifier; check ProviderButton's getCallbackURL in @neondatabase/auth-ui and exchangeOAuthToken in @neondatabase/auth"
related_components: [infrastructure]
tags: [neon-auth, better-auth, google-sign-in, oauth, proxy, session-verifier, trusted-domains]
---

# A Google sign-in ended on the welcome screen until the proxy swapped Neon Auth's verifier

## Problem

On Community Game Library's production, signing in or making an account with Google created the user in Neon Auth, but the browser always ended on the welcome screen, signed out. Email and password sign-in worked. Google had never been completed end to end before production: on the test project, the check only reached Google's own page.

## Symptoms

- The user exists in Neon Auth after the attempt, with Google's picture on it, yet the app shows the welcome screen.
- Right after Google, the address carries `neon_auth_session_verifier`, and the proxy redirects to `/welcome?redirectTo=/?neon_auth_session_verifier=…`.
- Email and password sign-in works on the same deployment.

## What Didn't Work

The proxy can't simply hand the request to the SDK's own middleware (`auth.middleware()` from `@/lib/auth/server`). Oxlint's architecture rule (`no-restricted-imports`, `docs/clean-architecture.md` §5) keeps root `lib/auth/server` to the auth route and the auth pages, so the import fails `bun check`.

## Root Cause

A social sign-in returns in two steps, and the app's proxy skipped the second:

1. The sign-in kit's Google button (`ProviderButton`'s `getCallbackURL` in `@neondatabase/auth-ui`) passes the `redirectTo` path as the callback when `persistClient` is off: `/` by default.
2. After Google, Neon Auth sends the browser back to that page with `?neon_auth_session_verifier=…` and only a challenge cookie (`__Secure-neon-auth.session_challenge`). There's no session cookie yet.
3. The SDK's Next.js middleware swaps the two for the session: `processAuthMiddleware` checks `needsSessionVerification`, then `exchangeOAuthToken` calls Neon's `get-session` with the verifier in the query and the challenge cookie, and redirects to the address without the verifier.
4. This app's `proxy.ts` is hectors-recipes' optimistic cookie check, which doesn't run the SDK. It saw no session cookie and sent the visitor to the welcome screen, so the verifier went unused.

Email and password sign-in never meets this: it sets the session cookies through the app's own auth route, so the proxy never sees a signed-in visitor without them.

## Solution

`apps/community-game-library/proxy.ts` (hectarek/hector-mono#134) swaps the verifier itself, before its cookie check, through the app's own auth route. The route forwards the address's query to Neon: the SDK's `handleAuthRequest` copies the original URL's search onto the upstream URL in `getUpstreamURL`.

```ts
if (request.nextUrl.searchParams.has(OAUTH_VERIFIER_PARAM)) {
  return finishOAuthSignIn(request);
}

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
```

`apps/community-game-library/tests/proxy.test.ts` checks that the `get-session` request carries the verifier, the redirect drops it, the `Set-Cookie` headers pass through, and a swap that can't reach auth still goes on without the verifier. On 2026-11-23, after #134 merged, a Google sign-in on production landed in the app.

## Why This Works

The proxy makes the same request the SDK's middleware makes: `get-session` with the verifier and the challenge cookie. The auth route answers with Neon's session cookies, the redirect hands them to the browser, and the next request passes the proxy's ordinary cookie check.

## Prevention

- An app on recipes' proxy that adds Google or another social sign-in needs the same swap: copy `finishOAuthSignIn` and its two tests. Neon's magic link also ends with a redirect from Neon back to the app, so check it the same way when one is added (not tested here).
- Neon Auth's trusted domains must include the address the app is served at. The same day, Vercel served the app at `www.communitygamelibrary.com` and redirected the bare domain there, while Neon Auth trusted only the bare domain. Production now trusts both.
- Finish one real social sign-in on a preview before launch, not only up to the provider's page. [Neon's OAuth guide](https://neon.com/docs/auth/guides/setup-oauth) gives the production redirect URI, `{NEON_AUTH_BASE_URL}/callback/google`.

## Related Issues

- `docs/solutions/integration-issues/neon-managed-better-auth-deletes-a-user-only-through-neons-api.md`: another way Neon's managed setup needs a step the app takes itself.
- `docs/solutions/integration-issues/neon-console-users-have-no-password.md`
- `docs/solutions/integration-issues/neon-auth-client-aborts-a-pages-own-session-read.md`: another surprise in Neon Auth's session handling.
- `apps/community-game-library/AGENTS.md`, Auth Rules: "A Google sign-in comes back with a verifier."
