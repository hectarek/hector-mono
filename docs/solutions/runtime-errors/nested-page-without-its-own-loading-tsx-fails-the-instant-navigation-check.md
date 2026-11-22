---
title: A nested page that leaned on its parent folder's loading.tsx failed Next.js's instant-navigation check
date: 2026-11-22
category: runtime-errors
module: "apps/community-game-library, and any app here on cacheComponents with pages in nested folders (hectors-recipes, job-search)"
problem_type: runtime_error
component: frontend
symptoms:
  - "next dev logs that Next.js encountered uncached data during prerendering or a navigation, pointing at the nested page's await connection()"
  - "Next.js's dev indicator shows 1 Insight, while the page itself renders"
  - "Unit tests and happy-dom screen tests pass, since nothing in them runs Next.js's router or its checks"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
framework_version: "next 16.4.6"
related_components: [development_workflow]
tags: [nextjs, cache-components, instant-navigation, loading-tsx, suspense, nested-routes, connection, next-dev]
---

# A nested page that leaned on its parent folder's loading.tsx failed Next.js's instant-navigation check

## Problem

`apps/community-game-library` runs Cache Components and partial prefetching, and its rule (`apps/community-game-library/AGENTS.md`, Cache Components) is that a page that reads the session, its address or the database in its body has a `loading.tsx` in its own folder. A batch added an admin section: `apps/community-game-library/app/(main)/admin/page.tsx` with its `loading.tsx`, and five pages in folders below it: `suggestions/[id]`, `suggestions/answered`, `games`, `games/new` and `games/[id]`. Each page waits on `connection()`, runs the account gate, then reads through controllers. The five had no `loading.tsx` of their own and relied on the admin folder's. Every test passed, but on the dev server, opening a suggestion's page logged that a navigation into it couldn't be instant.

## Symptoms

- Opening `/admin/suggestions/<id>` on `next dev` logged this in the browser console and in the dev server's terminal:

  ```
  Error: Route "/admin/suggestions/[id]": Next.js encountered uncached data during prerendering or a navigation.
  `fetch(...)` or `connection()` accessed outside of `<Suspense>` prevents the route from being prerendered or the navigation from being instant, leading to a slower user experience.
  ```

  It listed three fixes (`[stream]` a `<Suspense>` placeholder, `[cache]` `"use cache"`, `[block]` `export const instant = false`), linked https://nextjs.org/docs/messages/blocking-prerender-dynamic, and pointed at the page's `await connection()` line. The dev indicator showed "1 Insight". The page itself rendered.
- The message comes from `createDynamicBodyErrorInNavigation` (`apps/community-game-library/node_modules/next/dist/server/app-render/blocking-route-messages.js:153`). It names the route, not the navigation that failed.
- Unit tests and the happy-dom screen tests passed. They call the pages directly, with `connection()` stubbed to go on at once (`apps/community-game-library/tests/_support/preload.ts`), so nothing runs Next.js's router or its checks.

## What Didn't Work

- Leaning on the admin folder's `loading.tsx` for the five pages below it. The rule says "in its own folder", but one in a parent folder looked as if it covered everything below. It covers only some of the navigations into those pages (Why This Works).

## Solution

A `loading.tsx` in each nested page's own folder. Each renders the shared skeleton, `AdminLoading` (`apps/community-game-library/app/(main)/admin/admin-loading.tsx`), with that page's own back link:

```tsx
// apps/community-game-library/app/(main)/admin/suggestions/[id]/loading.tsx
import { AdminLoading } from "@/app/(main)/admin/admin-loading";

export default function Loading() {
  return <AdminLoading back={{ href: "/admin", label: "Admin" }} />;
}
```

After the change, direct loads of all six admin routes and a tap from `/admin` into a suggestion logged no errors (Playwright on the dev server). Whether `next build` reports a missing boundary like this one wasn't checked.

## Why This Works

What the docs bundled with Next.js 16.4.6 confirm:

