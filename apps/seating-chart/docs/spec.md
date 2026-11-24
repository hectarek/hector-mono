---

title: Seating Chart - Spec
type: feat
date: 2026-11-24
execution: code
---

# Seating Chart - Spec

The spec for `apps/seating-chart`, a seating chart for planning a wedding: a room drawn to scale on a grid, tables and other shapes placed on it, and guests seated at the tables. Everything is saved in the browser's local storage, with no accounts and no server. A path that starts with `src/`, `tests/` or `docs/` is inside `apps/seating-chart/`.

---

## Status

|                   |                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Phase             | Batch 1 (U1 to U3) is built on the branch, not committed: the style tile is agreed, and every shared check passes (2026-11-24) |
| Next              | Batch 1's pull request, with the Vercel project made first (H4); then Batch 2 (U4, U5)                                         |
| Waiting on Hector | His OK to commit Batch 1, make the Vercel project and push                                                                     |
| Updated           | 2026-11-24                                                                                                                     |

---

## How to read this spec

- Requirements (R) say what the app does. Each ends with where it came from: _asked_ is from Hector's request of 2026-11-24, and _gap_ is something Claude added because a seating tool is expected to do it. Any gap can be cut.
- Decisions (D) are product choices, and key technical decisions (KTD) are choices of mechanism. Each has its reason. Claude proposed them on 2026-11-24, and Hector agreed them the same day by answering H1 to H5.
- Needs from Hector (H) are calls only he can make. Each records his answer.
- Units (U) are the build's steps, and a batch is the units one pull request holds.

---

## Goal Capsule

- **Objective:** draw the reception room to scale, try table layouts, seat every guest at a table, and print a chart the venue and the coordinator can use on the day.
- **Means:** a client-only web app in hector-mono, built on Solid 2.0 with plain Vite (KTD1), drawn in SVG (KTD2), and saved in `localStorage` (KTD5).
- **Authority:** requirements win on behavior, and key technical decisions win on mechanism. The root `AGENTS.md` rules (never loosen a check, nothing personal in the public repo) override this spec.
- **Stop conditions:**
  - A shared check (Biome, Oxlint, Fallow, `tsc`) fails on Solid code for a reason the code can't fix: stop and bring the options to Hector. Never scope or loosen the rule to pass.
  - Any task would put a real guest's name or the real venue into the repo: stop. Real data lives only in the browser. Tests and samples use fictional names.

---

## What the Solid spike taught, and what this app does with it

The Solid 2.0 spike of the Community Game Library ([docs/solid-2-spike.md](../../../docs/solid-2-spike.md), branch `spike/community-game-library-solid`) found four blockers for that app, and Hector kept React and Next.js for it on 2026-11-20. Claude recommended then that Solid 2.0 be tried on a smaller app. This is that app. Most of what blocked the spike came from the server, sign-in and the component library, and a local-storage app needs none of the three.

