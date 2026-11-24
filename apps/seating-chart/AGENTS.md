# AGENTS.md — seating-chart

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers seating-chart-specific context.

## Overview

A wedding seating chart: a room drawn to scale on a grid, tables and other shapes placed on it, and guests seated at the tables. Everything is saved in the browser's `localStorage`. No backend, no auth, no database. The spec, and the plan of record, is [docs/spec.md](docs/spec.md).

Real guest names and the real venue never go in the repo: tests and samples use fictional ones (the spec's D4).

## Stack

- Solid 2.0 (`solid-js`, `@solidjs/web`) on plain Vite through `@solidjs/vite-plugin`: no start mode, no server rendering, no router (the spec's KTD1). `index.html` loads `src/index.tsx`, which calls `render`. `vite build` writes static files to `dist/`.
- Tailwind v4 through `@tailwindcss/vite`. `src/styles.css` imports `@repo/ui/styles/globals.css` for the shared tokens and utilities. `@repo/ui`'s components are React and aren't used here.
- No component library: dialogs are `<dialog>` with `showModal()`, menus use the `popover` attribute (KTD3).
- Zod's smaller build, `zod/mini`, checks the saved file when it's loaded: the full build was 26 KB of the app's compressed JavaScript.

## Solid 2.0, not React and not Solid 1

Solid 2.0 went stable on 2026-11-17, after the training data of the models that build here, and the 1.x patterns they know are wrong in 2.0. Before writing or reviewing Solid code, read the primer that ships with the installed version: `node_modules/solid-js/skills/solid-2.0/SKILL.md`. Check any unfamiliar name against `node_modules/solid-js/CHEATSHEET.md`. Docs: https://docs.solidjs.com (`/llms.txt` and `/llms-full.txt` for agents).

The primer's three rules, the ones broken most:

1. Props are read, not destructured: `props.name`, never `({ name })`. Pass values, not accessors: `<C value={count()} />`.
2. `createEffect` takes two functions: compute (tracks), then apply (side effects).
3. Stores are written through the draft: `setStore(s => { s.plan.name = "B"; })`.

Imports: `createStore` and everything reactive from `solid-js`; `render`, `Portal` and the `JSX` type from `@solidjs/web` (`solid-js` 2.0 has no `JSX` export, so `import type { JSX } from "solid-js"` fails to typecheck).

## When something breaks

Solid's dev build prints each problem as `[CODE] message` with the component it came from. Each code has a section in `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md`: read it before any other debugging, and fix the cause. Never silence a code, never wrap a read in `untrack` to quiet `STRICT_READ_UNTRACKED`.

The app declares `@solidjs/diagnostics`, so the dev server answers `POST /__solid/diagnostics` (`begin`, `active`, `whyDidRun`, `costs`, `end`). How to use it: `node_modules/@solidjs/diagnostics/skills/agent-loops/SKILL.md`.

Biome's Solid rules are on for this app (the root `biome.json` turns on its `solid` domain here): `noSolidDestructuredProps` catches destructured props, the primer's first rule. Beyond that there's no Solid reactivity lint, since the repo doesn't run ESLint and `eslint-plugin-solid` is an ESLint plugin. The console's codes stand in for it, so a browser run with a clean console is part of checking a change.

## Architecture

Simple app: no DI, no use cases, no clean-architecture layers (KTD7).

```
index.html            page shell, data-theme="seating-chart"
vite.config.ts        solid() and tailwindcss()
src/
  index.tsx           render(() => <App />)
  app.tsx             the layout, the canvas's view (fit, zoom, pan) and Cmd+Z
  styles.css          self-hosted fonts, the shared stylesheet and the app's theme
  model/              plain TypeScript, no Solid imports: the saved file, geometry, presets, undo, view box
  state/plan-store.ts the store, its named actions, undo, autosave, export and import
  components/         the canvas and its shapes, the palette, the "On the plan" list, the panels
tests/
  model/              one test file per model file
```

`src/model/` imports nothing from Solid, so the logic is tested with plain `bun test` and would survive a change of framework. Put any rule that can be pure there, with a test, rather than in a component.

The look is the `seating-chart` theme in `packages/ui/src/styles/themes/seating-chart.css`, from the style tile Hector agreed on 2026-11-24. Light only. Inter, Bricolage Grotesque and IBM Plex Mono come from Fontsource packages, so no request goes to Google.

## The store

- Every change goes through a named action in `state/plan-store.ts`, never a direct store write from a component. An action writes the store, then `flush()`es and records a plain copy of the file in the undo history; autosave writes the history's present to `localStorage` 300 ms later, and again on `pagehide`.
- History entries are `structuredClone(snapshot(state.file))`. `snapshot()` alone returns unchanged subtrees as they are, so a later edit would rewrite the history.
- A drag uses `liveEdit` while it moves and `finishLiveEdit` once at the end: one undo step per drag.
- Undo, redo and import replace the file with `reconcile(…)`, which keys on `id`, so tables keep their identity and a focused item keeps focus.

## Keyboard and screen readers

The canvas is pointer-only and labelled as one picture (`role="img"`). SVG has no button, and Biome's `useSemanticElements` refuses `role="button"` on a `<g>`, so don't add one. Keyboard and screen-reader use goes through the "On the plan" list (`components/item-list.tsx`): a button per item with its spoken name (`model/describe.ts`). Focusing a button selects its item; arrows, R, Delete and Cmd+D act on it. A press on the canvas focuses the item's button and calls `preventDefault()`, without which the mouse-down that follows moves focus to the page.

## Solid 2.0 typing gotchas met here

- `aria-pressed` takes `"true"` or `"false"`, not a boolean.
- An SVG `font-size` takes a string: `font-size={String(size)}`.
- A wheel listener that calls `preventDefault()` has to be added with `addEventListener(…, { passive: false })` in `onSettled`.

## Commands

```bash
bun run dev --filter=seating-chart      # http://localhost:3103
bun run build --filter=seating-chart
bun run test --filter=seating-chart     # or: cd apps/seating-chart && bun test
```

## Before Finishing Any Change

```bash
bun check --filter=seating-chart && bun ts --filter=seating-chart && bun run test --filter=seating-chart
bun run dead-code
```
