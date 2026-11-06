---
title: Partial prefetching ran each page's session and database reads, which failed in production when the prefetch's render ended
date: 2026-11-06
category: runtime-errors
module: "apps/job-search, and the other apps here on cacheComponents and partialPrefetching that read the session or a database (hectors-recipes, stash)"
problem_type: runtime_error
component: frontend
symptoms:
  - "Production logs repository errors (list failed, get failed) on .rsc requests on most page loads, while every page renders its data"
  - "Neon Auth logs Server API unexpected fetch error, digest HANGING_PROMISE_REJECTION, on an auth page's .rsc request"
  - "A local next start build logs none of it, with experimental.hideLogsAfterAbort on or off"
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

## What Didn't Work

- Reproducing it with a local production build. `experimental.hideLogsAfterAbort` drops a render's console output once the render aborts (`apps/job-search/node_modules/next/dist/server/node-environment-extensions/console-dim.external.js`, installed when `NextServer` starts). With it off, `next start` still logged no runtime error, because no read failed there. Two builds showed nothing.
- Reading it as noise from a build-time prerender, as an earlier note guessed on 2026-10-31. The errors came at request time, from prefetches.

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

## Why This Works

Partial prefetching renders each route's App Shell: the parts of the page that don't depend on URL data, and, for a route that reads `cookies()`, its session data as well (Next's bundled docs, `apps/job-search/node_modules/next/dist/docs/01-app/04-glossary.md`, "App Shell"). For a page that reads the session, that render ran at request time and ran the page: the session read, then the uncached database reads, until the shell was done.

A probe showed it. A console line at the top of `getPageActor`, in a local `next start` build, printed 14 times when the page prefetched 7 routes, with no navigation. On Vercel, the reads still running when that render ended failed with an error that carried no code. What ended them on Vercel's side wasn't pinned down.

`connection()` stays suspended until a full user navigation reaches the server, so it blocks prefetches as well as prerenders (`apps/job-search/node_modules/next/dist/docs/01-app/03-api-reference/04-functions/io.md`, "How io() differs from connection()"). `io()` doesn't block prefetches, so it isn't the fix here. After the change, the probe moved below `connection()` printed 0 times for the same 7 prefetches, and a client navigation still rendered the page's data.

## Prevention

- A new request-time read of the session or the database goes behind `connection()`: through `getPageActor`, or its own `await connection()` in a component that doesn't call it. `apps/job-search/AGENTS.md`'s Cache Components section has the rule.
- An error that shows only on `.rsc` requests, while the page renders, points to a prefetch. To check a page locally:
  1. Build and run it with `next start`.
  2. Add a probe line at the read.
  3. Prefetch from the page with `window.next.router.prefetch(path)`. The desktop app's browser pane doesn't prefetch links while it's hidden.
  4. Count the probe lines. `performance.getEntriesByType("resource")`, filtered on `_rsc`, lists the prefetch requests.
- `apps/hectors-recipes` and `apps/stash` set the same two options, and `hideLogsAfterAbort` too, so their production logs may show the same errors. As of 2026-11-06 nobody had checked.

## Related Issues

- `apps/job-search/AGENTS.md`: Cache Components, and the Logging Rules' note on `DrizzleQueryError`.
