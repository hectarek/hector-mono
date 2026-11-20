---
title: Partial prefetching ran each page's session and database reads, which failed in production when the prefetch's render ended
date: 2026-11-06
last_updated: 2026-11-20
category: runtime-errors
module: "apps/job-search, and the other apps here on cacheComponents and partialPrefetching that read the session or a database (hectors-recipes, stash)"
problem_type: runtime_error
component: frontend
symptoms:
  - "Production logs repository errors (list failed, get failed) on .rsc requests on most page loads, while every page renders its data"
  - "Neon Auth logs Server API unexpected fetch error, digest HANGING_PROMISE_REJECTION, on an auth page's .rsc request"
  - "A local next start build logs none of it, with experimental.hideLogsAfterAbort on or off"
  - "A plain router.prefetch of an affected page runs none of its code locally, while a full prefetch reproduces the error"
root_cause: async_timing
resolution_type: code_fix
severity: medium
framework_version: "next 16.4.3"
related_components: [observability, database, authentication]
tags: [nextjs, cache-components, partial-prefetching, app-shell, connection, prefetch, vercel, neon-auth]
---

# Partial prefetching ran each page's session and database reads, which failed in production when the prefetch's render ended

## Problem

With `cacheComponents` and `partialPrefetching` on, `apps/job-search`'s production logs on Vercel filled with repository errors on most page loads, while every page still rendered its data. The noise hid real failures, and the class it logged (`cX`) said nothing about what failed.

## Symptoms

- Repository errors on `.rsc` requests for `/`, `/jobs`, `/jobs/[id]`, `/week` and `/agent`: `[repository/lead-sources] list failed`, `[repository/settings] get failed`, `[repository/activity] list failed` and `[repository/practice] listRecent failed`, each with `errorClass: "cX"` and no code. `cX` was drizzle's `DrizzleQueryError` under the production build's short name. `apps/job-search/src/infrastructure/drizzle-errors.ts` now names it.
- `[neon-auth] Server API unexpected fetch error` on `/auth/sign-in.rsc`, with the message "During prerendering, fetch() rejects when the prerender is complete" and digest `HANGING_PROMISE_REJECTION`.
- A local `next start` build logged nothing at runtime, with `experimental.hideLogsAfterAbort` on or off.
- In `apps/hectors-recipes` (2026-11-20), only the second error, from its auth pages: 15 times in 7 days, listed under `/auth/sign-in.rsc`, `/auth/sign-in`, `/auth/sign-up` and `/auth/forgot-password`, with no page failing.

## What Didn't Work

- Reproducing it with a local production build. `experimental.hideLogsAfterAbort` drops a render's console output once the render aborts (`apps/job-search/node_modules/next/dist/server/node-environment-extensions/console-dim.external.js`, installed when `NextServer` starts). With it off, `next start` still logged no runtime error, because no read failed there. Two builds showed nothing.
- Reading it as noise from a build-time prerender, as an earlier note guessed on 2026-10-31. The errors came at request time, from prefetches.
- A plain prefetch, in `apps/hectors-recipes` (2026-11-20). From Welcome, signed out, `window.next.router.prefetch("/auth/sign-in")` came back in 2 to 8 ms on a local `next start`, and a probe at the top of the auth page's `AuthForm` printed nothing: the build's shell answered it, and none of the page's code ran. Three such prefetches on production logged no error either. The same page's full prefetch reproduced the error at once (Prevention, step 3).

## Solution

Every request-time read waits on `connection()` from `next/server` first. In `apps/job-search` that's three places:

- `getPageActor` (`apps/job-search/app/_lib/current-actor.ts`), which every page and the `(main)` layout's `SessionChrome` call before they read anything
- the auth page's `AuthForm`, before `searchParams` and Neon's `getSession`
- the private screen's `SignedInAs`, before `getSession`

```ts
// apps/job-search/app/_lib/current-actor.ts
export async function getPageActor(): Promise<CurrentActor> {
  await connection();
  try {
    return await getInjection("IResolveActor")();
  } catch (err) {
    // ...
  }
}
```

