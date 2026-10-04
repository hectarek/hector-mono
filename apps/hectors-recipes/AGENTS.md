# AGENTS.md — hectors-recipes

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers app-specific context

## Overview
Simple recipes app with auth and database. Keep the clean architecture structure, but prefer the simplest implementation that satisfies the feature. Canonical pattern reference: [../../docs/clean-architecture.md](../../docs/clean-architecture.md).

The meal planner is built (MVP): shared recipe books, weekly meal plan, grocery list, cook mode. The spec and its "As built" notes are in [docs/meal-planner-spec.md](docs/meal-planner-spec.md). A UX pass to get it ready for a small group is tracked in [docs/ux-plan.md](docs/ux-plan.md): read its Status block before starting any of its tasks.

## Stack
- Next.js 16, React 19, Tailwind CSS, shadcn/ui
- Neon Postgres via `@neondatabase/serverless`, Drizzle ORM, generated migrations in `db/migrations/`
- Auth via `@neondatabase/auth` (Better Auth powered)
- DI via `@evyweb/ioctopus`

## Architecture

```
app/
  (api)/api/           # Route handlers: auth/[...path] (Neon Auth's endpoints) and realtime/token (the live-updates pass)
  (auth)/              # Signed out: welcome/ (logo, produce row, Create account / Sign in; names the
                       # space when arriving from an invite) and auth/[path]/ (Neon's forms, full-screen)
  (main)/              # Signed-in app: header + bottom tab bar (layout.tsx)
    (library)/page.tsx # Library: ?book= (default: your default book, else All recipes when in 2+ books; `all` = every book, cards name their book), ?q= search (narrows as you type, P10.4), ?tag= chips, book switcher.
                       # In a route group only so its card-grid loading.tsx doesn't cover every page under (main)
    recipes/[id]       # A recipe (reading surface); new and edit live in (form)
    books/             # Your recipe books, the Default book picker (All recipes or a book), create; books/[id]/copy = bulk copy ("merge")
    spaces/[id]/settings  # Any space type: rename, invite links, members/roles, leave, delete
    join/[token]       # Invite preview + explicit Join button
    plan/              # Week view: ?week= (any date → its Monday), ?plan=; cook and eat rows (PlanWeek), then the grocery box (D50)
    groceries/         # A plan's grocery list: ?plan=, add box, "Got it" section, clear checked; live (LiveList), refresh every 60s as a safety net
    account/[path]/    # Neon Auth account views; settings adds our Appearance card (light/dark/system)
  (cook)/recipes/[id]/cook/  # Cook mode: own layout (no header/tab bar), large type, wake lock
  (form)/recipes/new    # How to add one (docs/ux-plan.md D34): by link (new/link), by photo (new/photo), or manually (new/manual, the form)
  (form)/recipes/new/manual, (form)/recipes/[id]/edit  # Add/edit a recipe: full-screen, with `TopBar` (Cancel, title, Save)
  _components/         # header, bottom-nav, recipe-card, recipe-form (+ ingredient-rows, step-rows, row-sheet),
                       # scaled-ingredients, markdown, delete-recipe-button, library-filters + library-results, appearance-card,
                       # logo (generated), produce-tile
  _lib/                # auth client, current-user, load-recipe (404 on unknown ids), load-books, load-plans (Plan and Groceries),
                       # use-wake-lock, space-href, app-icon (drawing for all generated icons)
  manifest.ts, apple-icon.tsx, pwa-icon/[size]/  # install to home screen; paths bypass auth in proxy.ts
  error.tsx, not-found.tsx; loading.tsx per page shape: (main)/ is the general one, (library)/, plan/, groceries/, recipes/[id]/ have their own
  _providers/          # Providers: @repo/ui ThemeProvider around AuthProvider
  actions/             # Server actions per domain: grocery, import, plan, recipes, spaces; shared.ts holds their helpers (not "use server")

src/
  entities/
    errors/common.ts   # includes RecipeReadError (reason: no-recipe-found | budget-paused | daily-limit | service-unavailable) and PageFetchError
    models/            # space, recipe, recipe-ingredient, recipe-step, recipe-draft, plan-entry, grocery-item, user, session, transaction, logger
    ingredient-line.ts # best-effort parser: raw line -> { quantity, unit, name }
    ingredient-item.ts # itemizeLine: typed line -> { quantity, unit, name, note, optional, catalogName }
    step-text.ts       # stepsFromMarkdown: markdown steps (pasted, or an Obsidian note) -> step texts;
                       # withSections (a heading step -> the section of the steps after it), stepGroups (for display)
    step-ingredients.ts # the lines a step uses, by their names in its text (cook mode)
    itemizing-check.ts # holds AI line fields and timers to the line's own words (D30)
    aisles.ts          # the fixed aisle list (D25)
    ingredient-text.ts # pasted ingredient text -> lines ("Section:" lines, pasted Obsidian lists)
    editor-rows.ts     # the recipe editor's rows: from stored lines or pasted text, to what's saved
    library.ts         # library filtering + tag list
    week.ts            # date-only helpers ("YYYY-MM-DD", UTC math), PLAN_TIME_ZONE = America/New_York
    meal-days.ts       # a meal's cook and eat days: moveCookDay, toggleEatDay, mealsOnDay, mealDaysText
    scaling.ts         # servings scaling + kitchen-friendly fractions
    grocery-merge.ts   # merge/skip/insert rule, planGroceryBatch (merges within a batch too), merged-line text
    realtime.ts        # planChannel: a plan's live-updates channel
    recipe-page.ts     # recipeFromPage: a page's schema.org Recipe data -> draft, without AI
  application/
    repositories/      # interfaces: spaces, recipes, plan-entries, grocery-items, recipe-reads
    services/          # interfaces: authentication, logger, transaction-manager, realtime, recipe-reader, recipe-page-fetcher
    use-cases/         # by domain: spaces/ (with the access helpers require-space-role, require-owner), recipes/, plan/, grocery/, realtime/
  interface-adapters/
    controllers/       # same domains as use-cases/
  infrastructure/
    repositories/      # base, then one per interface (+ mock each); neon-auth-users (member names, read-only)
    services/          # neon-auth, transaction-manager, console-logger, ably-realtime, ai-gateway-recipe-reader + ai-gateway-models,
                       # http-recipe-page-fetcher + public-address (+ mocks)

di/
  container.ts, types.ts
  modules/             # authentication, logger, transaction, realtime, recipe-reader, spaces, recipes, plan, grocery

db/
  schema.ts, index.ts
  migrations/          # drizzle-kit generated SQL (+ custom 0000 dropping pre-spaces tables)

lib/
  auth/server.ts, logger.ts

scripts/
  seed-from-obsidian.ts         # one-off vault import; dry run by default, --commit --email=<account>
  lib/parse-obsidian-note.ts    # note -> recipe (frontmatter, sections, NYT clippings)

tests/                 # bun:test; mirrors the source tree (see Testing)

proxy.ts
```

