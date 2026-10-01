# AGENTS.md — @repo/ui

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers shared-UI-specific context.

## Overview
Shared shadcn/ui component library consumed by every app. **Always check here before creating a new component in an app.**

## Structure
```
src/
  components/   # shadcn/ui primitives (button.tsx, dialog.tsx, sidebar.tsx, ...) + theme-provider.tsx
  hooks/        # Shared hooks (use-mobile.ts)
  lib/          # utils.ts (exports `cn`), themes.ts
  styles/       # globals.css (Tailwind v4 entry + token→utility mapping)
    themes/     #   default.css (always on), <name>.css (opt-in, data-theme="<name>")
tests/          # mirrors src/ (bun test): tests/src/styles/themes.test.ts guards the theme contract
```

## Consuming from apps
Setting up a new app (components.json, globals.css, fonts, ThemeProvider) is a step-by-step in [docs/ui-package.md](../../docs/ui-package.md).
Import via the package export paths (no barrel files):
```ts
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";
```

## Adding components
Use the shadcn CLI, don't hand-write primitives. This follows shadcn's official monorepo setup: every app has a `components.json` whose `ui` alias is `@repo/ui/components`, so running the CLI **from an app** installs base components here (and blocks into that app):
```bash
cd apps/<app> && bunx --bun shadcn@latest add <component>     # → packages/ui/src/components
cd packages/ui && bun run ui:add <component>                  # same, from this package
bunx --bun shadcn@latest add <component> --diff src/components/<component>.tsx  # compare with upstream
```
- Every `components.json` (this package and each app) must keep the same `style: base-nova`, `baseColor: neutral` and `iconLibrary: lucide`; the CLI requires it.
- An app's `components.json` also tells the shadcn lint plugin (oxlint) which design system the app uses: `tailwind.css` points at this package's `globals.css`, so colours or classes an app defines only in its own stylesheet are reported as unknown. That's intended: a colour belongs in the shared theme, not one app.
- `lib/utils.ts` is shadcn's own `export { cn } from "cn"` (the `cn` package replaces clsx + tailwind-merge). Registry components import `cn` straight from `"cn"`, as shadcn ships them (leave it, or every CLI update fights you); apps and hand-written components import it from `@repo/ui/lib/utils`.
- Updating: `shadcn add <names> --overwrite --yes` from this package, run `bun run lint` (Biome formats the registry code to repo style), `bun ts` across the repo, then diff screenshots. Lint and typecheck will flag upstream code that breaks our rules. Fix that code in the component; never relax the rule (root AGENTS.md). Spots the 2026-09 update needed, which the next overwrite will re-flag:
  - `scroll-area.tsx`: unused `React` import
  - `field.tsx`: `==` → `===`
  - `sidebar.tsx`: `setOpenMobile` (a stable state setter) listed as a hook dependency twice
  - `calendar.tsx`: `modifiers.x` → `modifiers["x"]` (the portfolio sets `noPropertyAccessFromIndexSignature`, and apps typecheck this package's source)
  - `button.tsx`: our `quiet` variant (low-emphasis actions in `muted-foreground`, e.g. "Clear checked") and `label` size (mono, uppercase, letter-spaced, 40px: the portfolio's buttons; colours come from the variant). The overwrite drops both; add them back.
- Components here are registry code plus only the lint/type fixes above, so an update is an overwrite followed by re-applying what the checks flag. `file-drop-zone` and `theme-provider` are ours, not registry components; never overwrite them.
- Packages an app also imports directly must resolve to ONE version repo-wide. `recharts` is the known one: an app's `BarChart` inside `ChartContainer` from a different copy renders nothing, with no error. Pin it in every app that imports it to exactly this package's `recharts` version.
- Apps that use `Tooltip` (directly or through `Sidebar`) render one `<TooltipProvider>` at the root (shadcn's current pattern; `Tooltip` no longer wraps its own). Without it tooltips still work but use Base UI's default open delay.
- `Button` spreads props after its own `data-slot`, so `<DialogTrigger render={<Button />}>` renders `data-slot="dialog-trigger"`, not `"button"`. Don't style or query components by `data-slot="button"` assuming every button has it; match `:is([data-slot="button"], .group\/button)` (every Button keeps its `group/button` variant class), as the neobrutalist theme does.
- `globals.css` imports `shadcn/tailwind.css` (devDependency `shadcn`): the `data-open`/`data-checked`/`data-active`/orientation variants, accordion keyframes and `no-scrollbar` utility the components are written against. Without it, state styling (tab indicators, scrollbars, open/closed) silently doesn't apply.

## Theming
Same model as shadcn (tokens in `:root` / `.dark`, exposed through `@theme inline`), extended to several brand themes. shadcn only documents one theme per stylesheet.
- **The contract** is the token list at the top of `themes/default.css`: shadcn's set, plus `success`, `warning`, `info` (each with `-foreground`), `chart-foreground` (text on a chart colour used as a fill), plus `radius`. `globals.css` maps every one to a Tailwind utility, identically for every theme. Components and apps use only these (`bg-primary`, `text-warning-foreground`, `rounded-lg`). A new colour role is a contract change: add it to `default.css` (light and dark), the `@theme inline` list, and the test's `CONTRACT`.
- **Default theme** (`themes/default.css`) is shadcn preset `b1YmpVjjs` exactly, as `shadcn init` writes it, plus the status colours (foreground on its colour ≥ 7.6:1 in both modes). It always loads.
- **Other themes** are `themes/<name>.css`: `[data-theme="<name>"]` for light and `[data-theme="<name>"].dark, .dark [data-theme="<name>"]` for dark. They may set only some tokens (the rest come from the default), but every token set for light must also be set for dark, or the light value leaks into dark mode; the test enforces it. An app opts in with `@import "@repo/ui/styles/themes/<name>.css"` after the base import, plus `data-theme="<name>"` on `<html>`. Prefer token-only themes. `neobrutalist.css` also restyles components by `data-slot`, which is more fragile across shadcn updates. It colours every Card with `--primary`; `<Card data-card="plain">` asks for a plain (secondary) card instead, a theme-level option that leaves the component untouched. `recipes.css` is generated from the "Hector's Recipes" Claude Design system (its README links it); change the system, then regenerate, rather than hand-editing values. `portfolio.css` is the portfolio's neutral paper and ink with a honey accent, token-only; its in-between shades are tokens at an opacity (faint text `text-muted-foreground/70`, a strong rule `border-foreground/25`) rather than contract roles.
- **Surfaces** (a theme may define them): tokens re-valued for one kind of page, selected by `[data-theme="<name>"]:has([data-surface="<surface>"])`, with dark as `[data-theme="<name>"].dark:has(…), .dark [data-theme="<name>"]:has(…)`. A page puts `data-surface` on its root element; `:has()` applies it to the whole document, so dialogs and drawers (portalled to `<body>`) match. The test checks dark covers every surface token. `recipes.css` has `reading` and `cook`.
- **Density:** a theme may set Tailwind's `--spacing` (`recipes.css`: `0.3125rem`, 5px steps), which scales every padding, gap, height and `size-*` class, components included; font sizes don't change.
- **Safe areas:** `pt-safe` / `pb-safe` pad by the iPhone notch / home-indicator inset; `pt-safe-4`, `pb-safe-20`, `bottom-safe-18` add that many spacing steps on top. Use these, never `env(safe-area-inset-*)` in arbitrary values.
- **Selecting themes:** `data-theme` picks the brand, and the `dark` class (next-themes) picks light or dark. They are independent, so every theme works in both modes.
- **Dark mode:** every app except `relationship-meter` wraps its tree in `ThemeProvider` from `@repo/ui/components/theme-provider` (shadcn's provider: `class` attribute, `system` default, no transition flash) and reads or sets the mode with `useTheme` from the same module. Never import either from `next-themes` directly: its default attribute is `data-theme`, which would overwrite the brand theme, and a second declared copy of `next-themes` can split the context. Apps don't list `next-themes` as a dependency. `relationship-meter` is light-only: neobrutalist (`data-theme="neobrutalist" data-neo="blue"` on `<html>`) with no `ThemeProvider`. In Neon Auth apps the `ThemeProvider` goes outside `NeonAuthUIProvider`, whose own next-themes provider then steps aside (only while both resolve to one `next-themes` copy; `hectors-recipes` has a test for it).
- **Fonts** aren't theme tokens. Each app loads them with `next/font`, using `variable: "--font-sans"` (required), `"--font-heading"` and `"--font-mono"` (optional), and puts those classes plus `font-sans` on `<html>`, as shadcn's reference app does. `globals.css` maps `font-sans` / `font-heading` / `font-mono` with fallbacks.
- **Radius:** one `--radius` per theme; `rounded-sm`…`rounded-4xl` derive from it (shadcn's multiplicative scale).
- **Tailwind sources:** `globals.css` has `@source "../**/*.{ts,tsx}"` for this package; apps' own files are auto-detected, so apps add no `@source` lines.
- **Apps using Neon Auth UI** (recipes, stash): import `@neondatabase/auth/ui/tailwind` *after* `@repo/ui/styles/globals.css` (it must come after Tailwind; before it, Tailwind wrote the font mapping to `:root` as a self-reference and every app fell back to the system font). Neon re-points Tailwind's colours and radius at `--neon-*` variables. The colours fall back to our tokens, so themes still apply when set on `<html>` (not on a subtree). The radius is a fixed `0.625rem`, so those apps set `:root { --neon-radius: var(--radius); }`. Neon also puts `* { border-color }` in `@layer neon-auth`. Named after Tailwind's layers, that layer outranks utilities and beats `border-transparent` (ghost buttons grow borders), so those apps' stylesheets start with `@layer theme, base, neon-auth, components, utilities;`. Copy `apps/hectors-recipes/app/globals.css` for any new Neon app.

## Conventions
- kebab-case filenames, one component group per file
- Use `class-variance-authority` for variants (match existing `button.tsx` pattern)
- `react`/`react-dom` are peer deps — never add them as direct deps here
- Keep components presentational; app-specific logic stays in the consuming app

## Before Finishing Any Change
Every app consumes this package, so check them too: Turbo's leading `...` adds the packages that depend on `@repo/ui`.
```bash
bun check --filter=...@repo/ui && bun ts --filter=...@repo/ui && bun run test --filter=...@repo/ui
```
