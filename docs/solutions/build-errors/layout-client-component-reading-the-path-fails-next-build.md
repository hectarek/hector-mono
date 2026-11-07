---
title: A layout's client component that reads the path or the clock fails next build under Cache Components
date: 2026-11-07
last_updated: 2026-11-07
category: build-errors
module: "apps/job-search, and any app here on cacheComponents whose layout renders client components (hectors-recipes, stash)"
problem_type: build_error
component: frontend
symptoms:
  - "next build fails on a route with params: Next.js encountered URL data `usePathname()` in a Client Component outside of `<Suspense>`"
  - "The error's digest is CLIENT_HOOK_DYNAMIC, and it fails only routes with params (/companies/[id]), not list pages"
  - "next build fails on the first route it prerenders: Next.js encountered the unstable value `new Date()` in a Client Component"
  - "next dev, the screen tests and CI all pass, since none of them prerenders"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
framework_version: "next 16.4.3"
related_components: [development_workflow]
tags: [nextjs, cache-components, prerender, usepathname, suspense, next-build, app-shell, client-hooks, new-date, clock]
---

# A layout's client component that reads the path or the clock fails next build under Cache Components

## Problem

`apps/job-search`'s signed-in shell (`apps/job-search/app/_components/app-shell.tsx`, rendered by `apps/job-search/app/(main)/layout.tsx`) is part of every route's prerendered frame. Twice on 2026-11-07, a client component added to it read something only a request has, and everything passed until `next build`:

- `apps/job-search/app/_components/app-nav.tsx` read `usePathname()` to mark the current menu item and to name the section in the phone's top bar. The build failed on the first route with params.
- The quick log (`apps/job-search/app/_components/quick-log.tsx`) moved from three pages into the shell's top bar. Its date field's default came from `useToday()` (`apps/job-search/app/_lib/use-today.ts`), whose `useState` initializer reads the clock (`todayIn(PLAN_TIME_ZONE)`, a `new Date()`) on the first render. Inside the pages it had been fine, since each page reads the session behind `connection()`, which a prerender never passes. In the shell the build failed on the first route.

Nothing else in the pipeline builds before Vercel's preview deploy, so the first sign would have been a failed deploy.

## Symptoms

- For the path, `next build` stopped on `/companies/[id]`:

  ```
  Error: Route "/companies/[id]": Next.js encountered URL data `usePathname()` in a Client Component outside of `<Suspense>`.
  This blocks prerendering because the value is only available at runtime.
  ```

  with digest `CLIENT_HOOK_DYNAMIC` and a link to https://nextjs.org/docs/messages/blocking-prerender-client-hook. It offered two fixes: wrap the component in `<Suspense>` so the value streams in after prerendering, or `export const instant = false` to make the route blocking. Only the `[id]` and `[id]/edit` routes failed: `/jobs` and the other list pages have no params and prerendered.
- For the clock, `next build` stopped on `/`:

  ```
  Error: Route "/": Next.js encountered the unstable value `new Date()` in a Client Component.
  Error occurred prerendering page "/".
  ```

  Next's message (`createSyncIOClientError` in `apps/job-search/node_modules/next/dist/server/app-render/sync-io-messages.js`) says the value "would be evaluated during the prerender, instead of recomputed on each visit". It offers two fixes: wrap the component in `<Suspense>`, or move the read into a `useEffect` or an event handler. Its link is https://nextjs.org/docs/messages/blocking-prerender-current-time-client.
- `next dev`, the screen tests (happy-dom, with `next/navigation` stubbed in `apps/job-search/tests/_support/preload.ts`) and CI (lint, typecheck and tests, no build) all passed both times.

## What Didn't Work

- Reading the section with `useSelectedLayoutSegment()` instead. In `apps/job-search/node_modules/next/dist/client/components/navigation.js`, `usePathname`, `useSelectedLayoutSegments` and `useSelectedLayoutSegment` each call `useDynamicRouteParams` first, so all three hang the same way.

## Solution

For the path, each part of the shell that reads it is a small component under its own `<Suspense>`. The menu's fallback is the same menu with nothing marked, so the prerendered shell shows the sections and the mark streams in with the request:

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

For the clock, the shell's quick log reads today in an event. `useToday("")` starts with no date and reads the clock only on `refresh`, which the sheet calls as it opens. The date field shows that day only inside the open sheet:

```tsx
// apps/job-search/app/_components/quick-log.tsx
const day = useToday("");
// …
<Sheet
  open={open}
  onOpenChange={(opening) => {
    if (opening) day.refresh();
    setOpen(opening);
  }}
>
```

The pages that call `useToday()` behind `connection()` keep reading the clock in the initializer. After the change, `next build` passes.

## Why This Works

`useDynamicRouteParams` (`apps/job-search/node_modules/next/dist/server/app-render/dynamic-rendering-client.js`) checks the render it's in. In a `prerender-client` render whose route has fallback params (a dynamic segment with no `generateStaticParams`), it `React.use()`s a promise that never resolves, which turns the component into a dynamic hole. A page's `loading.tsx` puts a `<Suspense>` around the page, but the layout's shell sits above it, so nothing caught the hole and the prerender failed. A `<Suspense>` of the shell's own gives the hole a boundary: the prerender keeps the fallback, and the real component renders at request time. A route without params has nothing to hang on, so it prerenders with the path read in place.

A clock read during the prerender would fix one moment's value into the static frame, so Next refuses it in a client component as it does on the server. Every route's frame includes the shell, so the first route prerendered fails. With `useToday("")` the first render reads nothing, and a read in an event handler or an effect doesn't happen during the prerender: the sheet opens in the browser, at request time. Inside a page, the same read came after `connection()`, where the prerender had already stopped.

## Prevention

- After changing a layout's client components, run `next build` locally, since neither `next dev` nor the tests prerender. In an agent session the build needs `.env`, which the sandbox can't read, so it runs outside the sandbox (as on 2026-11-07) or from the desktop app's Terminal panel. On Next 16.4.3 the dev server wrote only to `.next/dev`, so a build can run beside it.
- A client component above the pages reads nothing only a request has during its first render. The path, the params and the selected segments go under its own `<Suspense>`. The clock is read in an event or an effect, or comes from a server component after `connection()`. A component that moves into the shell from a page needs the same check, since the page's `connection()` no longer covers it. `apps/job-search/AGENTS.md`'s Cache Components section has the path rule, and its UI Rules (the date default) the clock rule.

## Related Issues

- [partial-prefetching-runs-page-reads-that-fail-in-production.md](../runtime-errors/partial-prefetching-runs-page-reads-that-fail-in-production.md): another case where a Cache Components render does what `next dev` never shows.
