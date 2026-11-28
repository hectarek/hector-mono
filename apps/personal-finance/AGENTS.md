# AGENTS.md — personal-finance

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers personal-finance-specific context.

## Overview

A free site Hector texts to people about personal finance: short pages, one idea each, grouped into topics, with his intro talk as the Start here walkthrough and calculators people can try. Readers have no money background and open one link on a phone. Nothing is saved or sent; everything runs in the browser. No backend, no auth, no database.

The plan of record is [docs/build-plan.md](docs/build-plan.md): requirements (R), decisions (D), key technical decisions (KTD), Hector's open calls (H) and units (U). Read its Status first.

## Stack

- Next.js 16, React 19, Tailwind CSS v4, `@repo/ui`
- Fully static: Cache Components with `ensureStatic = "navigation"` on the root layout, so the build fails if any page would render per request (KTD1). The portfolio has the same setup, but its components can't be copied as they are: it is the only app with `shadcn/no-arbitrary-values` off.
- The default `@repo/ui` theme and Geist are placeholders until Hector picks a look (U8, U9). Light only for now: no `ThemeProvider`.

## Architecture

Simple app: no DI, no use cases, no domain error classes.

```
app/
  layout.tsx           shell: <title>, skip link, header, footer, analytics
  page.tsx             home: Start here and the topic tiles
  [topic]/             one route for every topic, from src/content/topics.ts
  compound-growth/     the growth calculator: page.tsx and growth-calculator.tsx (client)
  _components/         page-title, site-header, site-footer, topic-tile, resource-item
    calculator/        the parts every calculator shares: field, headline, parts, chart and table
src/
  site.ts              SITE_NAME, SITE_URL, PREVIEW_VERSION
  seo.ts               pageMetadata, and metadataForPage(slug) from the content list
  content/             topics, pages, resources: the lists the site is built from (KTD2)
  finance/             the money math, plain TypeScript with no React (KTD7)
docs/
  build-plan.md        the plan of record
  finance-math.md      worked examples, with sources, that tests/finance asserts
  preview-card.html    the link-preview template
scripts/render-previews.ts   draws public/previews/<slug>-<PREVIEW_VERSION>.png
tests/                 bun test; tests/screens/*.test.tsx run with bun run test:screens
```

## Patterns

- Every page exports `metadata = pageMetadata({ title, description, path })`. It sets no `title`: the shell's `PageTitle` renders the only `<title>`, so Next's route announcer speaks the page that's showing (KTD11). Each page names its own preview image, because a page that sets `openGraph` drops the inherited one.
- `<Analytics />` renders only when `VERCEL_ENV` is set. `turbo.json` lists `VERCEL_ENV`, since Turbo withholds variables a build isn't told about (KTD14).
- Body text is 18px (`text-lg` on `<body>`), and tap targets are at least 44px (`min-h-11`) (R21, R22).
- Adding a page: an entry in `src/content/pages.ts`, its folder under `app/` exporting `metadata = metadataForPage("<slug>")`, and its preview: `bun scripts/render-previews.ts` from this folder, outside the Claude Code sandbox (headless Chrome). Tests fail on a page without a folder or a preview, and on a leftover preview.
- Calculator fields are `<Input data-size="lg">` (44px, 16px text, so an iPhone doesn't zoom), `type="text" inputMode="decimal" autoComplete="off"`, outside any form. `src/finance/parse.ts`'s `checkField` gives each field its range and its fix message; a comma is a thousands separator in a dollar field and a decimal point in a percent field.
- The headline is drawn twice: a visible copy that follows every keystroke, `aria-hidden`, and a screen-reader-only polite copy that settles 500ms after typing stops, so a screen reader hears it once. While a field is invalid, `ResultBody` keeps the result's height and hides its numbers (`invisible`).
- Charts are `aria-hidden`, pass `accessibilityLayer={false}` (recharts 3.11 otherwise makes the SVG a focus stop) and `isAnimationActive={false}`, and sit beside a captioned table, their equivalent. recharts is pinned to exactly `3.11.0`, `@repo/ui`'s version.

## Gotchas

- recharts 3.11 draws nothing on the server: the static page shows an empty chart box until the code runs, with the sentence, the parts and the table already there.
- In happy-dom, recharts draws only once `getBoundingClientRect` is stubbed (`tests/screens/calculator.test.tsx`).
- `@repo/ui`'s Table and Label set 14px text, and `no-restyle` refuses a typography class on them, so calculators use plain `<table>` and `<label>` for 18px (R22). `min-h-11` on a shared Button passes `no-restyle` as a layout class; `text-lg` doesn't.
- Biome refuses `tabIndex` on the table's scroll region (`noNoninteractiveTabindex`), and doesn't see a Switch inside a `<label>` (`noLabelWithoutControl`): the switch sits beside its label, as Base UI's `nativeButton` with `htmlFor`.

## Commands

```bash
bun run dev --filter=personal-finance       # http://localhost:3104 through .claude/launch.json
bun run build --filter=personal-finance     # outside the Claude Code sandbox: next/font fetches Google Fonts
cd apps/personal-finance && bun test && bun run test:screens
```

## Before Finishing Any Change

```bash
bun check --filter=personal-finance && bun ts --filter=personal-finance && bun run test --filter=personal-finance
bun run dead-code
bun run build --filter=personal-finance     # every route static (○); CI doesn't build
```
