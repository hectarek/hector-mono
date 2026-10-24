# AGENTS.md — job-search

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers app-specific context

## Overview
A private job search workspace. Its owner and Claude both keep it current, and each day it shows what needs a decision and what's due. Claude is to work in it through page tools (WebMCP) from its own browser profile. Clean architecture on recipes' pattern: [../../docs/clean-architecture.md](../../docs/clean-architecture.md), with `apps/hectors-recipes` as the reference.

The plan of record is [docs/build-plan.md](docs/build-plan.md): read its Status and How to resume before starting any of its tasks. Built so far: U1, the scaffold (sign-in and an empty shell), U2, the two identities (who's acting, the private screen and the auth route's limits), and U3, the action envelope and the activity log (Backend Rules).

## Privacy (R24)
- The repo is public. Code, tests, fixtures, docs, tool descriptions, screenshots, commit messages and PR text use fictional or generic data. Companies, people, targets, pay and strategy live only in the app's database or Hector's private docs. A task that would put a specific of the search into the repo stops, and that content goes to one of those two places.
- Signed-out pages, the private screen and the metadata carry the generic name "Job search", never a person's name. Every page is `noindex` (the root metadata) and `app/robots.ts` disallows everything.

## Stack
- Next.js 16, React 19, Tailwind CSS, shadcn/ui via `@repo/ui` (default theme, Geist)
- Neon Postgres via `@neondatabase/serverless`, Drizzle ORM, generated migrations in `db/migrations/`
- Auth via `@neondatabase/auth` (Better Auth powered)
- DI via `@evyweb/ioctopus`

## Differences from recipes
The infrastructure is copied from recipes, not shared (docs/build-plan.md KTD1). Four things differ on purpose:
- **No redirects on the tool path (KTD4).** A redirect navigates the page, so a page tool gets nothing back and Claude can't confirm a write. `proxy.ts` lets a request carrying the `Next-Action` header past its signed-out redirect, both with no session cookie and when the session-cache refresh finds the session ended, so the action answers `unauthenticated` itself. Recipes' proxy redirects them. Actions call `revalidatePath`, never `redirect`, and return an envelope (Backend Rules).
- **Environments (KTD17).** The local `.env` and preview deploys use the Neon test project only. Production values live only in Vercel's Production environment, as sensitive variables, and never pass through a Claude session. Recipes uses its production database locally; this app doesn't, because `.worktreeinclude` copies `apps/*/.env` into every worktree.
- **Logging (KTD20).** Logs carry error classes, codes and record ids, never field values. Recipes logs `err.message`, and a failed query's message carries its parameters (names, notes, pay). Here the transaction manager, `BaseRepository.handleError`, `toActionError` and the auth route log only what `loggable(err)` (`src/entities/errors/loggable.ts`) gives: the error's class and the first code down its cause chain, such as Postgres's SQLSTATE. The auth route logs Neon's failed answers by status and path, never the body.
- **A session that can't be read (U2).** `NeonAuthService` throws when Neon answers `getSession` with an error; recipes' copy returns null, as if signed out. The auth route lets signed-out requests through to Neon (to sign in), so a failure must never read as signed out.

## Architecture

