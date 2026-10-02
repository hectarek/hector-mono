# Clean Architecture Guide

The single canonical reference for the **complex apps** in this monorepo (`stash`, `hectors-recipes`, `hectors-tools`, and future apps with a backend/auth/database). `hectors-tools` has no database or auth, so it has no repositories, transactions or auth gate. Simple apps (`hector-portfolio`, `relationship-meter`) deliberately skip all of this — see their `AGENTS.md`.

`hectors-recipes` is the reference implementation; when in doubt, read `apps/hectors-recipes/` and its `AGENTS.md`. Each code sample names its file: most are trimmed from recipes, and the few from `stash`, the first app built on the pattern, show parts that work the same way in both. Stash isn't authoritative, so where recipes does something differently (e.g. recipes runs each access-checked write and its check in one transaction and keeps generated migrations; stash doesn't yet), follow recipes.

> **Lineage:** the structure is based on Lazar Nikolov's [nextjs-clean-architecture](https://github.com/nikolovlazar/nextjs-clean-architecture). We diverge deliberately in two places: we use a lightweight **`ILoggerService`** instead of Sentry instrumentation/crash-reporter services, and **Neon Auth (Better Auth)** instead of Lucia. This guide reflects our reality, not the upstream template.

---

## 1. Core principles

**Dependencies point inward.** Inner layers define abstractions; outer layers implement them. No inner layer imports from an outer layer.

```
app/  (Next.js)  →  src/interface-adapters/  →  src/application/  →  src/entities/
   framework         controllers                use cases +           models +
   server actions                               interfaces            errors
   pages, proxy

src/infrastructure/  implements the interfaces defined in src/application/
di/                  wires abstractions to implementations (composition root)
```

- **Entities** know nothing about use cases, controllers, the database, or the framework.
- **Use cases** know entities and define interfaces (ports) for repositories/services; never import implementations.
- **Controllers** know use cases and entities; not Next.js or the database.
- **Infrastructure** implements the application-layer interfaces.
- **The app layer** calls controllers through the DI container — never imports use cases or infrastructure directly.

---

## 2. Folder structure (real)

```
app/                          # Frameworks & Drivers (outermost)
  _components/                #   UI
  _providers/                 #   AuthProvider, Providers composite
  _lib/auth.ts                #   Client-side auth config (used only by AuthProvider)
  _lib/current-user.ts        #   getCurrentUserId() for actions, pages and route handlers
  _lib/load-*.ts              #   Page loaders shared by pages (load-recipe.ts)
  actions/                    #   Server actions, one file per domain (recipes.ts)
  actions/shared.ts           #   ActionState, actionLogger, text, toActionError (not "use server")
  (api)/api/auth/[...path]/   #   Auth route handler (framework plumbing → SDK)
  (main)/…/page.tsx           #   Server component pages, in route groups by layout
proxy.ts                      # Optimistic cookie check (Next.js 16, replaces middleware.ts)

src/
  entities/                   # Innermost — pure domain
    models/*.model.ts         #   Zod schemas + inferred types
    errors/common.ts          #   Domain error classes
    *.ts                      #   Pure domain functions (scaling.ts, week.ts)
  application/                # Use cases + interfaces (the "what")
    repositories/*.repository.interface.ts
    services/*.service.interface.ts
    use-cases/<domain>/*.use-case.ts
    use-cases/<domain>/*.ts   #   Helpers shared by use cases, no suffix (spaces/require-space-role.ts)
  interface-adapters/
    controllers/<domain>/*.controller.ts
  infrastructure/             # Implementations (the "how")
    repositories/             #   base.repository.ts, *.repository.ts, *.repository.mock.ts
    services/                 #   neon-auth, console-logger, transaction-manager (+ mocks)

di/                           # Dependency injection
  container.ts                #   IoC container + getInjection()
  types.ts                    #   DI_SYMBOLS + DI_RETURN_TYPES
  modules/*.module.ts         #   One module per domain concern

db/                           # Drizzle schema + Neon connection (root-level init)
  schema.ts
  index.ts
  migrations/
lib/
  auth/server.ts              # Neon Auth server config (root-level init)
  logger.ts                   # Standalone logger for code that wraps lib/auth/server.ts (the auth route)

tests/                        # bun test files mirroring the source tree; _support/ holds shared setup
bunfig.toml                   # [test] preload = tests/_support/preload.ts
```

