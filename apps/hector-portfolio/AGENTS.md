# AGENTS.md — hector-portfolio

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers portfolio-specific context.

## Overview
Static personal portfolio site for Hector Gonzalez. No backend, no auth, no database.

Deployment: Vercel; production https://www.hectorfgonzalez.com (the apex redirects to www).

## Stack
- Next.js 16, React 19, Tailwind CSS, shadcn/ui, Framer Motion
- Static data from JSON files — no API calls, no runtime fetching

## Architecture
Simple app — no DI, no domain error classes, no use cases.

```
app/
  (main)/              # Route group (about, contact, now, projects, reading)
  _components/         # Private components organized by section
    portfolio/
      hero/, proof/, skills/, projects/, experience/, approach/, contact/, about/, now/, reading/, nav/, shared/
    shared/            # brand-icons
  _providers/          # MotionProvider: LazyMotion, which loads framer-motion's features after first paint
  ui/                  # Public, noindex @repo/ui component gallery with a theme switcher; its layout imports neobrutalist.css and the TooltipProvider, so neither ships with the rest of the site
  robots.ts, sitemap.ts
src/
  data/                # Static JSON (profile, skills, experience, projects, reading-list)
  lib/                 # Data access, animations, skill icons
  shared/              # Config (site URL), SEO utils
  types/               # TypeScript types
tests/                 # Tests
```

## Docs
- `docs/spec.md`, `docs/design.md`, `docs/seo.md` and `docs/lighthouse.md` are the site's own docs.
- Hector's personal docs live in the repo's root `docs/private/` (`../../docs/private/`), which is gitignored: they exist only on his machine and never reach the repo (see [docs/public-repo.md](../../docs/public-repo.md)). Its `about.md`, the dossier, is the source of truth for facts about Hector; portfolio copy is derived from it, so change facts there first. Nothing from it goes into `src/data/` or a rendered page unless it's already public on the site.

## Data
- All data lives in `src/data/*.json`
- `src/lib/data.ts` exposes typed getters: `getProfile()`, `getSkills()`, `getExperience()`, `getProjects()`, etc.
- Pages call these directly in Server Components

## Patterns
- Server Components by default — no `"use client"` unless needed for interactivity
- `generateStaticParams()` for dynamic project routes
- Metadata per page through `generateSEOMetadata()` from `src/shared/utils/seo.ts`, with the page's required `path`: it becomes the page's canonical and `og:url`. Every page also gets the share card `public/og-image.png` unless it passes `image`. The root layout sets no URLs (they'd be inherited as the home page's), and a client page puts its metadata in a sibling `layout.tsx` (`app/ui/layout.tsx`). See `docs/seo.md`.
- The canonical origin is `SITE_URL` in `src/shared/config/site.ts` (`https://www.hectorfgonzalez.com`), used by the SEO utils, `app/sitemap.ts` and `app/robots.ts`. There's no env var for it.
- Framer Motion for animations: components use `m` from `framer-motion` (see the light-only note below), with shared variants (`fadeInUp`, `heroVariants`/`heroItem`, `viewportOptions`, etc.) from `src/lib/animations.ts`, and `useScrollReveal()` (`src/lib/use-scroll-reveal.ts`) for scroll-in reveals that respect reduced motion
- Light only (2026-10): no `ThemeProvider`, so the theme's `.dark` tokens never apply; `viewport.colorScheme` is `light` in `app/layout.tsx`. Don't add `next-themes` back for this site.
- Animations use `m.*` from `framer-motion` inside `MotionProvider` (`LazyMotion strict`): a `motion.*` component throws. Above-the-fold content (the hero) renders with `initial={false}`, so it's visible on first paint; fading it in from opacity 0 delayed LCP until hydration.
- Vercel Web Analytics: `<Analytics />` in the root layout, rendered only when `VERCEL` is set at build (the script is served by Vercel, so a local build would log a 404). Enabled per project in the Vercel dashboard.

## What NOT to Add
Static site — keep it simple. No auth, no database, no API routes, no TanStack Query, no DI containers, no use cases, no domain error classes.

## Brand Voice
Personal portfolio for Hector Gonzalez: a full-stack engineer, strongest on the front end, who ships AI features. The full voice and style guide is `docs/spec.md` §5; this is the short version.
- **Direct** — information-first, no fluff
- **Analytical** — grounded in reasoning and structure
- **Pragmatic** — minimal, efficient, purpose-driven
- **Builder mindset** — focuses on systems and execution
- Avoid filler words: "excited", "passionate", "synergy"

## Visual Style
- Minimal, clean grids; neutral colors (white, black, gray, sparse accents)
- Small animations via Framer Motion
- Code snippets and diagrams as visuals
- Colours come from the shared portfolio theme (`@repo/ui/styles/themes/portfolio.css`, `data-theme="portfolio"` on `<html>`), through the contract tokens only: ink is `foreground`, soft ink `muted-foreground` (also for small labels: faint ink `muted-foreground/70` failed WCAG contrast for text, so it's only for non-text marks such as bullet dots), paper `background`, the second paper `muted`, a rule `border`, a strong rule `foreground/25`, honey `accent`. The design lint fails the build on anything else.
- Buttons in the mono, uppercase label style use `size="label"` with the `default` or `outline` variant; don't restyle a Button's type or colour.
- Fonts: Geist is `font-sans`, IBM Plex Mono `font-mono` (display type too), Instrument Serif `font-serif`. The dot-grid texture inside a card is `data-texture="dot-grid"` and the handwritten accent `data-font="hand"`, both styled in `app/globals.css`.

## Commands
```bash
bun run dev --filter=hector-portfolio
bun run build --filter=hector-portfolio
bun run test --filter=hector-portfolio
cd apps/hector-portfolio && bun run lighthouse   # Lighthouse CI against a production build; see docs/lighthouse.md
```

## Before Finishing Any Change
Scope checks to this app:
```bash
bun check --filter=hector-portfolio && bun ts --filter=hector-portfolio && bun run test --filter=hector-portfolio
```
