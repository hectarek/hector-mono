# AGENTS.md — hector-portfolio

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers portfolio-specific context.

## Overview
Static personal portfolio site for Hector Gonzalez. No backend, no auth, no database.

## Stack
- Next.js 16, React 19, Tailwind CSS, shadcn/ui, Framer Motion
- Static data from JSON files — no API calls, no runtime fetching

## Architecture
Simple app — no DI, no domain error classes, no use cases.

```
app/
  (main)/              # Route group (about, contact, projects)
  _components/         # Private components organized by section
    portfolio/
      hero/, skills/, projects/, experience/, contact/, about/, nav/
  _providers/          # @repo/ui ThemeProvider + TooltipProvider + Toaster
src/
  data/                # Static JSON (profile, skills, experience, projects)
  lib/                 # Data access, animations, skill icons
  shared/              # Config, SEO utils
  types/               # TypeScript types
tests/                 # Tests
```

## Docs
- `docs/SPEC.md`, `docs/design.md`, `docs/seo.md` and `docs/lighthouse.md` are the site's own docs.
- Hector's personal docs live in the repo's root `docs/private/` (`../../docs/private/`), which is gitignored: they exist only on his machine and never reach the repo (see [docs/public-repo.md](../../docs/public-repo.md)). Its `about.md`, the dossier, is the source of truth for facts about Hector; portfolio copy is derived from it, so change facts there first. Nothing from it goes into `src/data/` or a rendered page unless it's already public on the site.

## Data
- All data lives in `src/data/*.json`
- `src/lib/data.ts` exposes typed getters: `getProfile()`, `getSkills()`, `getExperience()`, `getProjects()`, etc.
- Pages call these directly in Server Components

## Patterns
- Server Components by default — no `"use client"` unless needed for interactivity
- `generateStaticParams()` for dynamic project routes
- `generateMetadata()` per page using `generateSEOMetadata()` from `src/shared/utils/seo.ts`
- Framer Motion for animations via `animated-section`, `animated-item`, `animated-container`
- Dark/light mode via `ThemeProvider` / `useTheme` from `@repo/ui/components/theme-provider` (follows the system setting; no toggle)

## What NOT to Add
Static site — keep it simple. No auth, no database, no API routes, no TanStack Query, no DI containers, no use cases, no domain error classes.

## Brand Voice
Personal portfolio for Hector Gonzalez — CTO, Full-Stack Engineer, Entrepreneur.
- **Direct** — information-first, no fluff
- **Analytical** — grounded in reasoning and structure
- **Pragmatic** — minimal, efficient, purpose-driven
- **Builder mindset** — focuses on systems and execution
- Avoid filler words: "excited", "passionate", "synergy"

## Visual Style
- Minimal, clean grids; neutral colors (white, black, gray, sparse accents)
- Small animations via Framer Motion
- Code snippets and diagrams as visuals
- Colours come from the shared portfolio theme (`@repo/ui/styles/themes/portfolio.css`, `data-theme="portfolio"` on `<html>`), through the contract tokens only: ink is `foreground`, soft ink `muted-foreground`, faint ink `muted-foreground/70`, paper `background`, the second paper `muted`, a rule `border`, a strong rule `foreground/25`, honey `accent`. The design lint fails the build on anything else.
- Buttons in the mono, uppercase label style use `size="label"` with the `default` or `outline` variant; don't restyle a Button's type or colour.
- Fonts: Geist is `font-sans`, IBM Plex Mono `font-mono` (display type too), Instrument Serif `font-serif`. The dot-grid texture inside a card is `data-texture="dot-grid"` and the handwritten accent `data-font="hand"`, both styled in `app/globals.css`.

## Commands
```bash
bun run dev --filter=hector-portfolio
bun run build --filter=hector-portfolio
```

## Before Finishing Any Change
Scope checks to this app:
```bash
bun check --filter=hector-portfolio && bun ts --filter=hector-portfolio
```