**Why `db/` and `lib/` sit outside `src/`:** they are shared initialization consumed by multiple layers (infrastructure wraps them; the framework delegates to them), like `drizzle.config.ts`. They contain no business logic.

**Imports** use the `@/*` alias (mapped to `./*`), so layer paths read as `@/src/entities/models/...`, `@/di/container`, `@/db`, `@/lib/logger`.

---

## 3. Layers in detail

### 3.1 Entities (`src/entities/`)

Pure domain types, errors and functions (recipes keeps its pure functions, such as `scaling.ts` and `week.ts`, directly in `src/entities/`). Only dependency allowed: `zod`.

**Models** are Zod schemas with inferred types — one source of truth for runtime validation and compile-time types. Files use the `.model.ts` suffix.

```typescript
// src/entities/models/stash-item.model.ts
import { z } from "zod";

export const stashItemSchema = z.object({
  id: z.uuid(),
  userId: z.string(),
  url: z.url(),
  title: z.string().min(1),
  // ...
});
export type StashItem = z.infer<typeof stashItemSchema>;
```

Zod 4 conventions: `import { z } from "zod"`; use top-level validators (`z.uuid()`, `z.url()`, `z.email()`), not `z.string().uuid()`; use the `error` param for custom messages.

**Errors** (`src/entities/errors/common.ts`) are plain `Error` subclasses with default messages and optional `ErrorOptions` for chaining:

```typescript
export class NotFoundError extends Error {
  constructor(message = "Resource not found", options?: ErrorOptions) {
    super(message, options);
  }
}
// also: InputParseError, UnauthenticatedError, UnauthorizedError, DatabaseOperationError
```

An app may add errors that carry a `reason` for the action to turn into a message: recipes has `RecipeReadError` (reading a recipe with AI failed) and `PageFetchError` (a recipe's page couldn't be fetched), each mapped in `toActionError` (§3.5).

`ITransaction` lives here too (`transaction.model.ts`) — a minimal domain abstraction (`rollback()`) that knows nothing about Drizzle.

### 3.2 Application (`src/application/`)

**Repository interfaces** define data-access contracts; infrastructure implements them. Methods a use case may call inside a transaction take an optional `tx?: ITransaction`.

```typescript
// src/application/repositories/recipes.repository.interface.ts
export interface IRecipesRepository {
  create(record: CreateRecipeRecord, spaceId: string, userId: string, tx?: ITransaction): Promise<RecipeWithIngredients>;
  getById(id: string, tx?: ITransaction): Promise<RecipeWithIngredients | undefined>;
  // ...
}
```

**Service interfaces** define cross-cutting contracts. Keep them minimal:

```typescript
// authentication.service.interface.ts
export interface IAuthenticationService {
  getSession(): Promise<Session | null>; // Session wraps a User; read userId via session.user.id
}

// logger.service.interface.ts
export interface ILoggerService {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
  child(context: Record<string, unknown>): ILoggerService;
}

// transaction-manager.service.interface.ts
export interface ITransactionManagerService {
  startTransaction<T>(callback: (tx: ITransaction) => Promise<T>): Promise<T>;
}
```

**Use cases** are curried function factories: the outer function takes dependencies (injected), the inner function is the executable use case. Business rules and authorization live here: a use case gets already-parsed input and a known `userId`, checks access, and throws `NotFoundError` / `UnauthorizedError`. A use case that writes runs its access check and its writes in one transaction, as below, so the check and the write see the same state. (hectors-recipes still has single-write use cases, such as `add-grocery-item`, that check and write outside one; moving them in is its ux-plan task L6.) Each scopes a child logger.

```typescript
// src/application/use-cases/recipes/create-recipe.use-case.ts (trimmed)
export type ICreateRecipeUseCase = ReturnType<typeof createRecipeUseCase>;

export const createRecipeUseCase = (
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  transactionManagerService: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "createRecipe" });

  return async (input: CreateRecipeInput, spaceId: string, userId: string): Promise<RecipeWithIngredients> =>
    transactionManagerService.startTransaction(async (tx) => {
      // Throws NotFoundError (no such recipe book) or UnauthorizedError (not an editor).
      await requireSpaceRole(spacesRepository, { spaceId, userId, type: "recipe-book", minRole: "editor" }, tx);
      logger.info("Creating recipe", { spaceId, userId, title: input.title });
      const { steps, ...fields } = input;
      return recipesRepository.create(
        { ...fields, ingredients: toLineWrites(fields.ingredients), steps: (steps ?? []).map(toStepWrite) },
        spaceId,
        userId,
        tx,
      );
    });
};
```

