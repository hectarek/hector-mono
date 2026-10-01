# Clean Architecture Guide

The single canonical reference for the **complex apps** in this monorepo (`stash`, `hectors-recipes`, and future apps with a backend/auth/database). Simple apps (`hector-portfolio`, `relationship-meter`) deliberately skip all of this — see their `AGENTS.md`.

`hectors-recipes` is the reference implementation; when in doubt, read `apps/hectors-recipes/` and its `AGENTS.md`. The code samples below come from `stash`, the first app built on the pattern; they still show the patterns, but stash isn't authoritative, so where recipes does something differently (e.g. one `toActionError` in `app/actions/shared.ts` instead of per-action catch blocks), follow recipes.

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
  actions/                    #   Server actions, split per domain (stash-items.ts)
  api/auth/[...path]/         #   Auth route handler (framework plumbing → SDK)
  page.tsx                    #   Server component pages
proxy.ts                      # Route protection (Next.js 16, replaces middleware.ts)

src/
  entities/                   # Innermost — pure domain
    models/*.model.ts         #   Zod schemas + inferred types
    errors/common.ts          #   Domain error classes
  application/                # Use cases + interfaces (the "what")
    repositories/*.repository.interface.ts
    services/*.service.interface.ts
    use-cases/<domain>/*.use-case.ts
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
  logger.ts                   # Standalone logger for edge/root code
```

**Why `db/` and `lib/` sit outside `src/`:** they are shared initialization consumed by multiple layers (infrastructure wraps them; the framework delegates to them), like `drizzle.config.ts`. They contain no business logic.

**Imports** use the `@/*` alias (mapped to `./*`), so layer paths read as `@/src/entities/models/...`, `@/di/container`, `@/db`, `@/lib/logger`.

---

## 3. Layers in detail

### 3.1 Entities (`src/entities/`)

Pure domain types and errors. Only dependency allowed: `zod`.

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

`ITransaction` lives here too (`transaction.model.ts`) — a minimal domain abstraction (`rollback()`) that knows nothing about Drizzle.

### 3.2 Application (`src/application/`)

**Repository interfaces** define data-access contracts; infrastructure implements them. Mutation methods take an optional `tx?: ITransaction`.

```typescript
// src/application/repositories/stash-items.repository.interface.ts
export interface IStashItemsRepository {
  getMaxPosition(userId: string): Promise<number>;
  create(item: StashItemInsert, position: number, tx?: ITransaction): Promise<StashItem>;
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
  startTransaction<T>(clb: (tx: ITransaction) => Promise<T>, parent?: ITransaction): Promise<T>;
}
```

**Use cases** are curried function factories: the outer function takes dependencies (injected), the inner function is the executable use case. Business rules and authorization live here. Each scopes a child logger.

```typescript
// src/application/use-cases/stash-items/add-item.use-case.ts
export type IAddItemUseCase = ReturnType<typeof addItemUseCase>;

export const addItemUseCase = (
  stashItemsRepository: IStashItemsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addItem" });

  return async (input: { url: string; title: string /* ... */ }, userId: string): Promise<StashItem> => {
    if (!input.url || !input.title) throw new InputParseError("URL and title are required");
    logger.info("Adding stash item", { userId, url: input.url });

    const maxPosition = await stashItemsRepository.getMaxPosition(userId);
    return stashItemsRepository.create({ userId, ...input }, maxPosition + 1);
  };
};
```

`ReturnType<typeof factory>` derives the interface — no separate interface declaration needed.

### 3.3 Interface adapters (`src/interface-adapters/`)

**Controllers** sit between the framework and use cases. They authenticate (reject when no `userId`), validate input with Zod `safeParse`, and delegate. Same curried-factory + child-logger pattern.

```typescript
// src/interface-adapters/controllers/stash-items/add-item.controller.ts
const inputSchema = z.object({ url: z.url(), title: z.string().min(1) /* ... */ });

export type IAddItemController = ReturnType<typeof addItemController>;

