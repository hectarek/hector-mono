# AGENTS.md — stash

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers stash-specific context.

## Overview
Full-stack stash/bookmark app with auth and database. This is a complex app — use clean architecture patterns.

Deployment: not deployed; no Vercel project.

## Stack
- Next.js 16, React 19, Tailwind CSS, shadcn/ui
- Neon Postgres via `@neondatabase/serverless` (WebSocket Pool driver), Drizzle ORM
- Auth via `@neondatabase/auth` (powered by Better Auth)
- DI via `@evyweb/ioctopus`

## Architecture
Follows clean architecture with full layer separation. Canonical pattern reference: [../../docs/clean-architecture.md](../../docs/clean-architecture.md). This was the first app built on the pattern, as an example; `hectors-recipes` is now the reference implementation, so where the two differ, follow recipes.

```
app/
  _components/         # UI (stash-list, stash-item-card, add-item-form, header, empty-stash)
  _providers/          # Providers: @repo/ui ThemeProvider around AuthProvider
  _lib/auth.ts         # Auth client config (only used by AuthProvider)
  actions/             # Server actions, split per domain (stash-items.ts); shared.ts holds their helpers (not "use server")
  (main)/account/[path]/     # Account routes
  (auth)/auth/[path]/        # Auth routes (sign-in, sign-up)
  (api)/api/auth/[...path]/  # Auth API catch-all (framework plumbing, delegates to SDK)
  page.tsx             # Main page
src/
  entities/
    errors/common.ts                    # InputParseError, NotFoundError, etc. (with default messages)
    models/stash-item.model.ts          # StashItem Zod schema
    models/user.model.ts                # User Zod schema (domain user identity)
    models/session.model.ts             # Session Zod schema (wraps User)
    models/transaction.model.ts         # ITransaction interface
    models/logger.model.ts              # LogLevel type + priority map
  application/
    repositories/stash-items.repository.interface.ts
    services/authentication.service.interface.ts
    services/logger.service.interface.ts
    services/transaction-manager.service.interface.ts
    use-cases/stash-items/              # add, complete, delete, get-stash-items
  infrastructure/
    repositories/base.repository.ts             # Abstract base (getDbContext, handleError, logger)
    repositories/stash-items.repository.ts      # Drizzle implementation (extends BaseRepository)
    repositories/stash-items.repository.mock.ts # Test mock
    services/neon-auth.service.ts               # Neon Auth implementation
    services/mock-auth.service.ts               # Test mock
    services/transaction-manager.service.ts     # Drizzle transaction implementation
    services/mock-transaction-manager.service.ts # Test mock
    services/console-logger.service.ts          # Console logger (edge-safe)
    services/mock-logger.service.ts             # Test mock (silent no-op)
  interface-adapters/
    controllers/stash-items/            # add, complete, delete, get-stash-items
di/
  container.ts         # IoC container setup
  types.ts             # DI token keys
  modules/authentication.module.ts
  modules/logger.module.ts
  modules/stash-items.module.ts
  modules/transaction.module.ts
db/
  schema.ts            # Drizzle schema (stash_items table)
  index.ts             # DB connection (Pool + drizzle-orm/neon-serverless)
lib/
  auth/server.ts       # Neon auth server config (used by NeonAuthService, the auth route handler and the auth page)
  logger.ts            # Standalone logger instance (edge-safe, used by the auth route handler)
proxy.ts               # Next.js 16 proxy (replaces deprecated middleware.ts)
tests/                 # bun:test; mirrors the source tree, shared setup in _support/ (see Testing)
```

## Data Flow
1. **Reads**: `page.tsx` -> `getInjection("IAuthenticationService")` -> `getInjection("IGetStashItemsController")` -> use case -> repository -> Drizzle/Neon
2. **Writes**: Form (`action` prop) -> server action (`actions/stash-items.ts`) -> `getInjection("IAuthenticationService")` -> `getInjection(controller)` -> use case -> repository -> `revalidatePath("/")`