`ReturnType<typeof factory>` derives the interface — no separate interface declaration needed. A check several use cases share is a plain function beside them, without the `.use-case` suffix (`use-cases/spaces/require-space-role.ts`).

### 3.3 Interface adapters (`src/interface-adapters/`)

**Controllers** sit between the framework and use cases. They take `input: unknown`, authenticate (throw `UnauthenticatedError` when there's no `userId`), parse the input with Zod `safeParse` (throw `InputParseError` with the Zod error as `cause`, which the action turns into field messages), and delegate. Same curried-factory + child-logger pattern.

```typescript
// src/interface-adapters/controllers/recipes/create-recipe.controller.ts (trimmed)
const inputSchema = z.object({ spaceId: z.uuid(), data: createRecipeSchema });

export type ICreateRecipeController = ReturnType<typeof createRecipeController>;

export const createRecipeController = (createRecipeUseCase: ICreateRecipeUseCase, loggerService: ILoggerService) => {
  const logger = loggerService.child({ layer: "controller", op: "createRecipe" });

  return async (input: unknown, userId: string | undefined): Promise<RecipeWithIngredients> => {
    if (!userId) throw new UnauthenticatedError("Must be logged in to create recipes");

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      logger.warn("Create recipe input validation failed", { errors: parseError.issues.length });
      throw new InputParseError("Invalid recipe data", { cause: parseError });
    }

    return createRecipeUseCase(data.data, data.spaceId, userId);
  };
};
```

**Presenters** (functions co-located with a controller that map domain objects to a response shape) are an optional upstream pattern. Use them only when the response shape genuinely differs from the entity — most controllers here return the entity directly. Don't add them speculatively.

### 3.4 Infrastructure (`src/infrastructure/`)

Concrete implementations of application interfaces. Framework/vendor code (Drizzle, Neon Auth) lives here.

Repositories extend **`BaseRepository`**, which centralizes transaction-aware DB resolution, consistent error handling, and a pre-scoped logger:

```typescript
// src/infrastructure/repositories/base.repository.ts
export abstract class BaseRepository {
  protected readonly logger: ILoggerService;
  constructor(logger: ILoggerService, layer: string) {
    this.logger = logger.child({ layer: "repository", op: layer });
  }
  protected getDbContext(tx?: ITransaction) {
    return tx ? unwrapDrizzleTx(tx) : db;
  }
  protected handleError(error: unknown, method: string, context?: Record<string, unknown>): never {
    if (error instanceof DatabaseOperationError) { this.logger.error(`${method}: ${error.message}`, context); throw error; }
    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${method}: ${message}`, context);
    throw new DatabaseOperationError(`${method} failed`, { cause: error });
  }
}

export class StashItemsRepository extends BaseRepository implements IStashItemsRepository {
  constructor(logger: ILoggerService) { super(logger, "stash-items"); }

  async create(item: StashItemInsert, position: number, tx?: ITransaction): Promise<StashItem> {
    const executor = this.getDbContext(tx);
    try {
      const [created] = await executor.insert(stashItems).values({ ...item, position }).returning();
      if (!created) throw new DatabaseOperationError("Failed to create stash item");
      return created;
    } catch (err) {
      this.handleError(err, "create", { userId: item.userId });
    }
  }
}
```

Every interface has a **mock** implementation (`*.repository.mock.ts`, `mock-*.service.ts`), bound in place of the real one when `NODE_ENV === "test"` (see §4 and §6). Recipes' use-case tests run against both the mock and the real repository, so a mock must behave like the SQL. Edge-safe services (e.g. `ConsoleLoggerService`) avoid Node-only APIs.

### 3.5 App layer (`app/`, `proxy.ts`)

**Server actions** are split per domain in `app/actions/<domain>.ts` (`"use server"` files). Each resolves the user with `getCurrentUserId()` (`app/_lib/current-user.ts`, which reads the session through `IAuthenticationService`), reads form fields with `text(formData, key)` (trimmed; blank or missing is `undefined`), calls a controller through `getInjection`, and on failure returns `toActionError(err, logger, fallback)`. After a successful mutation it calls `revalidatePath`, then `redirect`s when the form should land on another page.

```typescript
// app/actions/recipes.ts (trimmed)
"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/app/_lib/current-user";
import { type ActionState, actionLogger, text, toActionError } from "@/app/actions/shared";
import { getInjection } from "@/di/container";