```
app/
  (api)/api/auth/[...path]/  # Neon Auth's endpoints, limited for any session but Hector's (Auth Rules)
  (auth)/                    # Outside the shell: welcome/ (the name and Sign in), auth/[path]/ (Neon's forms)
                             # and private/ (any account but the app's two)
  (main)/                    # Signed in, in the app shell: This week at /
  _components/               # app-shell.tsx (sidebar on desktop, off-canvas sheet on phones, KTD19),
                             # session-chrome.tsx (Claude's banner), record-history.tsx (a record's history)
  _lib/                      # auth client, auth paths, current actor (page and action helpers), safe redirect
  _providers/                # @repo/ui ThemeProvider around AuthProvider
  actions/                   # shared.ts: the envelope and its helpers (not "use server"); a file per domain to come
  error.tsx, not-found.tsx, robots.ts

src/
  entities/                  # errors (common.ts, loggable.ts), models (actor, activity, user, session,
                             # transaction, logger), week.ts
  application/repositories/  # interfaces: activity
  application/services/      # interfaces: authentication, logger, transaction-manager
  application/use-cases/     # access/ (resolve-actor, require-human), activity/ (record-change, list-activity)
  interface-adapters/        # controllers/activity/list-activity
  infrastructure/repositories/  # base, activity (+ mock)
  infrastructure/services/   # neon-auth, console-logger, transaction-manager (+ mocks)

di/                          # container.ts, types.ts, modules: logger, authentication, access, transaction, activity
db/                          # schema.ts, index.ts, migrations/ (drizzle-kit generated)
lib/                         # auth/server.ts, logger.ts
tests/                       # bun:test, mirroring the source tree
proxy.ts
```

Not copied yet: recipes' `app/_lib/call-action.ts`, the wrapper for an action called from the browser. Nothing calls one from the browser before U4's page tools, which also give it `reload-needed` (KTD5), and Fallow fails an unused file.

## Cache Components
Recipes' rules carry over ([its AGENTS.md](../hectors-recipes/AGENTS.md#cache-components)):
- `export const dynamic`, `revalidate` and `dynamicParams` fail the build. A page that reads the session, its address or the database in its body gets a `loading.tsx` in its own folder.
- Read the session first, then the clock: This week does (`todayIn` runs at request time).
- A page without a `loading.tsx` puts what it reads at request time inside `<Suspense>`: the welcome screen's Sign in, the auth pages' form and the private screen's account. So does the `(main)` layout's `SessionChrome`.
- `experimental.hideLogsAfterAbort` keeps Neon Auth's own `catch` from logging the end of a prerender as a cookie validation error during `next build`.
- `next build` needs `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` set (`lib/auth/server.ts` throws at import without them), but nothing at build time reaches Neon or the database, so placeholder values build.

## Auth Rules
- Two accounts use the app (KTD2): Hector's is the `owner` and Claude's the `agent`, and both act on Hector's rows. Who's acting comes from `app/_lib/current-actor.ts`, as `{ actor, ownerId }`: `getPageActor()` in pages and the session chrome, `getActionActor()` in server actions. Both go through `IResolveActor` (`src/application/use-cases/access/resolve-actor.ts`).
- Identity goes by user id, never email: `OWNER_USER_ID` and `AGENT_USER_ID`, read by `di/modules/access.module.ts` (tests pin `MockAuthService`'s `TEST_ACCOUNTS`). A missing or malformed id refuses every session, and the first refusal logs it.
- Any other signed-in account is refused before anything is read. `getPageActor` redirects it to `/private`, which shows its email and Sign out and nothing else; with no session it throws into `app/error.tsx` (the proxy has already sent signed-out visitors to the welcome screen). `getActionActor` never redirects (KTD4): it throws `NotAllowedError`, which the action answers as `not-allowed`, or `UnauthenticatedError` when no one is signed in.
- A layout doesn't stop its pages from rendering, so every page calls `getPageActor` itself. The `(main)` layout's `SessionChrome` only decorates: Claude's banner (and, from U4, the tool registrar), streamed inside `<Suspense>`.
- The auth route passes `GET get-session` and `POST sign-out` from any session (R21: Claude's session can only read itself and sign out). Every other endpoint (update-user, change-email and the rest) reaches Neon only from Hector's session or from no session (signing in). Claude's session gets 403 `human-only`, any other account 403 `not-allowed`, and a session that can't be read gets a 500.
- `IAuthenticationService.getSession()` is null only when no one is signed in, and throws when the session can't be read (Differences from recipes). The private screen reads the email through it. `lib/auth/server.ts` is only for the auth route, the auth page and `NeonAuthService`.
- `proxy.ts` is recipes' cookie check and session-cache refresh ([../../docs/proxy-auth-research.md](../../docs/proxy-auth-research.md), 2026-09 addendum), plus the `Next-Action` pass-through above. Signed-out pages go to `/welcome?redirectTo=<path>`; the welcome and auth pages honor only same-app paths (`app/_lib/safe-redirect.ts`).
- Sign-up is off in the UI: `AuthProvider` sets `signUp={false}`, so the sign-in form has no link to it and its view sends visitors to sign in, and the welcome screen offers only Sign in. Both accounts are created before first use, and Neon's own setting closes sign-up once they exist (the plan's H2).
- Safari can't sign in on `http://localhost` (Neon Auth's cookies are always `Secure`), as in recipes.