| The spike found (2026-11-20)                                                                                                   | Checked again 2026-11-24                                                                                                                                       | What this app does                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Start mode reaches Vercel only through Nitro v3, a release candidate                                                           | Nitro's latest is still `3.0.261103-rc` on npm. Solid's docs describe a plain Vite setup, without start mode, whose `vite build` writes static files to `dist` | Plain Vite, no start mode, no server rendering, no Nitro. Vercel's Vite preset runs `vite build` and serves `dist` (KTD1, KTD8)                                    |
| Neon Auth's components are React-only, and Better Auth's Solid client supports Solid 1 only                                    | Not rechecked: this app has no sign-in                                                                                                                         | No accounts (D1)                                                                                                                                                   |
| Kobalte's Solid 2 release is an alpha whose dialog doesn't close on Escape                                                     | `@kobalte/core`'s Solid 2 release is still `2.0.0-alpha.5` on npm                                                                                              | No component library. Native `<dialog>` (Escape closes it), the popover attribute, and plain form controls (KTD3)                                                  |
| `@repo/ui` is React, so every component would be rebuilt                                                                       | Its stylesheet, `@repo/ui/styles/globals.css`, is Tailwind v4 CSS and tokens with no React in it                                                               | Use the shared stylesheet and a theme for tokens and Tailwind classes; build the few components the app needs (KTD4)                                               |
| Biome's `noHeadElement` fired on start mode's `src/Document.tsx`                                                               | The plain setup has an `index.html` and no JSX `<head>`                                                                                                        | Expect it not to arise. U1 confirms                                                                                                                                |
| Oxlint's `shadcn(no-unknown-classes)` fired on the spike's plain CSS classes                                                   | `@shadcn/lint`'s README lists React, Vue and Svelte, not Solid                                                                                                 | Tailwind classes from the shared theme. U1 plants a made-up class and a raw color to prove the design lint reads Solid's `class` attribute                         |
| Bun compiles JSX for React's runtime, so a screen test under `bun:test` needs a Bun plugin running Solid's compiler (15 lines) | `@solidjs/testing-library` is still `1.0.0-rc.2`                                                                                                               | The model (geometry, saving, undo) is plain TypeScript, tested with `bun test` and no plugin. Screen tests, if any, reuse the spike's plugin and happy-dom preload |
| The inner layers carried over unchanged                                                                                        | Not applicable                                                                                                                                                 | `src/model/` imports nothing from Solid, so the logic would survive a move back to React                                                                           |
| Agents' training data has Solid 1.x patterns, which are wrong in 2.0                                                           | Solid 2.0 has been stable since 2026-11-17. `https://v2.solidjs.com/llms.txt` now redirects to `https://docs.solidjs.com/llms.txt`                             | The app's `AGENTS.md` carries Solid's 2.0 primer, as the spike's did, and points at `docs.solidjs.com`. U1 fixes the old link in `docs/solid-2-spike.md`           |
| A new Vercel project's first push went to production from a branch                                                             | The lesson stands ([docs/solutions](../../../docs/solutions/developer-experience/new-vercel-projects-first-deployment-went-to-production-from-a-branch.md))    | This app has no variables and no server data, so a stray production build exposes nothing. Still, no custom domain until `main` has deployed (H4)                  |
| 60 to 75 KB of compressed JavaScript per page, against 207 KB for recipes                                                      | Measured 2026-11-24 after U3                                                                                                                                   | 46 KB for the whole app, compressed, and 6 KB of CSS. Zod's full build was 26 KB of an earlier 63 KB, so the schema uses `zod/mini` (8 KB with the schema)         |

Two gaps remain with Solid here. There's no full Solid reactivity lint, since the repo doesn't run ESLint and `eslint-plugin-solid` is an ESLint plugin. Biome's own Solid rules cover part of it (U1 turned them on), and Solid's dev-mode warnings (`STRICT_READ_UNTRACKED` and the like) in the browser console cover the rest. And Fallow's React-specific rules (`unrendered-components`, `unused-component-props`) haven't yet run on a Solid component; U3 has the first ones.

---

## Product Contract

### Summary

One person plans the reception on a laptop or tablet. They set the room's size, place tables of real sizes and the other things that take floor space (a dance floor, the bar, a stage), and move them until the layout works. Then they enter the guest list and seat each guest at a table, seeing which tables are full and who is still unseated. At the end they print the floor plan, a list for each table, and an alphabetical list of guests with their table numbers.

### Problem frame

Seating a wedding is a layout problem and a people problem at once. The room limits how many tables fit and where, the rental company sells tables in a few fixed sizes, and the guest list decides how many seats are needed. Paper sketches and spreadsheets each hold half of it: a sketch isn't to scale and can't be reshuffled, and a spreadsheet can't show whether the tables fit. Changing one table means redrawing or recounting.

### Words this spec uses

- **Plan:** one layout of one room, with its tables, fixtures and guests.
- **Room:** the floor area being planned, a rectangle with a width and a length.
- **Table:** a shape guests sit at. It has a seat count.
- **Fixture:** a shape that takes floor space but seats nobody: a dance floor, a bar, a stage, a pillar, a door, a text label.
- **Seat:** one place at a table. A guest is seated at a table, and optionally at one seat of it.
- **Party:** guests who arrive together, such as a couple or a family, and usually sit together.
- **Group:** how the planner sorts guests, such as "Bride's family" or "College friends".

### Requirements

**The room and the grid**

- R1. The room has a width and a length in feet. The canvas draws it to scale on a grid with a line every foot and a heavier line every 5 feet. _asked_
- R2. Zoom with the wheel, a pinch or buttons; pan by dragging empty floor; "Fit to room" shows the whole room. _asked_