export async function createRecipe(_previousState: ActionState, formData: FormData): Promise<ActionState> {
  const logger = actionLogger("createRecipe");

  let recipeId: string;
  try {
    const userId = await getCurrentUserId();
    const recipe = await getInjection("ICreateRecipeController")(
      { spaceId: text(formData, "spaceId"), data: recipeFields(formData) },
      userId,
    );
    recipeId = recipe.id;
  } catch (err) {
    return toActionError(err, logger, "Couldn't save the recipe. Try again.");
  }

  revalidatePath("/");
  redirect(`/recipes/${recipeId}`);
}
```

`redirect` stays outside the `try`: it works by throwing, so a `catch` would treat it as a failure (Next.js's `redirect` docs say the same). The `(previousState, formData)` signature pairs with React 19 `useActionState` for forms that need feedback.

`app/actions/shared.ts` holds what every action file uses, and isn't a `"use server"` module, so none of it is callable from the client:
- `ActionState`: `{ error?: string; message?: string; fields?: Partial<Record<string, string>> } | null`. `fields` holds a message per form field, for forms that show them under each field.
- `actionLogger(op)`: the DI logger's child with `{ layer: "action", op }`.
- `text(formData, key)`, above.
- `toActionError(err, logger, fallback)`: `InputParseError` becomes the first issue's message (prefixed with its field's label) plus `fields`; `UnauthenticatedError` becomes "Your session expired. Sign in again."; `UnauthorizedError` and `NotFoundError` pass their message through; `RecipeReadError` and `PageFetchError` map their `reason` to a message. Each of those is logged at `warn`. Anything else is logged at `error` and returns `fallback`.

**Pages** (`page.tsx`) are server components: they resolve the user with `getCurrentUserId()`, call controllers through `getInjection`, and pass plain data to client components. They don't wrap every call: an unexpected error reaches `app/error.tsx`. A lookup that can miss goes through a loader, either a function in the page or, when pages share it, a file in `app/_lib/` (`load-recipe.ts`): it turns `NotFoundError` and `InputParseError` (a malformed id) into `notFound()`, and logs and rethrows anything else.

**`proxy.ts`** (Next.js 16, replaces `middleware.ts`) makes an optimistic check only: it reads the session cookie and redirects to sign-in without it (recipes sends signed-out visitors to `/welcome`). It doesn't use the auth SDK's middleware and doesn't log. One exception to its cookie-only rule: when Neon's session-cache cookie is missing, it refreshes it through the app's own `/api/auth/get-session` route, because pages can't write cookies ([proxy-auth-research.md](proxy-auth-research.md), 2026-09 addendum). The real auth checks are in pages, actions and route handlers, through `IAuthenticationService` and the controllers.

---

## 4. Dependency injection (`di/`)

We use [`@evyweb/ioctopus`](https://github.com/Evyweb/ioctopus) — a decorator-free, serverless-friendly IoC container.

**`di/types.ts`** — every dependency gets a `Symbol`, with a parallel `DI_RETURN_TYPES` map for type-safe resolution:

```typescript
export const DI_SYMBOLS = {
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  ILoggerService: Symbol.for("ILoggerService"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),
  IStashItemsRepository: Symbol.for("IStashItemsRepository"),
  IAddItemUseCase: Symbol.for("IAddItemUseCase"),
  IAddItemController: Symbol.for("IAddItemController"),
  // ...
};
export interface DI_RETURN_TYPES {
  IAuthenticationService: IAuthenticationService;
  // ... one entry per symbol
}
```

**`di/container.ts`** — loads modules in dependency order and exposes a type-safe `getInjection`:

```typescript
const ApplicationContainer = createContainer();
ApplicationContainer.load(Symbol("LoggerModule"), createLoggerModule());
ApplicationContainer.load(Symbol("AuthenticationModule"), createAuthenticationModule());
ApplicationContainer.load(Symbol("TransactionModule"), createTransactionModule());
ApplicationContainer.load(Symbol("StashItemsModule"), createStashItemsModule());