## Backend Rules
- **Actions answer an envelope (KTD4).** Each action in `app/actions/<domain>.ts` returns `ActionResult<T>` (`app/actions/shared.ts`): `succeeded(data)`, which is `{ ok: true, data, asOf }`, or `toActionError(err, actionLogger(op), fallback)`, `{ ok: false, code, message, fields?, current? }`. It calls `revalidatePath`, never `redirect`. The mapping: `InputParseError` → `validation` (with `fields`), `UnauthenticatedError` → `unauthenticated`, `NotAllowedError` → `not-allowed`, `HumanOnlyError` → `human-only`, `NotFoundError` → `not-found`, `ConflictError` → `conflict` (with `current`, the record as it is now), anything else → `unexpected` with the action's own message. `duplicate`, `queue-full`, `calendar-disconnected` and `reload-needed` arrive with the units that raise them.
- **Every write records its change (R19, KTD7).** Inside the write's own transaction, the use case calls `recordChange` (`src/application/use-cases/activity/record-change.ts`) with the `ChangeContext` (`{ actor, ownerId, tool? }`, `src/entities/models/activity.model.ts`) the action builds from `getActionActor()` and the page tool's name. Give `before` and `after` the fields the change touched; it keeps only those whose values differ. The `activity` table is append-only: never update or delete a row.
- **Human-only operations check first (R21, KTD3).** Accepting, dismissing or reopening a proposal, deleting anything, connecting or disconnecting the calendar and changing settings: the use case calls `requireHuman` (`src/application/use-cases/access/require-human.ts`) before its own transaction opens. Anyone but Hector gets a `refused` row, written in a transaction of its own so it stays, and `HumanOnlyError`.
- A record that keeps a history adds its kind to `recordKindSchema` (`activity.model.ts`), and its page mounts `<RecordHistory record={{ kind, id }} />`, which shows the latest 50 changes.
- A screen or tool input gets a label in `FIELD_LABELS` (`app/actions/shared.ts`): a validation message names only listed fields. A record's history names every field, in words when it has no label (`nextStep` is "Next step").
- An error class thrown inside a transaction goes in the transaction manager's `DOMAIN_ERRORS`, or the action sees "Transaction failed" instead. Recipes' `UnauthorizedError` isn't here: nothing threw it, and `NotAllowedError` and `HumanOnlyError` are the refusals.
- Every repository query takes the owner id (KTD2), with a PGlite test that another owner's rows stay out. A repository passes `handleError` record ids only.

## Logging Rules
- Never call `console.*` directly.
- Use `ILoggerService` in server-side app code and the layers; `lib/logger.ts` in root files that wrap `lib/auth/server.ts` (the auth route).
- Log error classes, codes and record ids, never a field value, an error's message, a response body or a token (KTD20): pass an error through `loggable(err)`.
- A new error class sets `override name = "<ClassName>"`, as those in `src/entities/errors/common.ts` do: the production build renames classes (`class D extends Error`, checked in `.next/server` on 2026-10-23), and `loggable` names an error by its `name`.

