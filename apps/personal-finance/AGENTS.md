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
  _components/         page-title, site-header, site-footer
src/
  site.ts              SITE_NAME, SITE_URL, PREVIEW_VERSION
  seo.ts               pageMetadata: canonical, og:url, the page's own preview
tests/                 bun test
```

## Patterns

- Every page exports `metadata = pageMetadata({ title, description, path })`. It sets no `title`: the shell's `PageTitle` renders the only `<title>`, so Next's route announcer speaks the page that's showing (KTD11). Each page names its own preview image, because a page that sets `openGraph` drops the inherited one.
- `<Analytics />` renders only when `VERCEL_ENV` is set. `turbo.json` lists `VERCEL_ENV`, since Turbo withholds variables a build isn't told about (KTD14).
- Body text is 18px (`text-lg` on `<body>`), and tap targets are at least 44px (`min-h-11`) (R21, R22).

## Commands

```bash
bun run dev --filter=personal-finance       # http://localhost:3104 through .claude/launch.json
bun run build --filter=personal-finance     # outside the Claude Code sandbox: next/font fetches Google Fonts
cd apps/personal-finance && bun test
```

## Before Finishing Any Change

```bash
bun check --filter=personal-finance && bun ts --filter=personal-finance && bun run test --filter=personal-finance
bun run dead-code
bun run build --filter=personal-finance     # every route static (○); CI doesn't build
```