## Data Model

Full rationale in the spec. Summary:

- **`spaces`**: anything shareable. `type` is `'recipe-book' | 'meal-plan'`. There's no separate grocery list: a plan's list is part of the plan and shares its members (`docs/ux-plan.md` D13; migration 0003 moved the old lists' items onto their owners' plans).
- **`space_members`**: `(space_id, user_id)` with `role` `'owner' | 'editor' | 'viewer'`. Exactly one owner per space (partial unique index).
- **`space_invites`**: link tokens carrying a role (used from increment 5).
- **`recipes`**: live in a `recipe-book` space. `created_by` is the author only; access comes from the space. `tags text[]`, optional `time_minutes` / `yield_servings`, `external_ref` for imports.
- **`recipe_ingredients`**: PK `(recipe_id, position)`. Itemized (ux-plan D23): `quantity`, `unit`, `name` as written, `note` (prep or a swap; shown on the recipe, left off the grocery list), `optional`, and `ingredient_id` into the catalog. `raw` keeps the original line for reference. Any of the itemized fields may be null.
- **`recipe_steps`**: PK `(recipe_id, position)`, `text`, an optional `timer_minutes` (D24), and an optional `section`, the heading over it and the steps after it that share it (D35, migration 0008). Saving replaces a recipe's steps. They replaced the markdown `instructions` column (migration 0007).
- **`ingredients`**: global catalog, unique name, and an `aisle` from the fixed list in `src/entities/aisles.ts` (D25).
- **`plan_entries`** / **`grocery_items`**: both in `meal-plan` spaces; a plan's `grocery_items` are its grocery list. A plan entry is a meal (docs/ux-plan.md D38): one cooking of a recipe, with its cook day (the column is still called `date`; `cookDate` in code), its eat days (`eat_dates`, sorted, at least one (a check since 0010), none before the cook day) and `cooked` (D39).
- **`user_settings`**: one row per person, `default_plan_id` / `default_book_id` (FKs to `spaces`, set null when the space is deleted). No default book means All recipes.
- **`recipe_reads`**: one row per AI read of a recipe (migration 0012): `user_id`, `kind` (`'image' | 'text'`) and `created_at`, indexed on `(user_id, created_at)`, for the daily limit (`DAILY_RECIPE_READS`, docs/ux-plan.md D48). No space columns: the limit is per person.

