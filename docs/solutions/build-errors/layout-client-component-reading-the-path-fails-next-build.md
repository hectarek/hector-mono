---
title: A layout's client component that reads the path fails next build under Cache Components, unless it sits under its own Suspense
date: 2026-11-07
category: build-errors
module: "apps/job-search, and any app here on cacheComponents whose layout reads the path or params (hectors-recipes, stash)"
problem_type: build_error
component: frontend
symptoms:
  - "next build fails on a route with params: Next.js encountered URL data `usePathname()` in a Client Component outside of `<Suspense>`"
  - "The error's digest is CLIENT_HOOK_DYNAMIC, and it fails only routes with params (/companies/[id]), not list pages"
  - "next dev, the screen tests and CI all pass, since none of them prerenders"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
framework_version: "next 16.4.3"
related_components: [development_workflow]
tags: [nextjs, cache-components, prerender, usepathname, suspense, next-build, app-shell, client-hooks]
---

# A layout's client component that reads the path fails next build under Cache Components, unless it sits under its own Suspense

## Problem

`apps/job-search`'s signed-in shell gained a client component (`apps/job-search/app/_components/app-nav.tsx`, rendered by `apps/job-search/app/_components/app-shell.tsx` from `apps/job-search/app/(main)/layout.tsx`) that read `usePathname()` to mark the current menu item and to name the section in the phone's top bar. Everything passed until `next build`, which failed on the first route with params. Nothing else in the pipeline builds before Vercel's preview deploy, so the first sign would have been a failed deploy.

## Symptoms

- `next build` stopped on `/companies/[id]`:

  ```
  Error: Route "/companies/[id]": Next.js encountered URL data `usePathname()` in a Client Component outside of `<Suspense>`.
  This blocks prerendering because the value is only available at runtime.
  ```

  with digest `CLIENT_HOOK_DYNAMIC` and a link to https://nextjs.org/docs/messages/blocking-prerender-client-hook. It offered two fixes: wrap the component in `<Suspense>` so the value streams in after prerendering, or `export const instant = false` to make the route blocking.
- Only the `[id]` and `[id]/edit` routes failed. `/jobs` and the other list pages have no params and prerendered.
- `next dev`, the screen tests (happy-dom, with `next/navigation` stubbed in `apps/job-search/tests/_support/preload.ts`) and CI (lint, typecheck and tests, no build) all passed.

## What Didn't Work

- Reading the section with `useSelectedLayoutSegment()` instead. In `apps/job-search/node_modules/next/dist/client/components/navigation.js`, `usePathname`, `useSelectedLayoutSegments` and `useSelectedLayoutSegment` each call `useDynamicRouteParams` first, so all three hang the same way.

## Solution

Each part of the shell that reads the path is a small component under its own `<Suspense>`. The menu's fallback is the same menu with nothing marked, so the prerendered shell shows the sections and the mark streams in with the request:

```tsx
// apps/job-search/app/_components/app-nav.tsx
export function MainNav() {
  return (
    <nav aria-label="Main">
      <Suspense fallback={<SectionMenu />}>
        <CurrentSectionMenu />
      </Suspense>
    </nav>
  );
}

function CurrentSectionMenu() {
  return <SectionMenu pathname={usePathname()} />;
}
```

The top bar's section name and the tab's title (`TabTitle`) sit under a `<Suspense>` with no fallback. After the change, `next build` lists the `[id]` routes as partial prerenders.

## Why This Works

`useDynamicRouteParams` (`apps/job-search/node_modules/next/dist/server/app-render/dynamic-rendering-client.js`) checks the render it's in. In a `prerender-client` render whose route has fallback params (a dynamic segment with no `generateStaticParams`), it `React.use()`s a promise that never resolves, which turns the component into a dynamic hole. A page's `loading.tsx` puts a `<Suspense>` around the page, but the layout's shell sits above it, so nothing caught the hole and the prerender failed. A `<Suspense>` of the shell's own gives the hole a boundary: the prerender keeps the fallback, and the real component renders at request time. A route without params has nothing to hang on, so it prerenders with the path read in place.

## Prevention

- After changing a layout's client components, run `next build` locally, since neither `next dev` nor the tests prerender. In an agent session the build needs `.env`, which the sandbox can't read, so it runs from the desktop app's Terminal panel. On Next 16.4.3 the dev server wrote only to `.next/dev`, so a build can run beside it.
- A client component above the pages that reads the path, the params or the selected segments goes under its own `<Suspense>`. `apps/job-search/AGENTS.md`'s Cache Components section states the rule.

## Related Issues

- [partial-prefetching-runs-page-reads-that-fail-in-production.md](../runtime-errors/partial-prefetching-runs-page-reads-that-fail-in-production.md): another case where a Cache Components render does what `next dev` never shows.