**Tables and shapes**

- R3. Add a table from a palette of presets: round, rectangle and square, in common rental sizes, each with a starting seat count. A table's size and seat count can be changed after. _asked_
- R4. A rectangle table seats guests on both long sides, on all four sides, or on one side only (a head table). _gap_
- R5. Add a fixture: a dance floor, stage, bar, buffet, cake table, gift table, DJ, door, pillar, or a free text label. A fixture is a rectangle or a circle with a name. _asked_
- R6. Every table and fixture shows its label, and every table its seat marks around it, drawn to scale. _asked_

**Arranging**

- R7. Drag a table or fixture to move it. It snaps to the grid; holding Alt moves it freely. _asked_
- R8. Rotate, resize, duplicate and delete the selected item, from a side panel and from the keyboard. _asked_
- R9. Arrow keys move the selected item one grid step, and Shift with an arrow five steps. Every item can be reached with Tab and has a spoken name, such as "Table 4, round 60 inches, 7 of 8 seats filled". _gap_ _Changed 2026-11-24 (U3): the keyboard reaches items through an "On the plan" list of buttons beside the canvas, not on the canvas itself (KTD2)._
- R10. Undo and redo, with Cmd+Z and Shift+Cmd+Z. _gap_

**Saving**

- R11. Every change is saved in this browser as it happens. Reopening the app, or the browser, shows the plan as it was left. _asked_
- R12. Export the plan to a file, and import a file to replace it. This is the backup, and the way to move a plan to another device or person (D1). _gap_
- R13. The app shows when the plan was last exported, and asks for an export once the last one is more than seven days old (KTD5 says why). _gap_

**Guests** (if Hector keeps them in this version: H2)

- R14. Add guests one at a time, or paste a list with one name per line, or rows copied from a spreadsheet (name, party, group, meal). _gap_
- R15. A guest has a name, and optionally a party, a group, a meal choice and notes. _gap_
- R16. Seat a guest by dragging them onto a table, or by picking a table in their row. Each table shows filled and total seats, and a full table refuses another guest. _gap_
- R17. The guest list filters to unseated guests, to a group, or by a search on the name, and counts seated and unseated. _gap_
- R18. A table's side panel lists its guests in seat order, and a guest can be moved to a particular seat. _gap_

**Printing**

- R19. Print, or save as PDF from the print dialog: the floor plan on its own page, one list per table, and an alphabetical guest list with each guest's table (for escort cards and the coordinator). Meal choices show on the table lists when guests have them. _gap_

**Later, not in this version unless Hector moves them up** (H2)

- R20. Several plans side by side, to compare layouts. The saved file holds a list of plans from the start, so this needs no migration. _gap_
- R21. Spacing warnings: tables that overlap, or chairs closer than a set walkway width. _gap_
- R22. Keep-together and keep-apart rules between guests. _gap_

### Decisions

- D1. **One browser holds the plan.** There are no accounts and nothing leaves the device. Moving a plan to a partner's laptop or the coordinator is an export and an import (R12). Live sharing would need a server and accounts, which this version leaves out.
- D2. **A laptop or tablet edits; a phone views.** Dragging tables needs room, so the phone layout shows the plan and the guest list for looking things up, without the palette or the side panel.
- D3. **Real units.** The room is in feet, tables in inches, as rental companies list them. The presets are starting values to check against the rental company's sheet, not facts the app vouches for.
- D4. **Real names never enter the repo.** The repo is public. Tests and the sample plan use fictional guests and a fictional room.
- D5. **One plan open at a time in this version**, even though the saved file can hold several (R20).

### Key flows

1. **First open.** An empty room of 60 by 40 feet, a short "set your room's size" prompt, and the palette. Or a sample plan to look around in, cleared with one button.
2. **Lay out the room.** Set the size, place the dance floor and the bar, then add tables from the palette and drag them into place. Duplicate a table to make a row.
3. **Seat guests.** Paste the guest list, then drag each unseated guest onto a table. A full table refuses a guest and says so.
4. **Back it up.** Export the file now and then; import it on another device.
5. **Print.** Open Print, check the three sections in the preview, and print or save as PDF.

### Acceptance examples