- A client navigation re-renders only below the layout the two routes share, so a `<Suspense>` fallback above that point can't show during it (`apps/community-game-library/node_modules/next/dist/docs/01-app/02-guides/instant-navigation.md:24` and `:33`).
- In development, Next.js validates every page (`instant-navigation.md:105`) as it loads (`apps/community-game-library/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/instant.md:95`). It checks client navigations "at different points in the route hierarchy", each on its own, so a boundary that covers one navigation may not cover another (`instant-navigation.md:127` to `:134`).
- A folder's `loading.js` sits inside that folder's `layout.js` and wraps its `page.js` and the nested layouts below it in a `<Suspense>` boundary (`apps/community-game-library/node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/loading.md:76` and `:86`).

What the docs leave out, and the installed source fills in (read, not tested by moving files around):

- Which points get checked. Validation tries one navigation per URL segment of the route, from the deepest up, and reports the first that fails (`apps/community-game-library/node_modules/next/dist/server/app-render/app-render.js:4642`). A route group gets a try of its own, and a page shares its folder's (`discoverValidationDepths` and the comment above it, `apps/community-game-library/node_modules/next/dist/server/app-render/instant-validation/instant-validation.js:504` to `:558`). Each try keeps the segment at its level as it was, and renders everything below it from what a prefetch would hold (`buildSharedTransportTree` and `buildNewTransportTree`, same file, `:601` and `:721`).
- Which navigations a `loading.tsx` covers. Its `<Suspense>` wraps the children of its own folder's layout ("loading.tsx creates a Suspense boundary around each of a layout's child slots", `apps/community-game-library/node_modules/next/dist/client/components/layout-router.js:283`). So it covers a navigation that keeps its folder, or a folder above it, and replaces what's below. It can't cover one that keeps a folder below it.

For `/admin/suggestions/[id]`, the tries keep, in turn: the suggestion's own folder `[id]`, with only its page new; `suggestions`, as on a tap from a row of Answered suggestions; `admin`, as on a tap from Admin; then `(main)` and the root. In the last three, the admin folder's `loading.tsx` sits inside what changes and around the page, so it covers them. In the first two, nothing below the kept folder had a `loading.tsx` until `[id]` got its own. The deepest try can be covered only by a `loading.tsx` in the page's own folder, or a `<Suspense>` inside the page, which is why every such page needs one whatever its parent folders have.

Not observed: which try produced the logged error. By the loop's order it was the deepest. Next.js 16.4.6 prints each try, the segment it kept and whether it passed when the dev server runs with `NEXT_PRIVATE_DEBUG_VALIDATION=1` (`instant-validation.js:55`), a private switch not tried here. A first reading of the error put the gap at the tap from Admin into a suggestion. That doesn't match the source: on that tap the admin folder is the one kept, and its `loading.tsx` wraps the child that changes.

## Prevention

- A page that reads the session, its address or the database at request time gets a `loading.tsx` in its own folder even when a parent folder has one, or puts those reads inside a `<Suspense>` of its own. The Cache Components sections of `apps/community-game-library/AGENTS.md`, `apps/hectors-recipes/AGENTS.md` and `apps/job-search/AGENTS.md` carry the rule.
- Load each new page on the dev server and look for the dev indicator's Insight, or the error in the console and the terminal. A load runs that route's tries deepest first and stops at the first failure (source, above), so fix and reload until it loads clean. Judge by the check, not by how a tap looks: development doesn't prefetch, and the check reflects `next start` (`instant.md:25`).
- The unit and screen tests won't show it. A flow test can assert that a navigation is instant with `@next/playwright`'s `instant()`, as `apps/hectors-recipes/tests/flows/instant.flow.ts` does for the Recipes tab.

## Related Issues

- [layout-client-component-reading-the-path-fails-next-build.md](../build-errors/layout-client-component-reading-the-path-fails-next-build.md): a component above a page's `loading.tsx` that reads the path needs a `<Suspense>` of its own.
- [partial-prefetching-runs-page-reads-that-fail-in-production.md](partial-prefetching-runs-page-reads-that-fail-in-production.md): why each page waits on `connection()` before it reads the session.
