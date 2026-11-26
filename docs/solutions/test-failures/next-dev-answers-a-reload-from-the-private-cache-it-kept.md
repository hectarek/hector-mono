---
title: "In next dev, a reload answered a 'use cache: private' page with the result from before the change, so a browser flow looked as if a write had been lost"
date: 2026-11-26
category: test-failures
module: "Browser flows (Playwright on next dev) in any app here whose pages load through 'use cache: private'; found in apps/hectors-recipes' library (loadLibrary)"
problem_type: test_failure
component: testing_framework
symptoms:
  - "A flow writes something through a server action, the action returns 200, and page.reload() still shows the page as it was before"
  - "expect.poll around the page's contents times out, though the database has the new row"
  - "The same page shows the change on the next reload, or on a production build"
root_cause: async_timing
resolution_type: test_fix
severity: medium
framework_version: "next 16.4.6"
tags: [next-dev, use-cache-private, cache-components, playwright, browser-flows, reload, stale-while-revalidate, strict-mode]
---

# In next dev, a reload answered a 'use cache: private' page with the result from before the change

## Problem

`apps/hectors-recipes/tests/flows/recent-and-back.flow.ts` (Phase 32, `feat/recipes-p32-ready-swipe-recent`) opens a recipe, which records a `recipe-viewed` event through the `recordView` server action, goes back to the library, and reloads it to check that the recipe moved to the front of Recently viewed. After the reload the library kept its old order for the whole 15-second poll, which read as the view never having been saved.

## Symptoms

- The flow's trace showed the `recordView` POST answered 200: the event was written.
- `page.reload()` returned the library in the order from its previous load, every time within the poll.

## What Didn't Work

- **Reading it as a lost write.** The first lead was that the swipe back, made a moment after the page showed, cut off the action. The trace ruled it out: the action had finished.

## Root cause

The library reads through `loadLibrary`, which is `'use cache: private'` with `cacheLife({ stale: 300 })` (`apps/hectors-recipes/app/(main)/(library)/page.tsx`). Next.js's own docs for the directive (`apps/hectors-recipes/node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache-private.md`, installed with the app, the paragraph after the heading) say that in production a private result is reused only within one request and never stored on the server across requests, but that in development Next.js stores it in memory, keyed by the request's cookies and headers, and serves it to the next matching request while it renders a fresh result in the background. A reload is a matching request, so in `next dev` it gets the previous result once, however new the data is. The flows run on `next dev`.

## Solution

Reload inside the poll, so each try is a new request that gets the result the one before it rendered:

```ts
// apps/hectors-recipes/tests/flows/recent-and-back.flow.ts
await expect
  .poll(async () => {
    await page.reload();
    return cards(page);
  })
  .toEqual(titled("Apple Cake", "Zucchini Soup"));
```

Production never stores the private result across requests, so a real person's reload is fresh; only the check needed changing.

## Also seen in the same trace

Each open of a recipe sent `recordView` twice. The app router runs React's Strict Mode by default in development (Next.js's `reactStrictMode` docs: true by default with the app router since 13.5.1), which runs an effect twice on mount, so an effect that writes runs twice in `next dev`. Here the activity log's repeat rule (`isRepeat`) recorded one event. Any effect that writes needs to be safe to run twice.

## Prevention

A flow that checks a page after a write, on a page whose loader is `'use cache: private'`, reloads inside its poll rather than once before it.