- Given a 60-inch round table with 8 seats and 8 guests at it, dropping a ninth guest on it leaves the guest unseated, with a message that the table is full.
- Given a plan with 12 tables, after closing and reopening the browser, all 12 are where they were, with their guests.
- Given a file exported from one browser, importing it in another shows the same plan, and the replaced plan can be restored with Undo.
- Given saved data from an older version of the app, opening the app upgrades it and loses nothing. Given saved data the app can't read, the app keeps the raw text aside, says so, and offers it as a download. It never overwrites it.

### Scope boundaries

- No accounts, no server, no sync, no sharing by link.
- No 3D view, no chair-level furniture, no import of a venue's floor-plan drawing as a background image (a possible later item).
- No catering or budget features beyond meal choices on guests.

### Needs from Hector

- H1. **Framework:** Solid 2.0 on plain Vite (KTD1), or React and Next.js like `relationship-meter`. _Answered 2026-11-24: Solid 2.0. Hector's reason: Solid's error reporting is built for AI agents, so problems should be easy to trace as they come up (KTD10)._
- H2. **Scope:** guests and printing in this version (R14 to R19), or the floor plan first and guests in a second pass. And whether any of R20 to R22 moves up. _Answered 2026-11-24: both batches. R20 to R22 stay later._
- H3. **The look:** an existing `@repo/ui` theme as it is, or a small style-tile round for this app first. This is a taste call. _Answered 2026-11-24: one quick style tile, "appealing and usable", not a round of options. Its tokens become the app's theme file._
- H4. **Hosting:** a static Vercel project, so the app opens on any device at an address, or local only (`bun run dev`). _Answered 2026-11-24: a Vercel project (KTD8), made with Hector's OK just before Batch 1's first push._
- H5. **The name:** `seating-chart` is a working name for the folder and the page title. _Answered 2026-11-24: `seating-chart`._

---

## The technical half

### Key technical decisions

**KTD1. Solid 2.0 with plain Vite, client only.** `solid-js` and `@solidjs/web` 2.0.3, `@solidjs/vite-plugin` 3.0.1, Vite 8. One page, so no router and no start mode. `index.html` loads `src/index.tsx`, which calls `render`. `vite build` writes static files to `dist`.

- Why Solid: it's the small app the spike recommended for trying Solid 2.0, and the canvas is where fine-grained updates fit best, since dragging one table changes one element's position and nothing else re-renders. It needs none of the spike's pre-release packages (Nitro, Kobalte, Neon Auth), except `@solidjs/testing-library` if screen tests are written.
- Why not React and Next.js: they'd work and would reuse `@repo/ui`'s components. But Next.js brings a server and a framework this app doesn't use, and the app would teach nothing new.
- Cost: no Solid reactivity lint (see the spike section), and agents need the primer to avoid 1.x patterns.

**KTD2. SVG for the canvas.** The room is one `<svg>` whose `viewBox` is in inches. Each table and fixture is a `<g>` with a `transform`. Zoom and pan change the `viewBox`.

- SVG gives clicking and printing (R19) without extra code, and stays sharp at any zoom. A plan has tens of items, far below where SVG gets slow.
- _Changed 2026-11-24 (U3):_ SVG has no button, and Biome's `useSemanticElements` refuses `role="button"` on a `<g>`. A real `<button>` in a `foreignObject` would pass, but Safari has a history of drawing `foreignObject` content in the wrong place, and the iPad runs Safari. So the canvas is pointer-only, labelled as one picture (`role="img"`), and keyboard and screen-reader use goes through the "On the plan" list (`src/components/item-list.tsx`): a button per item with its spoken name. Focusing one selects it on the canvas, and arrows, R, Delete and Cmd+D act on it; a press on the canvas focuses the item's button, so the keys work right after a click.
- Canvas 2D or PixiJS would need hit-testing, focus and an accessibility layer written by hand, and printing would go through an image. They pay off at thousands of moving items, which this app doesn't have.

**KTD3. No component library.** Dialogs are `<dialog>` with `showModal()`, menus use the `popover` attribute, and inputs are native controls styled with Tailwind. Escape, focus trapping and the backdrop come from the browser.