Content tables carry `(space_id, space_type)` with a composite FK to `spaces(id, type)` plus a check on `space_type`, so the database itself rejects a recipe in a meal plan. User ids are Neon Auth `neon_auth.user.id` uuids, with no FK into the managed `neon_auth` schema.

Stored enum-like values are readable on their own (`recipe-book`, not `book`); keep that convention for new columns.

## Data Flow
1. **Read**: `page.tsx` -> `IEnsurePersonalSpaceController` -> `IGetRecipesController` -> use case -> repository -> DB
2. **Write**: form action -> `app/actions/<domain>.ts` -> controller -> use case (in a transaction) -> repository -> DB -> `revalidatePath` (and `redirect` when the action leaves the page, as a recipe's create, update and delete do)

## Feature Rules
How each feature works, and what to keep true when changing it, is in [docs/features.md](docs/features.md). When a feature's behaviour or rules change, update its section there in the same change; only rules every change follows go here. Before changing a feature, read its section:
- [Recipes: ingredient lines, steps and scaling](docs/features.md#recipes-ingredient-lines-steps-and-scaling)
- [Library and tags](docs/features.md#library-and-tags)
- [The recipe form](docs/features.md#the-recipe-form)
- [Spaces, invites and defaults](docs/features.md#spaces-invites-and-defaults)
- [Plan](docs/features.md#plan)
- [Groceries](docs/features.md#groceries)
- [Live updates](docs/features.md#live-updates)
- [Import and the AI reader](docs/features.md#import-and-the-ai-reader)
- [Cook mode and servings](docs/features.md#cook-mode-and-servings)

## Backend Rules
- Every use case that lists or writes a space's contents calls `requireSpaceRole(spacesRepository, { spaceId, userId, type, minRole })` from `src/application/use-cases/spaces/require-space-role.ts`. Don't hand-roll membership checks.
- Writes check access and mutate inside one `startTransaction` so the check and the write see the same state.
- Every read inside a transaction passes `tx`: a read without it hangs on PGlite's one connection.
- `TransactionManagerService` rethrows domain errors (`NotFoundError`, `UnauthorizedError`, etc.) unchanged and only wraps unexpected driver errors. Keep it that way, or denials surface as "Transaction failed". A new domain error class that can be thrown inside a transaction must be added to `DOMAIN_ERRORS`.
- Transaction timeouts are Postgres-side (`set local statement_timeout` at the start of each transaction), so a timeout rolls back. Don't race the transaction against a JS timer: that reports failure while the work carries on and can still commit. Not `transaction_timeout` either: it kills the connection, which the Neon driver surfaces as an unhandled error.
- Loading several recipes or creating many goes through `getByIds` / `createMany` (a fixed handful of queries however many recipes), not a loop of `getById` / `create`. `getByIds` returns each found recipe once in no particular order, so map results back by id.
- Reading one recipe needs only a session (`getRecipe` returns `canEdit`); listing or writing a book goes through `requireSpaceRole`. The exception is All recipes (`getAllRecipes`), which lists only the user's own memberships (`listForUser`), so being in a book is its access check.
- Owner-only operations on any space type use `requireOwner` (`src/application/use-cases/spaces/require-owner.ts`). It, `requireItemEditor` (a grocery item) and `requireEntryEditor` (a meal) guard writes only, so they take the write's `tx` (required); `requireSpaceRole` takes it whenever there is one.
- Member names/emails come from Neon Auth's `neon_auth.user` via `src/infrastructure/repositories/neon-auth-users.ts`. Never move that table into `db/schema.ts`, or drizzle-kit will try to migrate Neon's managed schema.
- Dates are plain "YYYY-MM-DD" strings end to end; never convert a plan date through `Date` in local time.
- "Today" comes from the server (`todayIn(PLAN_TIME_ZONE)`, in the controller or the page), never the phone.
- Validation errors come back per field: `toActionError` fills `ActionState.fields` (form field name → message) from the Zod issues, and actions' own checks throw `fieldError(field, message)` (see `app/actions/recipes.ts`) so they land under the right field too. `error` stays as a one-line summary.
- Server-action helpers (`actionLogger`, `text`, `toActionError`, `ActionState`) live in `app/actions/shared.ts`; the signed-in user comes from `getCurrentUserId` (`app/_lib/current-user.ts`) in pages and actions alike.
- One-time data work (a re-read, a cleanup) is done by Claude in a Claude Code session, never through the app's AI (docs/ux-plan.md D31). The app's AI is for its features, and the local `AI_GATEWAY_API_KEY` only for testing them. Export the records, answer them in session, and put the answers through the same checks and a dry-run/commit guard, as the P9.3 re-read did (`scripts/reread-recipes.ts`, removed once it had run).
- Naming (docs/ux-plan.md D28): a vendor's name appears only on the adapter that wraps it, meaning its class and file (`AblyRealtimeService`, `NeonAuthService`). Interfaces, DI symbols, use cases, controllers and pages stay neutral (`IRealtimeService`). Browser code has no DI container, so its one adapter module keeps a neutral file name and export (`app/_lib/live-updates.ts`, `listenToPlan`), and it's the only browser file that imports `ably`.
- Never import infrastructure directly in `app/`; always use DI symbols.
- `.env`'s `DATABASE_URL` is the production database (one database for local and deployed). Reading it is fine; `db:migrate`, the seed's `--commit` and any other write need Hector's explicit OK at that moment. Apply an additive migration before the deploy that uses it, and a drop after (next rule).
- Browser tests (docs/ux-plan.md P15.7) use a separate Neon project, `hectors-recipes-test`: no real data, its own Neon Auth and accounts, through the gitignored `.env.test` (`.worktreeinclude` copies it into new worktrees). A new migration goes there too, or the tests run against the old schema.
- Removing a column takes two deploys. Drizzle's inserts name every column in the schema (`default` for ones not given), so code whose schema still has a column breaks on insert once the column is gone. Take it out of `db/schema.ts` and deploy first; drop it in a migration applied after (0010 dropped `plan_entries.eaten` too early and it had to be put back; 0011 drops it after the deploy). Adding a nullable or defaulted column is safe before the deploy.

## UI Rules
- Design system: "Hector's Recipes" in Claude Design (tokens, type, patterns, logo: https://claude.ai/artifact/LjXi5gzWvjsaw1w1vKcNQn; screen mockups: https://claude.ai/artifact/DbiC7qhnhsWqXaQtyLF9Lw). In code it is `packages/ui/src/styles/themes/recipes.css` with `data-theme="recipes"` on `<html>`; fonts are Figtree (`--font-sans`) and Young Serif (`--font-heading`).
- Surfaces: library, plan and groceries use the base (Market); the recipe page sets `data-surface="reading"` on its `<article>`, and the `(cook)` layout sets `data-surface="cook"`.
- Type roles: a recipe's own words are `font-heading` (its name wherever it appears, the Ingredients and Method headings); everything else is the sans. Reading text is `text-lg`, cook steps `text-xl`, and step numbers are `marker:` utilities (serif, `primary`).
- Bold moments: `ProduceTile` (`app/_components/produce-tile.tsx`, colour by `produceFor(id)`) for recipes without a photo and for empty-state icons; the plan's lemon Today sticker; the tab bar's active pill; the welcome screen's produce row (`ProduceArt`, `app/_components/produce-art.tsx`: the system's produce drawings in theme colours, so they work in dark mode). At most one in view, except the library grid.
- The design lint's rules are errors here: fix with tokens, variants (`quiet` for muted actions), `InputGroup`, `Drawer` (bottom sheets), `no-scrollbar` and the safe-area utilities (`pb-safe-20` under the tab bar).
- Logo and icons: `app/_components/logo.tsx` (generated from the system's logo; theme colours), `app/icon.svg` (favicon), `app/_lib/app-icon.tsx` (the PNG icons, drawn with `<img>` of the SVG so no inline styles are needed).
- Mobile-first at 375px. Pages live under `app/(main)/` to get the header and bottom tab bar, except full-screen tasks: cook mode `(cook)` and the recipe form `(form)`, which carry their own way out (Done, Cancel). Every other page that isn't a tab opens with `BackLink` (`app/_components/back-link.tsx`), labelled with where it goes ("Recipes", the book's name), not "Back to …".
- Link-styled buttons: `<Button nativeButton={false} render={<Link href=… />}>` (Base UI, not Radix `asChild`). `Badge` takes `render` the same way (`<Badge variant="secondary" render={<Link href=… />}>`, which passes the design lint); the recipe page's tag chips use `badgeVariants()` on a `Link`, which also passes.
- Anything you tap to act or go somewhere looks like a button (docs/ux-plan.md D32): filled for the page's main action, `secondary` for the rest, at `lg` (45 px). No `outline` buttons: in a set of toggles (the day pickers) the chosen ones are filled and the rest `secondary`, and icon-only buttons (the servings stepper, the week arrows) are `icon-lg`. No text links or underline-on-hover buttons. What stays a link: the back link, a link out to a recipe's source, a planned meal's title, tag chips, and rows or cards that are the thing itself (a recipe card, a book on Books).
- Forms that can fail validation submit via `onSubmit` + `startTransition(() => formAction(formData))`; a plain `<form action>` makes React 19 reset uncontrolled fields and wipe the user's input.
- Single-button server actions (revoke, remove, role change) use `app/_components/action-form.tsx` for pending state and inline errors.
- Lists you check off: the whole row is a `<label>` around a visually hidden checkbox (the design system's pattern), so any action on the row sits outside the label, behind a ⋯ button that opens a bottom sheet (`GroceryItemSheet`: Edit, Remove from list; `PlanEntrySheet`: Change days, Add to grocery list (or Add to list again), Not eating it on Mon 5 (from a leftovers day), Remove meal). Sheet buttons are `lg` (45 px); the sheet shows actions first, so the keyboard only opens on Edit.
- Server actions called from a tap (mark cooked, clear, …) go through `callAction` (`app/_lib/call-action.ts`) and show its message inline. A dropped connection throws rather than returning `{ error }`, and without this it lands on the error page, which is exactly what happens in a store with no signal.
- Tab pages open with `PageTitle` (`space-header.tsx`): a small label (with the role badge when it isn't yours), the title, and beside it the main action (`action`, the library's New) and a ⋯ (`menu`, docs/ux-plan.md D42). The ⋯ is `TitleMenu` (`title-menu.tsx`), a bottom sheet of actions; there's no row of buttons under the title. Space pages use `SpaceHeader`, whose ⋯ is `SpaceMenu`: Invite (owners), Members, then the page's own actions (its `children`: the plan's Make default / Start my own plan, the library's All books); `label` overrides the type label, as on Groceries: "Grocery list" over the plan's name; pickers use `SpacePicker` / `@repo/ui`'s `NativeSelect` with `NativeSelectOption` (a plain `<select>`, so phones show their own picker, with the design system's chevron rather than the browser's). Its `className` lands on the wrapper, which is `w-fit`: pass `w-full` to fill a column.
- Dates rendered in client components use a fixed locale and `PLAN_TIME_ZONE`, or the server's UTC render won't match the phone's.
- Entities are pure and safe to import in client components (the form's parse preview and the servings stepper reuse the server's parser and scaler).

## Testing
- `tests/` mirrors the source tree: the test for `src/entities/scaling.ts` is `tests/src/entities/scaling.test.ts`, for `app/_lib/safe-redirect.ts` it's `tests/app/_lib/safe-redirect.test.ts`. New source file with logic → matching test file.
- Shared setup lives in `tests/_support/` (it mirrors nothing): `makeApp()` wires every use case to one set of repositories (in-memory mocks by default) with fixtures (`newSpace`, `newRecipe`, `join`), plus `OWNER` / `PARTNER` / `STRANGER` user ids. `groceryFixture()` adds a plan (whose grocery list the tests fill) and two recipes that share ingredients.
- Tests add members through `repos.spaces.addMember` (via `app.join`), never a mock-only shortcut, so the same test can run against the real repositories.
- `tests/_support/preload.ts` runs before every test (`bunfig.toml`). It deletes `DATABASE_URL`, the auth env vars, `ABLY_API_KEY`, `AI_GATEWAY_API_KEY` and `VERCEL_OIDC_TOKEN` that Bun loads from `.env`, so no test can reach the live database, auth, Ably or the AI Gateway, and it stubs `next/cache`, `next/navigation` and `getCurrentUserId`. Its `useRouter` returns one object, as Next's does: a new one each call re-runs every effect that depends on it, and the page never settles. Action and page-helper tests read `nextState` (who's signed in, what was revalidated) and catch `Redirected` / `NotFoundPage` from `tests/_support/next.ts`.
- Actions and page helpers run through the real DI container, whose mock repositories live for the whole test run: call `signInAsNewUser()` in `beforeEach` so each test starts with empty data.
- Database: `@/db` is swapped for PGlite (an in-memory Postgres, `tests/_support/database.ts`) in the preload, with the real migrations applied. Nothing in tests can reach Neon.
- Use-case tests use `describeEachBackend(...)` instead of `describe(...)`: each runs twice, on the mock repositories and on the real ones over PGlite (`[mock]` / `[postgres]` in the output). A test that fails only on `[postgres]` means a mock has drifted from the real SQL; fix the mock.
- Things only a database can show (constraints, cascades, advisory lock, member names from `neon_auth.user`, transaction rollback) are in `tests/src/infrastructure/**`, Postgres only. Call `resetDatabase()` in `beforeEach`; `sql()` runs raw queries for assertions. Don't run `sql()` inside an open transaction: PGlite has one connection, so it waits forever.
- Adding a migration needs nothing extra: the test database applies `db/migrations/` itself. A migration that moves data gets its own test from the schema before it (`tests/db/migrations/`): apply the earlier migrations' SQL to a PGlite once in `beforeAll`, `clone()` it in `beforeEach`, seed, then run it in a transaction as the migrator does. Replaying the migrations per test ran past bun's 5 s limit on CI, and the timed-out setup then ran into the next test's database.
- Controllers: `controllerBasics()` (`tests/_support/controller.ts`) covers the three things every controller does (signed-out rejected, bad input rejected before the use case, parsed input passed on). Give it a valid input, the expected use-case arguments, and labelled bad inputs.
- The goal is a safety net for the basics, not exhaustive specs: cover the rule and its main denial (e.g. viewer can't), skip restating the implementation.
- Screen tests (docs/ux-plan.md D49, Phase 15) are `*.test.tsx`, beside the other tests in the mirrored tree (`tests/app/_components/plan-entry-sheet.test.tsx`). They render real components with React Testing Library and user-event in happy-dom, against the real server actions and the test container's repositories (`signInAsNewUser()`, then make data through controllers or actions, as the action tests do; `planScreenFixture()` in `tests/_support/plan-screens.ts` does it for the plan's screens). Don't `mock.module` an action or component there: Bun keeps a module mock for the whole run, so it would change other files' tests.
- Screen tests run in a pass of their own, each file isolated, with `tests/_support/dom.ts` preloaded (the browser, and a clean page after each test): happy-dom replaces fetch, Request, Headers and the timers, and its Headers hide cookies, which the rest of the suite needs as Bun has them. `bunfig.toml` leaves `*.test.tsx` out of a plain `bun test`; `bun run test:screens` runs them (`bun run test:screens tests/app/_components/x.test.tsx` for one file; add `--rerun-each 10` to check a new one isn't flaky); `bun run test` runs both, as CI does.
- In a screen test, find things as a person would: by role and name (`getByRole("button", { name: "Change days" })`), within a labelled group when a name repeats (`within(getByRole("group", { name: "Eat on" }))`). Use the queries `render` returns rather than `screen`. Bottom sheets (Base UI's Drawer) work in happy-dom. A link-styled `Button` (`nativeButton={false}`) has the button role: check its `href` through `closest("a")`.
- Check where the cursor is with `focused()` (`tests/_support/focus.ts`: the focused element's label or text, or "the page"), never `expect(document.activeElement).toBe(element)`: over a large page that assertion passed when it shouldn't have (P15.4). Compare strings, not elements, in screen tests.
- A whole page can be rendered as the server would: `render(await GroceriesPage({ searchParams: Promise.resolve({ plan }) }))`, and `rerender` with a fresh `await GroceriesPage(…)` stands in for the refresh after an action (`revalidatePath` is a stub). Keep the document hidden (`Object.defineProperty(document, "visibilityState", …)`) so live updates don't connect, and stub `window.matchMedia` for reduced motion where a component animates (happy-dom has no Web Animations). `navigator.onLine` can be set the same way to test what happens with no signal (`tests/app/(main)/groceries/page.test.tsx`).
- Return's default (a form's implicit submit) isn't run by happy-dom; check that a handler stopped it with `fireEvent.keyDown(field, { key: "Enter" })`, which returns `false` when it did.
- A tap that calls an action finishes after `user.click` returns: wait for what it changes (`findByText`, `findByRole`, or `waitFor` around a read of the repositories), never `getBy` straight after, which races and fails now and then. Anything that uses the server's "today" (an action's range) is planned from `todayIn(PLAN_TIME_ZONE)` in the test, not a fixed date.
- Browser flows (docs/ux-plan.md P15.7) are `tests/flows/*.flow.ts`: Playwright on a phone-sized Chromium against a dev server on the test project, run with `bun run test:flows`, locally only (not part of `bun run test` or CI). `playwright.config.ts` reads `.env.test` and passes it to the dev server; Next uses an env file's value only when the key isn't already set, so it wins over `.env`. The server runs on port 3300, never one of `.claude/launch.json`'s (they use production's `.env`), and is never reused. Before it starts, `scripts/check-test-database.ts` stops the run unless the database carries the test project's comment (`COMMENT ON DATABASE neondb IS 'hectors-recipes-test'`) and auth is on the same Neon endpoint. Each run signs up a new account. A checklist row is tapped by its words (its checkbox is hidden under the drawn box), and Got it starts closed. Playwright's touchscreen only taps: a swipe is sent as touch events through Chromium's DevTools protocol (`swipe` in `plan-and-shop.flow.ts`).
- Browser-tool testing note: the automation's Enter key doesn't trigger implicit form submission (verified on a plain HTML form), so click submit buttons in automated checks.
- Browser-tool testing note: at the mobile preset the pane scales the emulated screen, and taps land about 4% off, worse lower on the screen (a tap sent at y 640 arrived at 667), so a bottom sheet's buttons can be missed. Drive them with `element.click()` in `javascript_tool`, confirm where a tap arrived with a `pointerdown` listener, and leave finger taps to the real-phone check.

## Auth Rules
- Route all auth access through `IAuthenticationService` in app/actions/pages.
- `lib/auth/server.ts` is only for the auth route (`app/(api)/api/auth/[...path]/route.ts`), the auth pages (`app/(auth)/auth/[path]/page.tsx`) and the auth service implementation (`src/infrastructure/services/neon-auth.service.ts`).
- Pages can't write cookies, and Neon's `getSession()` writes one when its 5-minute session cache has expired and Neon hands back a refreshed cookie; in a page that throws and the page fails as signed out. `proxy.ts` therefore refreshes the cache (through our own `/api/auth/get-session` route) whenever the cache cookie is missing, passing the new cookies to the browser and to that request's render; an ended session goes to `/welcome` (with `redirectTo`). See [../../docs/proxy-auth-research.md](../../docs/proxy-auth-research.md) (2026-09 addendum).
- `/auth/*` pages send someone already signed in back into the app, except `sign-out` (`skipsWhenSignedIn` in `app/_lib/auth-paths.ts`): sign-out needs the session it ends.
- `/welcome` is where signed-out visitors start. The proxy handles it by cookie alone: signed in goes on to `redirectTo` (through `safeRedirect`), signed out sees it. It isn't in the matcher's skip list, so keep that check in the proxy.
- Sign-in keeps the return path: `proxy.ts` sends signed-out visitors to `/welcome?redirectTo=<path>`, the welcome screen passes it on to the sign-up and sign-in links, and `app/(auth)/auth/[path]/page.tsx` only honors same-app paths (`app/_lib/safe-redirect.ts`, which resolves the path the way a browser would, so `/\evil.com` is caught) and passes them to `AuthView` as a prop (the prop overrides the raw query param, which AuthView would otherwise trust).
- The invite preview (`IPreviewInviteController`) is the one controller that works signed out: the welcome screen names the space an invite is for. It returns only the space's name and type and the link's role; keep it that way.
- Safari (including the iOS Simulator) can't sign in on `http://localhost`: Neon Auth always marks its cookies `Secure`, and WebKit drops Secure cookies over plain http (Chrome treats localhost as secure, so the browser pane works). Check iPhone Safari against the deployed HTTPS site instead (`https://recipes.hectorfgonzalez.com`, one database for both).
- Neon's auth screens are styled through `AuthView`'s `classNames` (the card frame is removed) and `localization` (the app's wording), set in `app/(auth)/auth/[path]/page.tsx`.

## Logging Rules
- Never call `console.*` directly.
- Use `ILoggerService` in server-side app/layers.
- Use `lib/logger.ts` in root/edge files.

## Deploying (Vercel)
- Vercel project root directory: `apps/hectors-recipes` (Next.js preset; Bun is detected from the root `bun.lock`).
- Env vars: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `ABLY_API_KEY` (same as `.env`; `LOG_LEVEL` optional). `ABLY_API_KEY` is server-only, limited to `publish` and `subscribe` on `plan:*`; without it the app works and live updates are off.
- AI Gateway: production authenticates with Vercel OIDC, so don't add `AI_GATEWAY_API_KEY` in Vercel (D27); it lives in the local `.env` only. The project has a $10 monthly Gateway budget. The Gateway's free tier refuses Claude models (403 "Free tier users do not have access to this model"), so reading recipes needs paid Gateway credits (bought 2026-09-26). The adapter's log line has input, output and reasoning tokens (an `info` line, so shown in production only with `LOG_LEVEL=info` or `debug`); a recipe read costs a few cents with Opus 5.5 ($4 in, $20 out per million tokens on the Gateway): a short typed recipe was 2,471 in and 948 out, about 3¢, in 12 s. Nothing reads the Gateway at build time, so it isn't in `turbo.json`.
- Turborepo runs builds in strict env mode: a variable not listed in this app's `turbo.json` (`tasks.build.env`) is withheld from `next build` even if it's set in Vercel. Add new env vars there too.
- Every domain the app runs on must be added in the Neon console: Auth → Configuration → Domains (`https://…`, no trailing slash). Previews need a wildcard entry.

## Commands
```bash
bun run dev --filter=hectors-recipes
bun run build --filter=hectors-recipes
bun run --filter=hectors-recipes db:generate   # after editing db/schema.ts
bun run --filter=hectors-recipes db:migrate    # apply pending migrations
bun run --filter=hectors-recipes db:studio
bun run test --filter=hectors-recipes          # both passes; or from apps/hectors-recipes: bun run test
bun run --filter=hectors-recipes test:screens  # the screen tests (*.test.tsx) alone
bun run --filter=hectors-recipes test:flows    # the browser flows, on the test project (needs .env.test)

# Obsidian seed (from apps/hectors-recipes; reads the vault, never writes to it)
OBSIDIAN_RECIPES_DIR="<recipes folder>" bun scripts/seed-from-obsidian.ts
OBSIDIAN_RECIPES_DIR="…" bun scripts/seed-from-obsidian.ts --commit --email=<account email>
```

`tsconfig.json` sets `"types": ["bun"]`. TypeScript 6+ no longer auto-includes `@types/*`, so without it `tsc` and `next build` fail on `bun:test` imports in `tests/`.

## Before Finishing Any Change
```bash
bun check --filter=hectors-recipes
bun ts --filter=hectors-recipes
bun run test --filter=hectors-recipes
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