## Key Patterns
- Server actions split per domain in `app/actions/` (e.g. `stash-items.ts`); every action's catch goes through `toActionError` in `app/actions/shared.ts`, as in hectors-recipes.
- Controllers are higher-order functions: `(useCase, logger) => (input, userId) => ...`
- Use cases are higher-order functions: `(repository, logger) => (input, userId) => ...`
- All infrastructure classes that need logging accept `ILoggerService` via constructor and create a scoped child
- Repositories extend `BaseRepository` which provides `getDbContext(tx)`, `handleError(err, method, ctx)`, and a pre-scoped logger
- `revalidatePath("/")` after mutations
- Forms use `action` prop with server actions, `useActionState` for forms needing state feedback, `useFormStatus` for pending indicators

## Cache Components
- `cacheComponents` and `partialPrefetching` are on (`next.config.ts`), so `export const dynamic` and `dynamicParams` fail the build. Anything read at request time (the session, cookies) sits inside `<Suspense>`: the home page's header and add form are the prerendered shell, and the list (`UserStash` in `app/page.tsx`) streams in behind its skeleton.
- The auth and account pages prerender Neon's view paths (`AUTH_PATHS`, `ACCOUNT_PATHS` in `app/_lib/auth-paths.ts`) through `generateStaticParams`, and any other path is `notFound()`, a real 404. The sign-in pages' session check is inside `<Suspense>` with the form after it, so someone already signed in goes home without the form flashing first.
- A page that reads the session stops prerendering at the read, and the auth service's `catch` (and Neon's own) would log that stop as a failed sign-in. `experimental.hideLogsAfterAbort` hides logs written after the stop; request-time logs are unchanged.
- Neon's UI moves with full page loads (its default `navigate` sets `window.location.href`, and its links are plain `<a>`), so signing out clears every page Next.js keeps alive.
- `next build` needs `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET` set (`lib/auth/server.ts` throws at import without them). Nothing at build time reaches Neon, so placeholder values build.

## Database
- Schema in `db/schema.ts`. Stash has no migrations yet: edit the schema, then `bun run --filter=stash db:push` (applies it straight to stash's database; ask Hector first, it's a real database).
- Drizzle Kit commands: `db:push`, `db:generate`, `db:studio`

## Good Examples
| Type | File |
|------|------|
| Controller | `src/interface-adapters/controllers/stash-items/add-item.controller.ts` |
| Use case | `src/application/use-cases/stash-items/add-item.use-case.ts` |
| Repository interface | `src/application/repositories/stash-items.repository.interface.ts` |
| Service interface | `src/application/services/authentication.service.interface.ts` |
| Base repository | `src/infrastructure/repositories/base.repository.ts` |
| Repository impl | `src/infrastructure/repositories/stash-items.repository.ts` |
| Service impl | `src/infrastructure/services/neon-auth.service.ts` |
| Server action | `app/actions/stash-items.ts` |
| Action helpers (`toActionError`) | `app/actions/shared.ts` |
| DI module | `di/modules/stash-items.module.ts` |
| Domain model | `src/entities/models/stash-item.model.ts` |
| Transaction model | `src/entities/models/transaction.model.ts` |
| Transaction service | `src/application/services/transaction-manager.service.interface.ts` |
| Logger interface | `src/application/services/logger.service.interface.ts` |
| Logger impl | `src/infrastructure/services/console-logger.service.ts` |
| Standalone logger | `lib/logger.ts` |

## Commands
```bash
bun run dev --filter=stash
bun run build --filter=stash
bun run --filter=stash db:push
bun run --filter=stash db:studio
bun run test --filter=stash           # or: cd apps/stash && bun test tests/path/to/file.test.ts
```

## Testing
- `tests/` mirrors the source tree: the test for `app/actions/shared.ts` is `tests/app/actions/shared.test.ts`. Run tests from the app, so `bunfig.toml`'s preload applies.
- `tests/_support/preload.ts` runs before every test file. It deletes `DATABASE_URL` and the two auth env vars that Bun loads from `.env`, swaps `@/db` for PGlite (an in-memory Postgres) and stubs `lib/auth/server.ts`, so no test can reach Neon. Under `bun test` the DI container binds the mocks (`NODE_ENV` is `test`).
- The PGlite database starts with no tables: stash has no migrations to apply. The transaction manager's tests create the table they write to.