**KTD4. Tailwind v4 and the shared theme.** `@tailwindcss/vite`, and the app's stylesheet imports `@repo/ui/styles/globals.css` plus the app's own theme, `@repo/ui/styles/themes/seating-chart.css`, whose values come from the style tile (H3). The app is light only, which also suits printing. The app gets the same tokens and utilities as the other apps (`bg-primary`, `text-muted-foreground`) without React. U1 checks two things: that the shared stylesheet's imports (`tw-animate-css`, `shadcn/tailwind.css`) resolve from the app, and that its `@source` line, which scans `@repo/ui`'s React components, adds only CSS. Canvas colors come from the same tokens through `var(--…)` in SVG `fill` and `stroke`.

**KTD5. One store, named changes, saved on every change.**

- The plan lives in one `createStore`. Components never write to it directly: every change goes through a named action in `src/state/` (`moveItem`, `seatGuest`, and so on).
- Each action pushes the plan's previous state onto an undo stack (R10), capped at 200 steps. A drag records one step when it ends, not one per pointer move.
- An effect writes the whole plan to `localStorage` under `seating-chart` about 300 ms after the last change. A plan with 200 guests and 30 tables is tens of kilobytes; browsers allow about 5 MB per site.
- The saved document has a `version` number. On load, Zod checks it, and a migration function per version upgrades older data. If the data can't be read, it's moved to `seating-chart:unreadable` and the app says so and offers it as a download. Saved data is never overwritten by a failed load.
- Why R13 exists: Safari deletes a site's script-written storage, `localStorage` included, after seven days of Safari use without a visit to the site; a web app added to the home screen keeps its own count of days. WebKit announced the rule in 2020, bug reports from 2020 and 2022 describe it applying unevenly, and a search on 2026-11-24 found no newer statement from Apple. The export file is the only copy this can't clear. Hector checks on his own devices that a plan survives a week.

**KTD6. Pointer events.** Dragging uses pointer events with `setPointerCapture`, so mouse, pen and touch share one path. Screen points convert to plan inches through the SVG's `getScreenCTM().inverse()`. Pinch zoom reads two pointers.

**KTD7. A simple app, with a framework-free model.** No DI and no clean-architecture layers, as in `relationship-meter`. `src/model/` holds the schema, geometry, presets, the saved-file format and undo as plain TypeScript with no Solid imports, and every exported function there is tested.

**KTD8. Hosting.** If Hector chooses Vercel (H4): a new project rooted at `apps/seating-chart` with the Vite preset (build `vite build`, output `dist`), Skip deployment on, no `ignoreCommand`, and no variables. Pushes come at the end of a batch, per the root `AGENTS.md`.

**KTD9. Fitting the monorepo.** Every shared check runs as it does for the other apps.

- `package.json` scripts: `dev` (port 3103), `build`, `preview`, `test` (`bun test`), `ts` and `check-types` (`tsc --noEmit`), and `lint` (`biome check --write --error-on-warnings && oxlint --deny-warnings .`).
- `tsconfig.json`: `jsx: preserve`, `jsxImportSource: @solidjs/web`, `moduleResolution: bundler`, `strict`, `noUncheckedIndexedAccess`, and `types: ["vite/client", "bun"]`.
- `apps/seating-chart/turbo.json` adds `dist/**` to the build's outputs; the root's lists only `.next/**`.
- `.oxlintrc.json`: the app joins the override that sets the design rules to `error`.
- `.claude/launch.json`: a `seating-chart` dev server on port 3103.
- The root `AGENTS.md` monorepo block and the README's app table list the app.
- File names are kebab-case and exports are named, as everywhere in the repo (`src/app.tsx`, not `App.tsx`).

**KTD10. Solid's diagnostics are the first stop when something breaks.** Dev builds print each problem as `[CODE] message` with the component it happened in, and `node_modules/solid-js/skills/reactivity-diagnostics/SKILL.md` has a section per code. The app declares `@solidjs/diagnostics`, so the Vite plugin turns on its dev-only endpoint (`POST /__solid/diagnostics`), which answers why a computation ran and what it cost. Agents read the code's section and fix the cause; a code is never silenced, as the root `AGENTS.md` rule on checks already says.

### The saved file

Naming rules, which every field follows:

- Lengths are whole inches and end in `Inches`. The room shows in feet and the tables in inches, but both are stored in inches, so the geometry uses one unit.
- A shape's position is its center. Angles are degrees, clockwise, and end in `Degrees`.
- IDs are `crypto.randomUUID()` strings. Choice values are lowercase words joined by hyphens (`dance-floor`, `long-sides`).
- Optional fields are left out when empty, and the app shows only what has data.

```ts
type SavedFile = {
  version: 1;
  plans: Plan[]; // one in this version (D5)
  activePlanId: string;
  lastExportedAt?: string; // ISO date, for R13
};

type Plan = {
  id: string;
  name: string;
  room: { widthInches: number; lengthInches: number; gridInches: number }; // grid 12
  tables: Table[];
  fixtures: Fixture[];
  guests: Guest[];
  updatedAt: string;
};

type Table = {
  id: string;
  label: string; // "Table 4", "Head table"
  shape: "round" | "rectangle" | "square";
  widthInches: number; // the diameter, for a round table
  depthInches: number;
  seatCount: number;
  seatSides?: "long-sides" | "all-sides" | "one-side"; // rectangles only (R4)
  xInches: number;
  yInches: number;
  rotationDegrees: number;
};

type Fixture = {
  id: string;
  kind:
    | "dance-floor"
    | "stage"
    | "bar"
    | "buffet"
    | "cake-table"
    | "gift-table"
    | "dj"
    | "door"
    | "pillar"
    | "label"
    | "other";
  shape: "rectangle" | "circle";
  label: string;
  widthInches: number;
  depthInches: number;
  xInches: number;
  yInches: number;
  rotationDegrees: number;
};

type Guest = {
  id: string;
  name: string;
  party?: string;
  group?: string;
  meal?: string;
  notes?: string;
  tableId?: string;
  seatIndex?: number; // 0 is the top seat of a round table, or the top side's left end; then clockwise
};
```

Table presets, as starting values (D3): round 48 inches (6 seats), 60 inches (8), 72 inches (10); rectangle 30 by 72 inches (6, or 8 with the ends), 30 by 96 inches (8, or 10 with the ends); square 36 inches (4) and 60 inches (8); and a sweetheart table, 30 by 48 inches with 2 seats on one side.

### Code map

```
apps/seating-chart/
  index.html                  page shell, loads src/index.tsx
  vite.config.ts              solid() and tailwindcss()
  AGENTS.md                   app context and Solid's 2.0 primer
  docs/spec.md                this file
  src/
    index.tsx                 render(() => <App />)
    app.tsx                   layout: toolbar, canvas, side panel, guest list
    styles.css                the shared stylesheet and theme
    download.ts               hands the browser a file to save
    model/
      saved-file.ts           the zod/mini schema, version check, export, the export reminder
      storage.ts              loading and saving in localStorage, unreadable data kept aside
      geometry.ts             seat positions, snapping, bounds, a free spot, feet and inches
      presets.ts              table and fixture presets, a table's change of shape
      history.ts              the undo stack
      view-box.ts             fit, zoom and pan of the canvas's view
      describe.ts             spoken names and the list's order
    state/
      plan-store.ts           the store, its actions, undo, autosave, export and import
    components/
      plan-canvas.tsx         the room, grid and gestures: drag, turn, resize, pan, zoom
      table-shape.tsx         a table and its seats
      fixture-shape.tsx       a shape that seats nobody
      selection-frame.tsx     the blue dashes, corner handles and turn knob
      item-list.tsx           "On the plan": the keyboard's way in
      palette.tsx             add a table or a shape
      side-panel.tsx          the selected item's details, or the room's
      top-bar.tsx             name, undo, zoom, export and import
      notices.tsx             save and import messages, the export reminder
      controls.tsx            buttons, fields, choices, stepper, icons
      guest-list.tsx          (U4)
      print-view.tsx          (U5)
  tests/
    model/                    one test file per model file
```

### Batches and units

**Batch 1: a floor plan that saves** (one pull request)