export const addItemController = (addItemUseCase: IAddItemUseCase, loggerService: ILoggerService) => {
  const logger = loggerService.child({ layer: "controller", op: "addItem" });

  return async (input: Partial<z.infer<typeof inputSchema>>, userId: string | undefined): Promise<StashItem> => {
    if (!userId) throw new UnauthenticatedError("Must be logged in to add items");

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) throw new InputParseError("Invalid input", { cause: parseError });

    return addItemUseCase(data, userId);
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

Every interface has a **mock** implementation (`*.repository.mock.ts`, `mock-*.service.ts`) used automatically in tests (see §6). Edge-safe services (e.g. `ConsoleLoggerService`) avoid Node-only APIs.

### 3.5 App layer (`app/`, `proxy.ts`)

**Server actions** are split per domain in `app/actions/`. They get dependencies via `getInjection`, resolve `userId` through `IAuthenticationService.getSession()`, catch domain errors → user-facing results, log at every branch, and `revalidatePath` after mutations.

```typescript
// app/actions/stash-items.ts
"use server";
import { revalidatePath } from "next/cache";
import { getInjection } from "@/di/container";
import { InputParseError, UnauthenticatedError } from "@/src/entities/errors/common";

async function getUserId(): Promise<string | undefined> {
  const session = await getInjection("IAuthenticationService").getSession();
  return session?.user.id;
}

export async function addItem(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const logger = getInjection("ILoggerService").child({ layer: "action", op: "addItem" });
  try {
    const userId = await getUserId();
    const controller = getInjection("IAddItemController");
    await controller({ url: formData.get("url") as string, title: formData.get("title") as string }, userId);
  } catch (err) {
    if (err instanceof InputParseError) return { error: err.message };
    if (err instanceof UnauthenticatedError) return { error: "Must be logged in to add items" };
    logger.error("Unexpected failure", { error: String(err) });
    return { error: "Failed to add item. Please try again." };
  }
  revalidatePath("/");
  return { success: true };
}
```

The `(prevState, formData)` signature pairs with React 19 `useActionState` for forms that need feedback. Shared helpers (e.g. `getUserId`) go in `app/actions/shared.ts`.

**Pages** (`page.tsx`) are server components that resolve controllers via `getInjection` and pass plain data to client components. Wrap data fetching in try/catch with a logged fallback.

**`proxy.ts`** (Next.js 16, replaces `middleware.ts`) handles route protection by delegating to the auth SDK middleware, wrapped with error logging via `lib/logger.ts`. Pages must not duplicate redirect guards.

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
| **App (`app/`)** | Entities (errors), `di` (`getInjection`), other `app/` files |
| **DI (`di/`)** | Everything — it is the composition root |

**Enforcement is by convention**, not tooling — there is no ESLint boundaries plugin and Biome is not configured with layer rules. Agents and reviewers uphold these boundaries. The clearest tells of a violation:

- `app/` importing from `src/infrastructure/` or `src/application/` directly (must go through `di`).
- A use case or controller importing a concrete repository/service instead of its interface.
- Anything in `src/entities/` importing from another layer.

Infrastructure-to-infrastructure imports are acceptable for shared utilities (e.g. `unwrapDrizzleTx`).

---

## 6. Testing

- **Runner:** Bun test (`bun test path/to/file.spec.ts`).
- **No manual mocking:** the DI container binds mock implementations automatically when `NODE_ENV === "test"`. Tests pull instances via `getInjection(...)` and exercise the full stack (mock infra → use case → controller) without a database.
- Mocks seed realistic in-memory data; keep them in sync with their real counterparts' interfaces.

---

## 7. Database

- **Neon Postgres** via `@neondatabase/serverless` (WebSocket **Pool** driver) + **Drizzle ORM** (`drizzle-orm/neon-serverless`). The Pool/WebSocket driver is required for transaction support (the HTTP driver does not support transactions).
- Schema in `db/schema.ts`; connection in `db/index.ts`.
- **Never edit the schema/relations directly to change the DB** — the user runs `db:pull` to sync. Use Drizzle Kit commands: `db:push`, `db:generate`, `db:studio` (scoped via `--filter=<app>`).

### Transactions

- `ITransactionManagerService.startTransaction(callback)` — callback-based; auto-commits on resolve (safer than imperative begin/commit).
- Drizzle types are hidden behind an opaque branded `DrizzleTransactionWrapper`; `BaseRepository.getDbContext(tx)` unwraps it via `unwrapDrizzleTx` (branded check, not duck-typing).
- Hardening: double-completion guard on `rollback()`, a 30s timeout that auto-rejects with `DatabaseOperationError`, and `TransactionRollbackError` logged at `warn` (not `error`).

---

## 8. Logging & entry points

All infrastructure and application code logs through `ILoggerService` (never `console.*`). Each layer creates a child logger with `{ layer, op }`:

- **Repositories:** scoped by `BaseRepository` via `super(logger, "domain")`.
- **Use cases / controllers:** `loggerService.child({ layer: "use-case" | "controller", op: "fnName" })`.
- **Server actions / pages:** `getInjection("ILoggerService").child({ layer: "action" | "page", op })`.
- **Edge/root code (proxy, route handlers):** `import { logger } from "@/lib/logger"` — a standalone instance, since the DI container isn't available there.

Standard `layer` values: `action`, `use-case`, `controller`, `repository`, `service`, `route`, `page`, `proxy`. Output format: `[LEVEL] [layer/op] message { context }`. `LOG_LEVEL` controls the minimum (defaults: `debug` dev, `warn` prod, `error` test).

**Every entry point must log errors.** Server actions, route handlers, pages, and the proxy all catch and log — silent failures are unacceptable.

---

## 9. Adding a feature (order)

Build inward-out so types flow from the domain:

1. Zod model → `src/entities/models/<name>.model.ts`
2. Repository interface → `src/application/repositories/`
3. Repository impl (+ mock) → `src/infrastructure/repositories/` (extend `BaseRepository`)
4. Use case → `src/application/use-cases/<domain>/`
5. Controller → `src/interface-adapters/controllers/<domain>/`
6. DI symbol + binding → `di/types.ts` + `di/modules/<domain>.module.ts`
7. Server action → `app/actions/<domain>.ts`
8. UI → `app/_components/`

Keep ownership/authorization checks in use cases (or controllers), writes transactional, and run `bun check --filter=<app> && bun ts --filter=<app>` before finishing.