## Environment
- Env vars: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET` (`LOG_LEVEL` optional), the same names as `hectors-recipes`. `lib/auth/server.ts` throws at import without the two auth vars, so every auth page fails.
- Turborepo runs builds in strict env mode: a variable not listed in this app's `turbo.json` (`tasks.build.env`) is withheld from `next build` even if it's set in Vercel (once deployed). Add new env vars there too.

## Before Finishing Any Change
Scope checks to this app:
```bash
bun check --filter=stash && bun ts --filter=stash && bun run test --filter=stash
```

## Conventions

### Zod 4
- Import as `import { z } from "zod"` -- we are on `zod@^4`, so the `"zod/v4"` subpath is unnecessary (that subpath is for projects still on 3.25.x)
- Use top-level validators: `z.uuid()`, `z.url()`, `z.email()` -- never `z.string().uuid()`, `z.string().url()` etc. (deprecated in Zod 4)
- Use `error` param not `message` for custom error messages

### File Naming
- Model files use `.model.ts` suffix (e.g. `stash-item.model.ts`)
- All files and folders use kebab-case

### React 19 Patterns
- `useActionState` for forms that submit server actions and need state feedback (errors, success)
- `action` prop on `<form>` elements for server action binding -- no manual `onSubmit` + `e.preventDefault()`
- `useFormStatus` in child components for pending indicators inside forms
- Avoid `useTransition` + `useState` combos for form handling -- use the patterns above instead
- `use()` + `<Suspense>` for client-side data fetching (reading promises in render)
- Server Components with async/await for server-side data fetching

### Authentication
- Always go through `IAuthenticationService` via DI -- never import `auth` from `lib/auth/server` directly in server actions or pages
- `lib/auth/server.ts` has three consumers: `NeonAuthService`, `app/(api)/api/auth/[...path]/route.ts`, and the auth page (`app/(auth)/auth/[path]/page.tsx`, to send someone already signed in back to the app). `proxy.ts` doesn't use it.
- `/auth/*` pages bounce someone already signed in back to the app, except `sign-out` (`skipsWhenSignedIn` in `app/_lib/auth-paths.ts`): sign-out needs the session it ends.
- `app/_lib/auth.ts` is the client-side auth config -- only imported by `AuthProvider`
- `IAuthenticationService.getSession()` returns `Session | null` where `Session` has a `user: User` property
- Access userId via `session.user.id`, not `session.userId`

### Proxy (Route Protection)
- `proxy.ts` is the Next.js 16 convention (replaces deprecated `middleware.ts`)
- Handles auth redirects for all protected routes -- pages should NOT duplicate redirect logic
- If you need to check session in a page, it is for getting the userId, not for redirect guards
- It checks the session cookie only, except when Neon's 5-minute session cache cookie has expired: then it refreshes the cache through `/api/auth/get-session`, because a page can't write the refreshed cookie (`getSession()` throws in a page and it fails as signed out). Same as `hectors-recipes`; see [docs/proxy-auth-research.md](../../docs/proxy-auth-research.md) (2026-09 addendum).

### Providers
- Live in `app/_providers/`
- Composed in a single `Providers` component that wraps the app in `layout.tsx`
- Add new providers inside `Providers`, not directly in `layout.tsx`

### TypeScript
- TS config at app level has `declaration: false` override for Neon Auth SDK compatibility in the monorepo
- Do not change this setting

### Clean Architecture
- `app/` layer only imports from `entities`, `di`, and other `app/` files, plus root `lib/` for the auth route handler, the auth page and route-handler logging
- Never import infrastructure implementations directly in `app/` -- always go through DI
- Interface definitions live in `application/` layer, implementations in `infrastructure/`

### Server Actions
- Split per domain into `app/actions/` (e.g. `stash-items.ts`, not a single `actions.ts`)
- Each action file is `"use server"` and handles its own auth + error handling
- `app/actions/shared.ts` holds what action files share. It isn't `"use server"`, so nothing in it is callable from the client: `ActionState`, `actionLogger(op)`, `text(formData, key)` (trimmed; blank or missing is `undefined`) and `toActionError(err, logger, fallback)`. A helper a second action file needs (e.g. `getUserId`) moves there too
- `toActionError`: `InputParseError`, `UnauthenticatedError`, `UnauthorizedError` and `NotFoundError` show their own message and are logged at `warn`; anything else is logged at `error` and shows `fallback`. `completeItem` and `deleteItem` return nothing (the card's `<form action>` shows no error), so they call it for its log line only

### Folder Structure Rationale
- **`db/`** and **`lib/`** stay at project root (not in `src/infrastructure/`). They are shared initialization consumed by multiple layers (infrastructure wraps them, framework delegates to them). They sit outside any clean architecture layer, like `drizzle.config.ts`.
- **`lib/auth/server.ts`** is consumed by `NeonAuthService` (infrastructure), the auth route handler and the auth page (framework). It cannot live in infrastructure because the app layer must not import from infrastructure.
- **`app/_lib/auth.ts`** is the client-side auth config. It stays in the app layer because it is a `"use client"` concern that does NOT go through DI (the DI container is server-side only).
- **`src/infrastructure/`** contains clean architecture implementations that _wrap_ the root-level initializations (e.g. `NeonAuthService` wraps `lib/auth/server.ts`, `StashItemsRepository` wraps `db/`).
- **Infrastructure-to-infrastructure imports** are acceptable for shared utilities (e.g. `unwrapDrizzleTx` in `transaction-manager.service.ts` is imported by `base.repository.ts`). Both are infrastructure; the utility bridges domain abstractions (`ITransaction`) to concrete Drizzle types.

### Entry Points
The app has three types of entry points. Not every entry point goes through the full clean architecture stack. **All entry points must have error logging** -- use DI logger for server-side code, `lib/logger.ts` for edge/root code:
- **Server Actions** (`app/actions/`): Internal UI mutations. Go through DI -> Controller -> Use Case -> Repository. Always contain business logic. Wrap in try/catch with a scoped logger (`actionLogger`); the catch goes through `toActionError` (see Server Actions).
- **Route Handlers** (`app/(api)/api/`): External/SDK endpoints. If they contain business logic, go through DI -> Controller. If they are pure framework plumbing (e.g. auth handler), they delegate directly to the SDK. Wrap with error logging using `lib/logger.ts`.
- **Proxy** (`proxy.ts`): Route protection. Checks the session cookie and refreshes the session cache when it has expired (see Proxy above). No SDK middleware, no logging.
- **Pages** (`app/page.tsx`): Server components that fetch data. Wrap data fetching in try/catch with logged fallback to prevent unlogged crashes.

### Domain Error Messages
- All error classes in `src/entities/errors/common.ts` have default messages and accept optional `ErrorOptions`
- Pattern: `constructor(message = "Default message", options?: ErrorOptions)`
- Use cases can override with specific messages: `throw new NotFoundError("Stash item not found")`
- Default messages are for cases where the caller does not need to specify context

### Domain Models
- `User` (`user.model.ts`): Domain identity for a user (id, name, email). Decoupled from auth provider.
- `Session` (`session.model.ts`): Wraps a `User`. Returned by `IAuthenticationService.getSession()`.
- `StashItem` (`stash-item.model.ts`): Core domain entity.
- `ITransaction` (`transaction.model.ts`): Abstract transaction handle with `rollback()`.

### Transactions
- `ITransaction` is a domain-level abstraction in `entities/models/` -- knows nothing about Drizzle
- `ITransactionManagerService` in `application/services/` provides `startTransaction(callback)` -- callback-based API (auto-commits on resolve, safer than imperative `beginTransaction()`)
- Repository mutation methods accept an optional `tx?: ITransaction` parameter
- `BaseRepository.getDbContext(tx)` calls `unwrapDrizzleTx(tx)` to resolve the executor -- uses branded type check, not duck-typing
- Infrastructure uses an opaque `DrizzleTransactionWrapper` class with `_brand` + `_internal` to hide Drizzle types from the domain
- **Double-completion guard**: `rollback()` throws if the transaction is already completed
- **Timeout**: `startTransaction()` starts each transaction with `set local statement_timeout` (15s), so Postgres cancels a stuck statement and the whole transaction rolls back. Don't race the transaction against a JS timer: that reported failure while the work carried on and could still commit. Not `transaction_timeout` either: it kills the connection, which the Neon driver surfaces as an unhandled error
- **Rollback vs error distinction**: Drizzle's `TransactionRollbackError` is caught separately and logged at `warn` (not `error`)
- **Domain errors pass through**: a domain error thrown inside the callback (`NotFoundError`, `UnauthorizedError`, etc., listed in `DOMAIN_ERRORS`) rolls the transaction back and reaches the caller unchanged; only unexpected driver errors become `DatabaseOperationError("Transaction failed")`. Keep it that way, or denials surface as "Transaction failed". A new domain error class that can be thrown inside a transaction must be added to `DOMAIN_ERRORS`
- Mock implementations ignore `tx` and `MockTransactionManagerService` just executes the callback directly
- DB driver: `@neondatabase/serverless` Pool (WebSocket) via `drizzle-orm/neon-serverless` -- required for transaction support (HTTP driver does not support transactions)

### BaseRepository
- All concrete repositories extend `BaseRepository` from `infrastructure/repositories/base.repository.ts`
- Provides: `getDbContext(tx?)` for transaction-aware executor, `handleError(err, method, ctx)` for consistent error logging and rethrow, and a pre-scoped `this.logger`
- Constructor signature: `super(logger, "domain-name")` -- creates a child logger scoped to `{ layer: "repository", op: "domain-name" }`
- `handleError` classifies errors: re-throws `DatabaseOperationError` directly, wraps all other errors in `DatabaseOperationError` with `{ cause }`, and logs at error level
- New repositories should extend `BaseRepository` and use `this.getDbContext(tx)` / `this.handleError(err, method)` instead of manual try/catch patterns

### Logging
- Never use `console.*` directly -- always use `ILoggerService` (DI) or `lib/logger.ts` (edge/root)
- **Logger as a dependency**: `ILoggerService` is injected into all layers via DI:
  - **Repositories**: received via constructor, scoped by `BaseRepository` (`super(logger, "domain-name")`)
  - **Use cases**: received as second factory argument, scoped with `.child({ layer: "use-case", op: "fnName" })`
  - **Controllers**: received as second factory argument, scoped with `.child({ layer: "controller", op: "fnName" })`
  - **Services** (auth, transaction): received via constructor, scoped with `.child({ layer: "service", op: "name" })`
  - **Server actions**: `actionLogger("fnName")` from `app/actions/shared.ts`, which is `getInjection("ILoggerService").child({ layer: "action", op: "fnName" })`
  - **Route handlers**: `import { logger } from "@/lib/logger"` then `.child({ layer: "route", op: "auth" })`
  - **Pages**: `getInjection("ILoggerService").child({ layer: "page", op: "getStash" })`
- Standard `layer` values: `action`, `use-case`, `controller`, `repository`, `service`, `route`, `page` (the proxy doesn't log)
- `op` is the specific function/method name (e.g. `addItem`, `create`, `auth`, `transaction`)
- Log output format: `[LEVEL] [layer/op] message { context }`
- Log levels (ordered by severity):
  - `debug` -- verbose dev detail (data shapes, query params)
  - `info` -- normal operations (action invoked, use case started)
  - `warn` -- recoverable issues (validation failures, denied access)
  - `error` -- failures (database errors, unexpected exceptions)
- `LOG_LEVEL` env var controls minimum level. Defaults: `debug` (dev), `warn` (prod), `error` (test)
- **Edge / root-level code** (e.g. route handlers): `import { logger } from "@/lib/logger"` -- standalone instance, no DI dependency
- `lib/logger.ts` follows the same root-level initialization pattern as `lib/auth/server.ts`
- Future enhancement: request correlation IDs via `AsyncLocalStorage` for cross-layer tracing