- **U1. Scaffold and checks.** The app folder, Vite and Solid, Tailwind with the shared theme, scripts, `tsconfig.json`, `turbo.json`, the launch entry, the Oxlint override, and the app's `AGENTS.md`. Plant a made-up class, a raw color and an unused export, and confirm `bun check --filter=seating-chart` and `bun run dead-code` fail on each before removing them. Fix the Solid docs link in `docs/solid-2-spike.md`. Done when every shared check passes on the empty app.
  - _Built 2026-11-24._ Every shared check passes. What it found:
    - The design lint reads Solid's `class` and `style` attributes: a made-up class, a hard-coded color and an inline style each failed `oxlint`. Fallow caught the unused export.
    - `@repo/ui`'s stylesheet scans its React components for classes. The app's `src/styles.css` excludes that folder with `@source not`, which took the built CSS from 24 KB to 3 KB compressed.
    - `solid-js` 2.0 has no `JSX` type export; it comes from `@solidjs/web`.
    - Biome 2.6 has Solid rules, but at "info" severity, which `--error-on-warnings` lets pass. The root `biome.json` turns on its `solid` domain for this app and sets `noSolidDestructuredProps`, `useSolidForComponent` and `noReactSpecificProps` to error; a planted component failed all three.
    - Fallow reports `@solidjs/diagnostics` as unused: the Vite plugin turns on the diagnostics endpoint by reading `package.json`, and nothing imports it. Adding it to `.fallowrc.json`'s `ignoreDependencies`, as the repo does for other things Fallow can't see, was refused by the session's permission check as weakening a check. Hector allowed the exception on 2026-11-24; `docs/lint-and-dead-code.md` records it with the others.
    - The empty shell builds to 10.7 KB of compressed JavaScript.
- **U2. The plan model and saving.** The saved file's schema, migrations and the unreadable-data path; geometry, presets and undo; autosave; export and import (R10 to R13). Done when `bun test` covers each model function, including an upgrade from a fixture of an older version and a corrupt-data case.
  - _Built 2026-11-24._ 36 tests in `tests/model/`. Two changes from the plan: there's no older version to upgrade from yet, so the tests cover a file from a newer version instead (refused, and kept aside, never overwritten), and the first migration comes with version 2. The functions under autosave, export and import are here; the store and the effect that call them come with U3, which has the screen they run on.
- **U3. The canvas.** The room and grid, zoom, pan and fit; the palette; select, move with snapping, rotate, resize, duplicate and delete; keyboard moves and spoken names; the side panel (R1 to R9). Measure the built JavaScript and record it in the spike section. Done when the flows check out in the browser pane and a reload keeps everything.
  - _Built 2026-11-24._ The theme is `packages/ui/src/styles/themes/seating-chart.css`, from the style tile, and the fonts are self-hosted through Fontsource. Checked in the browser pane at 1400 by 860: adding from the palette, a pointer drag with snapping, the arrow keys and R, Cmd+Z and redo, resizing and turning by the handles, wheel zoom and Fit, Cmd+D and Delete, importing a file and undoing the import, refusing a file from a newer version, and a reload keeping everything. Solid's console showed no diagnostic codes. 48 model tests.
    - The canvas is pointer-only and the keyboard works through a list (KTD2, R9).
    - New items go to the nearest clear spot inside the room (`freeSpot`): the first version stepped 2 feet diagonally and piled tables on top of each other.
    - A press on the canvas calls `preventDefault()`: without it, the mouse-down that follows moves focus to the page and the keys stop acting on the item just picked.
    - Undo keeps each item's identity through `reconcile` keyed by `id`, so a focused item stays focused.
    - At phone width the top bar wraps to three rows and takes about 40% of the screen; it works, and is worth tightening with U4's screens.

**Batch 2: guests and the printout** (one pull request, if H2 keeps them)

- **U4. Guests.** Adding and pasting, editing, seating by drag and by picking, counts, filters and search, and seat order (R14 to R18).
- **U5. Printing.** The print stylesheet and its three sections (R19).

### Verification

- `bun check --filter=seating-chart && bun ts --filter=seating-chart`, `bun run test --filter=seating-chart` and `bun run dead-code` pass before every push.
- Each unit's flows are run in the browser pane on the dev server, with screenshots for Hector: a drag, a reload, an import round trip, a full table refusing a guest, the print preview.
- Solid's dev console shows no diagnostic codes during those runs. When one shows, its section in the diagnostics skill comes before any other debugging (KTD10).
- Hector checks it once on the iPad or laptop he'll plan on, including that a plan survives a week in Safari (KTD5).
