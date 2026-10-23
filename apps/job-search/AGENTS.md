# AGENTS.md — job-search

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers app-specific context

## Overview
A private job search workspace. Its owner and Claude both keep it current, and each day it shows what needs a decision and what's due. Claude is to work in it through page tools (WebMCP) from its own browser profile. Clean architecture on recipes' pattern: [../../docs/clean-architecture.md](../../docs/clean-architecture.md), with `apps/hectors-recipes` as the reference.

The plan of record is [docs/build-plan.md](docs/build-plan.md): read its Status and How to resume before starting any of its tasks. Built so far: U1, the scaffold (sign-in and an empty shell).

## Privacy (R24)
- The repo is public. Code, tests, fixtures, docs, tool descriptions, screenshots, commit messages and PR text use fictional or generic data. Companies, people, targets, pay and strategy live only in the app's database or Hector's private docs. A task that would put a specific of the search into the repo stops, and that content goes to one of those two places.
- Signed-out pages and metadata carry the generic name "Job search", never a person's name. Every page is `noindex` (the root metadata) and `app/robots.ts` disallows everything.

## Stack
- Next.js 16, React 19, Tailwind CSS, shadcn/ui via `@repo/ui` (default theme, Geist)
- Neon Postgres via `@neondatabase/serverless`, Drizzle ORM (`db/schema.ts` has no tables yet)
- Auth via `@neondatabase/auth` (Better Auth powered)
- DI via `@evyweb/ioctopus`

## Differences from recipes
The infrastructure is copied from recipes, not shared (docs/build-plan.md KTD1). Three things differ on purpose:
- **No redirects on the tool path (KTD4).** A redirect navigates the page, so a page tool gets nothing back and Claude can't confirm a write. `proxy.ts` lets a request carrying the `Next-Action` header past its signed-out redirect, both with no session cookie and when the session-cache refresh finds the session ended, so the action answers `unauthenticated` itself. Recipes' proxy redirects them. Actions call `revalidatePath`, never `redirect`, and return an envelope (U3).
- **Environments (KTD17).** The local `.env` and preview deploys use the Neon test project only. Production values live only in Vercel's Production environment, as sensitive variables, and never pass through a Claude session. Recipes uses its production database locally; this app doesn't, because `.worktreeinclude` copies `apps/*/.env` into every worktree.
- **Logging (KTD20).** Logs carry error classes, codes and record ids, never field values. That change lands in U3; until then the copied transaction manager and auth route log as recipes' do.

## Architecture

```
app/
  (api)/api/auth/[...path]/  # Neon Auth's endpoints
  (auth)/                    # Signed out: welcome/ (the name and Sign in) and auth/[path]/ (Neon's forms)
  (main)/                    # Signed in, in the app shell: This week at /
  _components/app-shell.tsx  # Sidebar on desktop, off-canvas sheet on phones (KTD19)
  _lib/                      # auth client, auth paths, current user, safe redirect
  _providers/                # @repo/ui ThemeProvider around AuthProvider
  error.tsx, not-found.tsx, robots.ts

src/
  entities/                  # errors/common.ts, models (user, session, transaction, logger), week.ts
  application/services/      # interfaces: authentication, logger, transaction-manager
  infrastructure/services/   # neon-auth, console-logger, transaction-manager (+ mocks)

di/                          # container.ts, types.ts, modules: logger, authentication, transaction
db/                          # schema.ts, index.ts
lib/                         # auth/server.ts, logger.ts
tests/                       # bun:test, mirroring the source tree
proxy.ts
```

Not copied yet, because nothing uses them and Fallow fails an unused file or export: recipes' `BaseRepository` (with the transaction manager's `unwrapDrizzleTx` and `db/index.ts`'s `Database` type), `app/actions/shared.ts` and `app/_lib/call-action.ts`. The first unit that needs one copies it from recipes.

## Cache Components
Recipes' rules carry over ([its AGENTS.md](../hectors-recipes/AGENTS.md#cache-components)):
- `export const dynamic`, `revalidate` and `dynamicParams` fail the build. A page that reads the session, its address or the database in its body gets a `loading.tsx` in its own folder.
- Read the session first, then the clock: This week does (`todayIn` runs at request time).
- A page without a `loading.tsx` puts what it reads at request time inside `<Suspense>`: the welcome screen's Sign in and the auth pages' form.
- `experimental.hideLogsAfterAbort` keeps `NeonAuthService`'s `catch` from logging the end of a prerender as a failed sign-in during `next build`.
- `next build` needs `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` set (`lib/auth/server.ts` throws at import without them), but nothing at build time reaches Neon or the database, so placeholder values build.

## Auth Rules
- Route auth access through `IAuthenticationService` (`getCurrentUserId` in pages). `lib/auth/server.ts` is only for the auth route, the auth page and `NeonAuthService`.
- `proxy.ts` is recipes' cookie check and session-cache refresh ([../../docs/proxy-auth-research.md](../../docs/proxy-auth-research.md), 2026-09 addendum), plus the `Next-Action` pass-through above. Signed-out pages go to `/welcome?redirectTo=<path>`; the welcome and auth pages honor only same-app paths (`app/_lib/safe-redirect.ts`).
- The welcome screen offers only Sign in: two accounts use the app, and sign-up is turned off once both exist (the plan's H2).
- Safari can't sign in on `http://localhost` (Neon Auth's cookies are always `Secure`), as in recipes.

## Logging Rules
- Never call `console.*` directly.
- Use `ILoggerService` in server-side app code and the layers; `lib/logger.ts` in root files that wrap `lib/auth/server.ts` (the auth route).

## Environments
- Env names, in `.env.example` and `turbo.json`: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `OWNER_USER_ID`, `AGENT_USER_ID`, `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_CALENDAR_ACCOUNT_EMAIL`, `CALENDAR_TOKEN_KEY`, `LOG_LEVEL`. Turborepo withholds any variable `turbo.json` doesn't list from `next build`.
- The local `.env` holds test-project values only. `tests/_support/preload.ts` deletes every one of these but `LOG_LEVEL` before the tests run.
- Ports: `next dev` on 3101 (`.claude/launch.json`); the browser flows will use 3301 (U4).
- Deploying: a Vercel project rooted at `apps/job-search`, on the default `vercel.app` domain, built only when the app changed (`vercel.json`'s `ignoreCommand`). Not set up yet: it waits on H1 in the plan.

## UI Rules
- The shell is `app/_components/app-shell.tsx`. A unit that adds a section adds its item to the sidebar menu.
- The plan's UI definition of done asks for 44 × 44 px touch targets. `SidebarMenuButton` at `lg` is 48 px, but in the default theme `Button` at `lg` is 36 px: recipes reaches 45 px only through its theme's spacing.

## Testing
- `tests/` mirrors the source tree (`proxy.ts` → `tests/proxy.test.ts`); run tests from this folder so `bunfig.toml`'s preload applies.
- No database harness yet: the unit that adds the first table copies recipes' PGlite setup (`tests/_support/database.ts`) and whatever else of `tests/_support/` it uses.

## Commands
```bash
bun run dev --filter=job-search
bun run build --filter=job-search
bun run --filter=job-search db:generate   # after editing db/schema.ts
bun run --filter=job-search db:migrate    # the test project (.env); production migrates from Hector's terminal (KTD17)
bun run test --filter=job-search          # or from apps/job-search: bun test tests/proxy.test.ts
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