export function getInjection<K extends keyof typeof DI_SYMBOLS>(symbol: K): DI_RETURN_TYPES[K] {
  return ApplicationContainer.get(DI_SYMBOLS[symbol]);
}
```

**`di/modules/*.module.ts`** — one per domain. `toClass` for classes (repositories/services), `toHigherOrderFunction` for curried factories (use cases/controllers). Mocks are swapped in when `NODE_ENV === "test"`:

```typescript
export function createStashItemsModule() {
  const m = createModule();

  if (process.env.NODE_ENV === "test") {
    m.bind(DI_SYMBOLS.IStashItemsRepository).toClass(MockStashItemsRepository);
  } else {
    m.bind(DI_SYMBOLS.IStashItemsRepository).toClass(StashItemsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  m.bind(DI_SYMBOLS.IAddItemUseCase)
    .toHigherOrderFunction(addItemUseCase, [DI_SYMBOLS.IStashItemsRepository, DI_SYMBOLS.ILoggerService]);
  m.bind(DI_SYMBOLS.IAddItemController)
    .toHigherOrderFunction(addItemController, [DI_SYMBOLS.IAddItemUseCase, DI_SYMBOLS.ILoggerService]);

  return m;
}
```

---

## 5. Layer & import rules

| Layer | May import from |
|---|---|
| **Entities** | Entities only (+ `zod`) |
| **Repository / Service interfaces** | Entities |
| **Use cases** | Entities, repository + service interfaces |
| **Controllers** | Entities, interfaces, use cases |
| **Infrastructure** | Entities, interfaces (+ `db/`, `lib/`, vendor SDKs) |
| **App (`app/`)** | Entities (models, pure functions, errors), `di` (`getInjection`), other `app/` files; root `lib/` only in the auth route handler and auth page (`lib/auth/server.ts`, `lib/logger.ts`) |
| **DI (`di/`)** | Everything — it is the composition root |

**Enforcement is by convention**, not tooling — there is no ESLint boundaries plugin and Biome is not configured with layer rules. Agents and reviewers uphold these boundaries. The clearest tells of a violation:

- `app/` importing from `src/infrastructure/` or `src/application/` directly (must go through `di`).
- A use case or controller importing a concrete repository/service instead of its interface.
- Anything in `src/entities/` importing from another layer.

Infrastructure-to-infrastructure imports are acceptable for shared utilities (e.g. `unwrapDrizzleTx`).

---

## 6. Testing

Recipes is the model; its [AGENTS.md](../apps/hectors-recipes/AGENTS.md#testing) has the details.

- **Runner:** Bun test. Test files are `*.test.ts` under `tests/`, mirroring the source tree (`src/entities/scaling.ts` → `tests/src/entities/scaling.test.ts`). Run them from the app (`cd apps/<app> && bun test tests/path/to/file.test.ts`, or `bun run test --filter=<app>`), so its `bunfig.toml` preload applies.
- **The preload** (`tests/_support/preload.ts`) deletes the credentials Bun loads from `.env`, so no test can reach a real service, swaps `@/db` for PGlite (an in-memory Postgres with the real migrations applied), and stubs `next/cache`, `next/navigation` and `getCurrentUserId`.
- **Use cases:** `describeEachBackend(...)` with `makeApp()` (`tests/_support/app.ts`), which wires every use case to one set of repositories with fixtures. Each test runs twice, on the mock repositories and on the real ones over PGlite, so a mock that drifts from the SQL fails.
- **Controllers:** `controllerBasics()` (`tests/_support/controller.ts`) covers signed-out rejection, bad input rejected before the use case, and parsed input passed on.
- **Actions, page helpers and route handlers** run through the real DI container (`getInjection`), which binds the mocks when `NODE_ENV === "test"`. Those mocks live for the whole run, so call `signInAsNewUser()` in `beforeEach` to start each test with empty data. Use cases and controllers are tested directly, not through the container.

---

## 7. Database

- **Neon Postgres** via `@neondatabase/serverless` (WebSocket **Pool** driver) + **Drizzle ORM** (`drizzle-orm/neon-serverless`). The Pool/WebSocket driver is required for transaction support (the HTTP driver does not support transactions).
- Schema in `db/schema.ts`; connection in `db/index.ts`.
- **Changing the schema (recipes):** edit `db/schema.ts`, run `bun run --filter=<app> db:generate`, review the generated SQL in `db/migrations/`, then apply it with `bun run --filter=<app> db:migrate` only with Hector's OK at that moment: the app's `.env` points at a real database. Dropping a column takes two deploys (see [apps/hectors-recipes/AGENTS.md](../apps/hectors-recipes/AGENTS.md#testing)).
- **Stash** has no migrations yet: it syncs the schema with `bun run --filter=stash db:push`, which writes to its database too, so the same OK applies.
- `--filter` goes before an app-only script name (`db:*`): `bun run db:generate --filter=<app>` looks for a root script of that name and stops with "Script not found". `db:studio` opens Drizzle Studio.

### Transactions

- `ITransactionManagerService.startTransaction(callback)` — callback-based; commits when the callback resolves and rolls back when it throws (safer than imperative begin/commit). There's no nesting: a use case runs its writes in one transaction and passes its `tx` to each repository call.
- Drizzle types are hidden behind an opaque branded `DrizzleTransactionWrapper`; `BaseRepository.getDbContext(tx)` unwraps it via `unwrapDrizzleTx` (branded check, not duck-typing).
- Timeout: each transaction starts with `set local statement_timeout` (15 s), so Postgres cancels a stuck statement and the transaction rolls back. Never race the transaction against a JS timer: that reports failure while the work carries on and can still commit.
- Errors: domain errors thrown inside the callback (`NotFoundError`, `UnauthorizedError`, `InputParseError`, …; recipes lists them in `DOMAIN_ERRORS`) reach the caller unchanged, so a denial isn't reported as a database failure. Only driver errors become `DatabaseOperationError("Transaction failed")`. `TransactionRollbackError` is logged at `warn`, and a double-completion guard protects `rollback()`.

---

## 8. Logging & entry points

All infrastructure and application code logs through `ILoggerService` (never `console.*`). Each layer creates a child logger with `{ layer, op }`:

- **Repositories:** scoped by `BaseRepository` via `super(logger, "domain")`.
- **Use cases / controllers:** `loggerService.child({ layer: "use-case" | "controller", op: "fnName" })`.
- **Server actions / pages:** `getInjection("ILoggerService").child({ layer: "action" | "page", op })` (in actions, recipes' `actionLogger(op)` does this).
- **Route handlers that go through a controller** (recipes' `app/(api)/api/realtime/token/route.ts`): `getInjection("ILoggerService").child({ layer: "route", op })`, like actions.
- **The auth route handler**, which wraps `lib/auth/server.ts` rather than a controller: `import { logger } from "@/lib/logger"`, a standalone `ConsoleLoggerService`, then `.child({ layer: "route", op: "auth" })`.
- **`proxy.ts`** doesn't log: it only reads cookies and, at most, calls the app's own auth route (§3.5).

Standard `layer` values: `action`, `use-case`, `controller`, `repository`, `service`, `route`, `page`. Output format: `[LEVEL] [layer/op] message { context }`. `LOG_LEVEL` controls the minimum (defaults: `debug` dev, `warn` prod, `error` test).

**Every entry point must log unexpected errors.** Server actions (through `toActionError`) and route handlers catch, log and answer; page loaders log and rethrow, and an error a page doesn't catch reaches `app/error.tsx` — silent failures are unacceptable.

---

## 9. Adding a feature (order)

Build inward-out so types flow from the domain:

1. Zod model → `src/entities/models/<name>.model.ts`
2. Repository interface → `src/application/repositories/`
3. Repository impl + its mock (`*.repository.mock.ts`; recipes' use-case tests run on both) → `src/infrastructure/repositories/` (extend `BaseRepository`)
4. Use case → `src/application/use-cases/<domain>/`
5. Controller → `src/interface-adapters/controllers/<domain>/`
6. DI symbol + binding → `di/types.ts` + `di/modules/<domain>.module.ts`
7. Server action → `app/actions/<domain>.ts` (helpers in `app/actions/shared.ts`)
8. UI → `app/_components/`

Each new file with logic gets its test under `tests/` (§6). Keep ownership/authorization checks in use cases, every write with its check in one transaction, and run `bun check --filter=<app> && bun ts --filter=<app>` (plus the app's tests) before finishing.