`connection()` throws "called outside a request scope" under `bun test`, so the test preload (`apps/job-search/tests/_support/preload.ts`) keeps the real `next/server` and replaces only `connection` with `async () => {}`.

`next build` no longer reaches Neon Auth either, so with `hideLogsAfterAbort` off it logs no "Cookie validation error", and `apps/job-search` dropped that option.

`apps/hectors-recipes` has the same `await connection()` in two places: the auth page's `AuthForm` (`apps/hectors-recipes/app/(auth)/auth/[path]/page.tsx:73`), and the shared recipe page, before its session read (`apps/hectors-recipes/app/shared/[token]/page.tsx:34`). With `hideLogsAfterAbort` off, its `next build` had logged two errors, both from the shared recipe page's session read. With `connection()` there it logs none, and recipes dropped the option too. Its signed-in pages still read the session without `connection()`, on purpose: it blocks prefetches too, and recipes prefetches its Recipes tab so the library shows at once (`apps/hectors-recipes/AGENTS.md`, Cache Components).

## Why This Works

Partial prefetching renders each route's App Shell: the parts of the page that don't depend on URL data, and, for a route that reads `cookies()`, its session data as well (Next's bundled docs, `apps/job-search/node_modules/next/dist/docs/01-app/04-glossary.md`, "App Shell"). For a page that reads the session, that render ran at request time and ran the page: the session read, then the uncached database reads, until the shell was done.

A probe showed it. A console line at the top of `getPageActor`, in a local `next start` build, printed 14 times when the page prefetched 7 routes, with no navigation. On Vercel, the reads still running when that render ended failed with an error that carried no code. What ended them on Vercel's side wasn't pinned down.

`connection()` stays suspended until a full user navigation reaches the server, so it blocks prefetches as well as prerenders (`apps/job-search/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md`, "How io() differs from connection()"). `io()` doesn't block prefetches, so it isn't the fix here. After the change, the probe moved below `connection()` printed 0 times for the same 7 prefetches, and a client navigation still rendered the page's data.

## Prevention

- A new request-time read of the session or the database goes behind `connection()`: through `getPageActor`, or its own `await connection()` in a component that doesn't call it. `apps/job-search/AGENTS.md`'s Cache Components section has the rule.
- An error that shows only on `.rsc` requests, while the page renders, points to a prefetch. To check a page locally:
  1. Build and run it with `next start`. From a Claude Code session the build runs only outside the sandbox, which blocks Google Fonts (`apps/hectors-recipes/AGENTS.md`, Cache Components, says how).
  2. Add a probe line at the read.
  3. Prefetch from the page with `window.next.router.prefetch(path)`, then with `window.next.router.prefetch(path, { kind: "full" })`. A plain prefetch can be answered from the build's shell, with none of the page's code run, which looks like a pass. The full one renders the page at request time, the full-route prefetch the `<Link>` docs describe for `prefetch={true}` (`apps/hectors-recipes/node_modules/next/dist/docs/01-app/03-api-reference/02-components/link.md:303`). On recipes' auth page it ran the session read and logged Neon's error; with `connection()` first, a probe below it printed nothing. The API reference lists only `onInvalidate` (`apps/hectors-recipes/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/use-router.md:47`), but Next.js 16.4.3 reads `kind` (`apps/hectors-recipes/node_modules/next/dist/client/components/prefetch.js:38`). The desktop app's browser pane doesn't prefetch links while it's hidden.
  4. Count the probe lines. `performance.getEntriesByType("resource")`, filtered on `_rsc`, lists the prefetch requests.
- On Vercel, an error group lists a prefetch sent with `?_rsc=` under the page's own path, so `/auth/sign-in` beside `/auth/sign-in.rsc` can both be prefetches.
- `apps/hectors-recipes`, checked 2026-11-20: a week of production error groups held no repository-read failure, only the auth page's session fetch, now behind `connection()`. `apps/stash` sets the same options and `hideLogsAfterAbort`, but isn't deployed, so it has no production logs to read.

## Related Issues

- `apps/job-search/AGENTS.md`: Cache Components, and the Logging Rules' note on `DrizzleQueryError`.
- `apps/hectors-recipes/AGENTS.md`: Cache Components, with the rule for its signed-out pages.
