---
title: Next's route announcer spoke the page left behind when each page's title came from its metadata; the shell renders the title instead
date: 2026-11-07
category: ui-bugs
module: "apps/job-search, and the other apps here that title pages through metadata and navigate on the client (hectors-recipes, stash)"
problem_type: ui_bug
component: frontend
symptoms:
  - "After a client navigation, the screen reader's announcement names the page just left, not the new one"
  - "On next start it happens on a return to the first page the tab loaded; on next dev on every navigation"
  - "For about 3 ms after the route changes, document.title is empty"
root_cause: async_timing
resolution_type: code_fix
severity: medium
framework_version: "next 16.4.3"
retire_when: "Next commits a route's metadata title in the same commit as its tree, or its route announcer waits for the new title; check on next start by giving pages metadata titles and returning to the first page loaded"
related_components: [accessibility]
tags: [nextjs, accessibility, route-announcer, screen-reader, document-title, metadata, react-19, app-shell]
---

# Next's route announcer spoke the page left behind when each page's title came from its metadata; the shell renders the title instead

## Problem

`apps/job-search` gave each signed-in page its own title, so tabs, history and Next's route announcer could tell pages apart. The first version set it in each page's metadata (`export const metadata = { title: "Jobs" }`, with a `title.template` of `"%s · Job search"` in the root layout). Tabs then differed, but after some client navigations the announcer told a screen reader the name of the page just left.

## Symptoms

- Measured on 2026-11-07 with a `MutationObserver` on `document.head` and on the announcer's live region, in its shadow root. On `next start`, most navigations announced the new title, but a return to the page the tab loaded first (This week, every morning) always announced the previous page's heading. On `next dev`, every client navigation announced the page left behind.
- In the commit that changed the route, React removed the old `<title>`. The new one arrived about 3 ms later, in a separate commit. In between, `document.title` was empty.

## What Didn't Work

- `htmlLimitedBots: /.*/` in `next.config.ts`, which the generate-metadata docs give as the way to turn streaming metadata off. On `next dev` the empty-title gap stayed on every client navigation, and it wasn't tried on `next start`.
- One finding from building the first version: a layout's `title.template` skips a page in the layout's own folder (the generate-metadata docs' "Good to know"). `apps/job-search/app/(main)/page.tsx` sits beside `apps/job-search/app/(main)/layout.tsx`, so the template had to live in the root layout. The final fix needs no template.

## Solution

The shell renders the title, and the signed-in pages take none from metadata:

```tsx
// apps/job-search/app/_components/app-nav.tsx, rendered by the (main) layout's AppShell
export function TabTitle() {
  return (
    <Suspense>
      <PageTitleTag />
    </Suspense>
  );
}

function PageTitleTag() {
  const page = pageNameOf(usePathname());
  return <title>{page ? `${page} · Job search` : "Job search"}</title>;
}
```

```ts
// apps/job-search/app/(main)/layout.tsx
export const metadata: Metadata = { title: null };
```

- `pageNameOf` names a page from one table of sections. A record's page is named by what it is ("Job", "Edit job"), never by the record.
- The `<Suspense>` keeps `next build` working on routes with params ([layout-client-component-reading-the-path-fails-next-build.md](../build-errors/layout-client-component-reading-the-path-fails-next-build.md)).
- `title: null` drops the root layout's title from these pages. Next's `resolveTitle` (`apps/job-search/node_modules/next/dist/lib/metadata/resolvers/resolve-title.js`) turns `null` into an empty title. `createSelectedMetadata` (`apps/job-search/node_modules/next/dist/lib/metadata/metadata-resolution-primitives.js`) maps that to `null`, and `createMetadataElements` (`apps/job-search/node_modules/next/dist/lib/metadata/metadata-elements.js`) renders a `<title>` only when there is one.
- The root layout keeps `title: "Job search"` for the signed-out pages.

Checked on `next start`, and on `next dev` after a restart. Every client navigation, including returns to the first page loaded, announced "<page> · Job search", with no empty title and one `<title>` in the document. A full load of a record's page (`/jobs/[id]`), whose title streams in after the prerendered shell, leaves two identical `<title>` elements, one in the head and one in the body; `document.title` reads the first.

## Why This Works

The announcer (`apps/job-search/node_modules/next/dist/client/components/app-router-announcer.js`) runs an effect whenever the router tree changes. It reads `document.title`, falls back to the first `<h1>`, and announces only when that differs from what it read last. With a title in each page's metadata, the effect ran in the gap, read an empty title, and fell back to the first `<h1>` in the document. That was the previous page's: Next keeps visited routes mounted but hidden for back navigation, so their headings stay in the DOM.

The shell stays mounted across navigations, so React changes the text of the same `<title>` element in the commit that changes the route. `app-router.js` renders the announcer after the root layout's tree, so its effect runs after the shell's has rendered the new title, and it reads the new one.

## Prevention

- A new signed-in page gets its title from the sections table in `app-nav.tsx`, not from its own metadata. `apps/job-search/AGENTS.md`'s UI Rules say so, and `apps/job-search/tests/app/(main)/layout.test.ts` fails if the layout's title stops being `null`.
- To check announcements, run `next start`, load a page fresh, navigate away and back, and read the live region: `document.querySelector('next-route-announcer').shadowRoot.querySelector('[aria-live]').textContent`.
- After editing a layout's metadata under a running `next dev`, the old title kept showing until the server restarted, so restart before judging a title change there.

## Related Issues

- `apps/job-search/docs/ux-plan.md`: finding 33 and UX2, marked revised for this change.
