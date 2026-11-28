---
title: An id repeated across pages is repeated in the document under Cache Components, so aria-labelledby can name a region by a hidden page's heading
date: 2026-11-28
category: ui-bugs
module: "apps/personal-finance, and every app here on cacheComponents whose pages label sections by id"
problem_type: ui_bug
component: frontend
symptoms:
  - "After a client navigation from /investing to /compound-growth, both pages' h1 elements are in the document, the first one hidden"
  - "Two pages that each give a section heading id=\"go-further\" put two elements with that id in the document at once"
  - "A section's aria-labelledby resolves to the first element with its id in document order, which can be the hidden page's heading"
root_cause: logic_error
resolution_type: code_fix
severity: low
framework_version: "next 16.4.6"
related_components: [accessibility]
tags: [nextjs, cache-components, activity, accessibility, aria-labelledby, duplicate-ids, client-navigation]
---

# An id repeated across pages is repeated in the document under Cache Components, so aria-labelledby can name a region by a hidden page's heading

## Problem

Under Cache Components, Next keeps pages a reader visited mounted but hidden (React's Activity), so an `id` that is unique within each page can still appear twice in the document. A section named with `aria-labelledby` then takes its name from whichever element with that id comes first, which can be a hidden page's heading.

## Symptoms

`apps/personal-finance` labelled a resources section `aria-labelledby="go-further"` on both the growth calculator (`/compound-growth`) and every topic page (`/[topic]`), where the heading reads "Go further" or "Good places to start". On `next start`, after opening `/investing` and following its link to `/compound-growth`, the document held both pages' `<h1>`s, the topic page's hidden. With the shared id, both "go-further" headings were in the document at once. No screen reader was run against it. The adversarial pass of the Batch 1 code review raised it, and the DOM check above confirmed its premise.

## What Didn't Work

Checking for duplicate ids one page at a time. Each page's markup was valid on its own, and every test renders a single page, so neither the screen tests nor Lighthouse (which audits one page load) can see a duplicate that only exists after a client navigation.

## Solution

Give each id its page's or topic's slug, as the app's calculator fields already did (`growth-deposit`):

```tsx
// apps/personal-finance/app/[topic]/page.tsx, before
<section aria-labelledby="go-further" className="space-y-4">
  <h2 id="go-further" className="font-semibold text-xl">

// after
<section aria-labelledby={`${topic.slug}-go-further`} className="space-y-4">
  <h2 id={`${topic.slug}-go-further`} className="font-semibold text-xl">
```

`apps/personal-finance/app/compound-growth/page.tsx` got `growth-how-it-works`, `growth-left-out` and `growth-go-further`. After the change, the same navigation left `growth-go-further` (visible) and `investing-go-further` (hidden) in the document, each naming its own section.

## Why This Works

`aria-labelledby` and `getElementById` take the first element in document order with the id, and a hidden element still counts. Ids that carry the page's slug can't collide with a kept page's, so each section's name comes from its own heading.

## Prevention

- Treat an `id` as unique across every page a reader can visit in one tab, not only within one page. Prefix ids written by hand with the page's or the topic's slug, or use `useId()` in a client component.
- To check, navigate on the client between two pages that share a layout, then run `document.querySelectorAll('[id]')` and look for repeats. A page loaded on its own won't show them.
- The same mechanism is behind two other lessons here: `docs/solutions/ui-bugs/route-announcer-speaks-the-page-left-behind-with-metadata-titles.md` (the announcer read a kept page's `<h1>`) and `docs/solutions/ui-bugs/form-action-reset-puts-a-controlled-select-back-to-its-default-option.md` (a query returned a hidden copy of a field).
