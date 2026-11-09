---
title: Neon Auth's client aborted a page's own getSession, so the effect waiting on it never finished
date: 2026-11-09
category: integration-issues
module: "apps/job-search, and any client code here that awaits @neondatabase/auth's client"
problem_type: integration_issue
component: authentication
symptoms:
  - "A client page that awaits authClient.getSession() in an effect stays on its checking state forever"
  - "The browser console shows Uncaught (in promise) AbortError, signal is aborted without reason, thrown from Object.cancel inside better-auth's fetchSession"
  - "The screen tests pass, since happy-dom fires no window focus and runs no session store beside the page"
root_cause: async_timing
resolution_type: code_fix
severity: medium
framework_version: "better-auth 1.7.6, @neondatabase/auth 0.7.0-beta"
retire_when: "@neondatabase/auth's fetch wrapper stops sharing one in-flight request, and its abort signal, between callers, or better-auth's session store stops cancelling the fetch in flight when it starts another; check BETTER_AUTH_METHODS_IN_FLIGHT_REQUESTS.deduplicate in @neondatabase/auth's dist/adapter-core-*.mjs and fetchSession in better-auth's dist/client/session-atom.mjs"
related_components: [frontend, testing_framework]
tags: [neon-auth, better-auth, get-session, abort-error, request-deduplication, refetch-on-focus, happy-dom, oauth]
---

# Neon Auth's client aborted a page's own getSession, so the effect waiting on it never finished

## Problem

apps/job-search's MCP sign-in page (`apps/job-search/app/_components/oauth-sign-in.tsx`) decided what to show by awaiting `authClient.getSession()` in a `useEffect`. The client is `createAuthClient()` from `@neondatabase/auth/next` (`apps/job-search/app/_lib/auth.ts`). During a real sign-in on 2026-11-09 the page stayed on "Checking…", because the await rejected with an `AbortError` and nothing caught it.

## Symptoms

- The page never left its checking view.
- The browser console showed `Uncaught (in promise) AbortError: signal is aborted without reason`, from `Object.cancel` inside better-auth's client `fetchSession`.
- The screen tests passed. Under happy-dom no window gains focus, and no session store fetches beside the page.

## Solution

The fix is pending in hectarek/hector-mono#101. The server page reads who's signed in and passes it down, so the client component never awaits a session read (`apps/job-search/app/(auth)/auth/oauth/sign-in/page.tsx`):

```tsx
async function SignIn() {
  try {
    const { actor } = await getPageActor();
    return <OAuthSignIn signedIn={actor === "agent" ? "claude" : "hector"} />;
  } catch (err) {
    if (err instanceof UnauthenticatedError) {
      return <OAuthSignIn signedIn="no-one" />;
    }
    throw err;
  }
}
```

`getPageActor` awaits `connection()` first, and the page renders `SignIn` inside `<Suspense>`. The steps that have to run in the browser (`authClient.oauth2.continue`, `authClient.signIn.email`) each sit in a try/catch, and a step that's dropped counts as one that didn't go on:

```ts
async function goOn(): Promise<boolean> {
  try {
    const { data, error } = await authClient.oauth2.continue({
      selected: true,
    });
    return !error && followNeon(data);
  } catch {
    return false;
  }
}
```

## Why This Works

Two libraries combine, as their installed sources show:

- **better-auth 1.7.6's session store** (`better-auth/dist/client/session-atom.mjs`): `fetchSession` cancels the fetch in flight (`flight?.cancel()`, an `AbortController`'s abort) each time it starts another. The store fetches on mount. `better-auth/dist/client/session-refresh.mjs` refetches on window focus or `visibilitychange` (`refetchOnWindowFocus` defaults to true; at most one in 5 seconds, and the first always runs), on coming back online, on another tab's session broadcast, on polling when it's set, and after sign-in, sign-out and user updates.
- **@neondatabase/auth 0.7.0-beta's fetch wrapper** (`@neondatabase/auth/dist/adapter-core-*.mjs`): it shares one in-flight request between callers with the same method, URL and body (`BETTER_AUTH_METHODS_IN_FLIGHT_REQUESTS.deduplicate`). The shared `fetch` runs with the first caller's options, its abort signal included.

So the page's `GET /get-session`, sent while the store's was in flight, waited on the store's fetch. When the store started another fetch, it aborted the one in flight, and the page's await rejected with it. On 2026-11-09 the trigger was most likely the window regaining focus as the browser came forward from the terminal. The abort itself is in the console; the trigger isn't proven.

A session read on the server isn't shared with the browser's session store. The try/catch turns any dropped browser step into a state the page can show.

## Prevention

- Don't await the auth client's session read in a client effect to decide what a page shows. Read the session on the server (`getPageActor`, or the auth service) and pass it down as a prop.
- Wrap any auth-client call made from an effect or an event in try/catch: any request the session store also makes can reject with `AbortError`.
- happy-dom can't show this. Check such a page in a browser, switching windows while it checks.

## Related Issues

- [neon-auth-provider-toaster-doubles-the-apps-toasts.md](../ui-bugs/neon-auth-provider-toaster-doubles-the-apps-toasts.md): another Neon Auth client behavior the app works around.
