---
title: An image that never changes per request ships as a file made once, not a next/og route
date: 2026-11-23
category: developer-experience
module: "Every app in hector-mono with icons or link previews under the design rules"
problem_type: developer_experience
component: frontend
severity: medium
applies_when:
  - "Adding home-screen icons, a favicon or Open Graph images to an app"
  - "Copying recipes' next/og app-icon.tsx pattern into another app"
  - "Oxlint fails with shadcn(no-inline-styles) on an ImageResponse, or Biome warns noImgElement on one"
root_cause: wrong_api
resolution_type: code_fix
related_components: [development_workflow]
tags: [next-og, image-response, link-previews, pwa-icons, design-lint, oxlint, biome]
---

# An image that never changes per request ships as a file made once, not a next/og route

## Context

Community Game Library needed its home-screen icons (192, 512, and Apple's 180) and three link-preview images at 1200 by 630 for the welcome page and the friend and night links: the name stacked in Stardos Stencil over a line in IBM Plex Sans, on kraft (the design's Y2). Recipes draws its icon with `next/og` (`apps/hectors-recipes/app/_lib/app-icon.tsx`, an `ImageResponse` of a plain `<img>`), so the first draft copied that, and drew the previews in a route the same way, with inline style objects and fonts read from `@fontsource` `.woff` files (`ImageResponse` takes `ttf`, `otf` or `woff`, and `next/font` serves `woff2`).

Neither passes this repo's lint:

- Biome's `lint/performance/noImgElement` warns on the `<img>`. Recipes' file passes only because the root `biome.json` exempts it by name, and the root `AGENTS.md` doesn't let an agent widen an exemption.
- Oxlint's shadcn design rules (`docs/lint-and-dead-code.md`) fail every style `next/og` needs: `no-inline-styles` on the style objects, and `no-raw-colors` and `no-arbitrary-values` for anything styled another way. Satori, which `next/og` runs on, takes only inline styles: it can't read the app's classes or CSS variables. Drawing the icon as a `div` with the SVG as its background image clears the `<img>` warning and still fails `no-inline-styles`.

## Guidance

When an image is the same for every request, render it once with `next/og` and commit the PNG:

- Run the `ImageResponse` code as a throwaway Bun script that writes each PNG, then delete the script.
- Icons go in `public/icons/` (the manifest's `src`), and Apple's in `app/apple-icon.png`, Next's static file convention for it. The favicon can be the design system's SVG as `app/icon.svg`, given a `<title>` (Biome's `noSvgWithoutTitle`).
- Link previews go in `public/previews/<kind>.png`, and each page's metadata points at its file (`apps/community-game-library/app/_lib/link-previews.ts`, `previewMetadata`).
- Drop the font packages once the files exist, and write the sizes, fonts and colors in the app's `AGENTS.md`, so a design change makes them again the same way.
- A test reads each PNG's header for its width and height (`apps/community-game-library/tests/app/link-previews.test.ts`), so a file put back at the wrong size fails.
- The proxy's matcher lets the files through signed out (`manifest.webmanifest`, `icon.svg`, `apple-icon.png`, `icons/`, `previews/`): a phone and a chat app fetch them without cookies.
- `metadataBase` can stay unset on Vercel: Next makes a social image's address absolute from `VERCEL_BRANCH_URL` on a preview and `VERCEL_PROJECT_PRODUCTION_URL` on production (`dist/lib/metadata/resolvers/resolve-url.js` in the `next` package), and only `next dev` warns about it.

## Why This Matters

The design rules can't be loosened (the root `AGENTS.md`: no rule disabled, downgraded or overridden per folder, and a rule that genuinely blocks is raised with Hector), and `next/og` can only style inline, so a `next/og` route in a ruled app means asking for a new exemption. A file needs none, costs nothing per request, and can't fail at build or run time over a font or a network fetch.

## When to Apply

- The image doesn't depend on the request: an app icon, a favicon, or a preview that's the same for every link of its kind. A preview that names its subject wouldn't be, and this app's previews deliberately name nobody.
- An image that has to change per request would still need `next/og`, and with it a decision from Hector on the rules.

## Examples

Community Game Library's U23, under `apps/community-game-library/`: `apps/community-game-library/public/icons/icon-192.png` and `icon-512.png`, `apps/community-game-library/app/apple-icon.png`, `apps/community-game-library/app/icon.svg`, and `apps/community-game-library/public/previews/app.png`, `friend.png` and `night.png`. Its manifest (`apps/community-game-library/app/manifest.ts`) and `previewMetadata` point at them, and its `AGENTS.md` (U23's patterns) holds how they were drawn.

## Related

- `docs/lint-and-dead-code.md`: the design rules and the root `biome.json`'s exemption for recipes' `next/og` icon.
- `docs/fast-first-open.md`, pattern 6: the service worker that came in the same unit.