## Environments
- Env names, in `.env.example` and `turbo.json`: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `OWNER_USER_ID`, `AGENT_USER_ID`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_CALENDAR_ACCOUNT_EMAIL`, `CALENDAR_TOKEN_KEY`, `LOG_LEVEL`. Turborepo withholds any variable `turbo.json` doesn't list from `next build`.
- The local `.env` holds test-project values only. `tests/_support/preload.ts` deletes every one of these but `LOG_LEVEL` before the tests run.
- Ports: `next dev` on 3101 (`.claude/launch.json`); the browser flows will use 3301 (U4).
- Deploying: a Vercel project rooted at `apps/job-search`, on the default `vercel.app` domain, built only when the app changed (`vercel.json`'s `ignoreCommand`). Not set up yet: it waits on H1 in the plan.

## UI Rules
- The shell is `app/_components/app-shell.tsx`. A unit that adds a section adds its item to the sidebar menu.
- The plan's UI definition of done asks for 44 × 44 px touch targets. `SidebarMenuButton` at `lg` is 48 px, but in the default theme `Button` at `lg` is 36 px: recipes reaches 45 px only through its theme's spacing. A `Button` that's a touch target adds `min-h-11` (44 px; the design lint counts height as layout), as the private screen's Sign out does.

## Testing
- `tests/` mirrors the source tree (`proxy.ts` → `tests/proxy.test.ts`); run tests from this folder so `bunfig.toml`'s preload applies.
- The preload points `@/db` at PGlite, swaps `@/lib/auth/server` for a stand-in whose route handler records what reached Neon (`tests/_support/neon-auth.ts`; set `neonAuth.answer` to make Neon fail, and `neonAuth.reset()` after), makes `redirect()` throw `Redirected` (`tests/_support/next.ts`), and stubs `next/font/google` for the root layout.
- Database: PGlite, an in-memory Postgres (`tests/_support/database.ts`), with the real migrations applied, so nothing in tests reaches Neon. Use-case and repository tests use `describeEachBackend` and `makeApp()` (`tests/_support/app.ts`, recipes' harness): each test runs on the mock repositories and on the real ones over PGlite, and one that fails only on `[postgres]` means a mock has drifted from the SQL. What only a database shows, such as a rollback, is tested on PGlite alone, with `resetDatabase()` in `beforeEach` and `sql()` for checks, never inside an open transaction (PGlite has one connection).
- `RecordingLogger` (`tests/_support/logger.ts`) keeps every line logged at every level, so a test can show a value never reached the logs (KTD20).
- Who's signed in: `signInAs("owner" | "agent" | "stranger" | "signed-out")` (`tests/_support/session.ts`) sets the test container's `MockAuthService`. The container lives for the whole run, so every test that depends on the session calls it. Its mock repositories keep their rows for the whole run too, and the owner never changes, so a test that goes through the container works on records of its own (a fresh `crypto.randomUUID()`).
- Screen tests are `*.test.tsx`, as in recipes: `bunfig.toml` leaves them out of a plain `bun test`, `bun run test:screens` runs them with happy-dom (`tests/_support/dom.ts`), each file isolated, and `bun run test` runs both. Server components render with `renderOnServer` (`tests/_support/server-render.ts`): the tree streams as the server would send it, async components and `<Suspense>` included, into the page, and Testing Library's `within` finds things in it. Fallow can't see that preload, so `.fallowrc.json` lists it as an entry.

## Commands
```bash
bun run dev --filter=job-search
bun run build --filter=job-search
bun run --filter=job-search db:generate --name=<what>   # after editing db/schema.ts; review the SQL
bun run --filter=job-search db:migrate    # the test project (.env); production migrates from Hector's terminal (KTD17)
bun run test --filter=job-search          # both passes; or from apps/job-search: bun test tests/proxy.test.ts
bun run --filter=job-search test:screens  # the screen tests (*.test.tsx) alone
```

## Before Finishing Any Change
```bash
bun check --filter=job-search && bun ts --filter=job-search
bun run test --filter=job-search
bun run dead-code
```

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
