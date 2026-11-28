---
title: "ensureStatic covers only the params a route lists: other values, and /favicon.ico, render on their first request"
date: 2026-11-28
category: developer-experience
module: "apps/personal-finance, and any app here on cacheComponents with `ensureStatic` and a dynamic segment"
problem_type: documentation_gap
component: frontend
severity: low
applies_when:
  - "Writing that an app on Cache Components with `ensureStatic = \"navigation\"` is fully static"
  - "Adding a top-level dynamic segment such as `app/[topic]/page.tsx` to an app with no icon file"
  - "Reaching for `dynamicParams = false` to stop unlisted values rendering"
root_cause: inadequate_documentation
resolution_type: documentation_update
related_components: [development_workflow]
tags: [nextjs, cache-components, ensure-static, generate-static-params, dynamic-params, favicon, prerender, not-found]
retire_when: "Next.js makes `dynamicParams` (or an equivalent) available under Cache Components; check the bundled `dynamicParams.md` of the installed `next`"
---

# ensureStatic covers only the params a route lists: other values, and /favicon.ico, render on their first request

## Context

`apps/personal-finance` is meant to be fully static. Its root layout exports `ensureStatic = "navigation"` (`apps/personal-finance/app/layout.tsx:25`), and its `AGENTS.md` said that this makes "the build fail if any page would render per request". The Batch 1 code review showed that the sentence promised more than Next gives.

The app has two dynamic segments, `apps/personal-finance/app/[topic]/page.tsx` and `apps/personal-finance/app/start/[step]/page.tsx`, each with a `generateStaticParams` that lists every topic and every step. The build prerenders those values. But `next build` writes both dynamic routes with `fallback: null` in the build's `.next/prerender-manifest.json` (a build output, not in the repo), which is an on-request render, and Next 16.4.6's bundled docs say what that means:

- `ensureStatic.md`, "Dynamic route parameters": with `'navigation'`, "When a request uses a value that was not prerendered at build time, Next.js waits for the static result to be generated before serving it." The build fails only when `generateStaticParams` is missing or returns an incomplete parameter set.
- `dynamicParams.md`: "`dynamicParams` is not available when Cache Components is enabled." So there is no `dynamicParams = false` to turn the unlisted values into a plain 404.

Two kinds of request reach that path:

- **A mistyped or outdated link**, such as `/start/no-such-step`. On `next start` it rendered the not-found page with a 404.
- **The browser's own `/favicon.ico` request.** The app has no `app/favicon.ico` or `app/icon.png`, so `/favicon.ico` matches the top-level `[topic]` segment as a topic called `favicon.ico`, and it is rendered on request too. `apps/hector-portfolio` has the same `ensureStatic` setup, but it ships `app/favicon.ico` and `app/apple-icon.png`, and has no top-level dynamic segment.

Whether Next then keeps each not-found result as a static page for the next request wasn't measured.

## Guidance

- Claim "fully static" only for the values `generateStaticParams` lists. `ensureStatic = "navigation"` guarantees that every listed page prerenders, and that nothing in a listed page reads request data. It doesn't stop an unlisted value from rendering when someone asks for it.
- Ship an app's icons as files (`app/favicon.ico` or `app/icon.png`, plus `app/apple-icon.png`) when it has a top-level dynamic segment, so the automatic icon requests are static files and never reach the segment. `docs/solutions/developer-experience/next-og-images-ship-as-files-made-once.md` covers how to make them under the design rules.
- Don't add `export const dynamicParams = false` to get a plain 404: it isn't available under Cache Components.

## Why This Matters

The difference shows up only on a deployment, where an unlisted value costs a server render and the not-found page reaches the reader only after that render. A doc that says the build fails on any per-request render tells the next agent there is nothing to check. Nothing in the code shows the gap either: `next build` passes, and every listed route shows as `○`.

## When to Apply

Any app here with `cacheComponents` on, `ensureStatic` on the root layout, and a dynamic segment, above all a top-level one (`app/[slug]/page.tsx`) that also catches `/favicon.ico`, `/apple-touch-icon.png` and other paths browsers and crawlers ask for.

## Examples

The app's `AGENTS.md`, before and after (hectarek/hector-mono, the Batch 1 pull request for apps/personal-finance):

```md
<!-- before -->
- Fully static: Cache Components with `ensureStatic = "navigation"` on the root layout, so the build fails if any page would render per request (KTD1).

<!-- after -->
- Fully static: Cache Components with `ensureStatic = "navigation"` on the root layout, so the build fails if any listed page would render per request (KTD1). A path that isn't listed, such as a mistyped topic or step, or `/favicon.ico` until the site has icons (U9), still renders on request, to the not-found page: `dynamicParams` isn't available under Cache Components.
```

The site's icons are planned into the theme unit (U9 in `apps/personal-finance/docs/build-plan.md`), since they follow the look that unit applies.
