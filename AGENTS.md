# AGENTS.md

## Important
- This file is the **canonical agent context** for the monorepo (read by Claude Code, Cursor, Codex, etc.). `.cursor/rules` only holds Cursor-specific or on-demand reference material — don&apos;t duplicate this file there.
- MUST fully read this file before writing ANY code
- Each app in `apps/` has its own `AGENTS.md` with app-specific context — read it too. Scope work to the relevant app directory.
- When unsure about pattern complexity, check **Pattern Complexity** section below
- Simplicity wins: YAGNI, KISS, Rule of Three

## Communication
- No sycophancy — skip praise, get to the point
- High-level overviews; assume competence with the stack
- Always show proper error handling at boundaries
- Minimal comments — explain non-obvious intent only, never narrate the code

## Maintaining Agent Context (every task)
Context is part of the deliverable — keep it lean, layered, and current. See [docs/development/agent-context-playbook.md](docs/development/agent-context-playbook.md).
- Read the relevant `AGENTS.md` (root + app + `packages/ui`) before editing; scope work to that app.
- When you learn something durable (new pattern, structure, or gotcha), write it back into the nearest `AGENTS.md` in the same change.
- Fix or remove any stale reference you touch — stale context misleads more than missing context.
- Commit `AGENTS.md` / `.cursor/` / `docs/` updates alongside the code they describe.
- Big reference material → a kebab-case doc under `docs/` (global) or `apps/<app>/docs/` (app-specific), linked from `AGENTS.md` — don&apos;t inline it here.

## Do
- use `bun` for everything (never npm/yarn)
- use `@repo/ui` components before creating new ones
- use kebab-case for all file and folder names
- use named exports over default exports
- use async/await over `.then()` chains
- use Server Components first, add `"use client"` only when necessary
- use `&apos;` for apostrophes in JSX text
- use strict TypeScript mode always
- use union types over enums
- use type inference where obvious, explicit return types for exported functions
- inject interfaces, never concrete implementations (complex apps only)
- keep diffs small and focused

## Don&apos;t
- don&apos;t use `any` — find the correct type, use `unknown` with type guards if truly needed
- don&apos;t use `_unused` variables — fix the root cause
- don&apos;t use ESLint or Prettier — Biome handles linting and formatting, Oxlint only runs the shadcn design-system rules (see **Design-System Lint**)
- don&apos;t use barrel files (index files solely for re-exporting)
- don&apos;t use class components — functional only
- don&apos;t abstract until 3 duplications exist
- don&apos;t add single-implementation interfaces
- don&apos;t add comments everywhere — only explain non-obvious essential logic
- don&apos;t add features beyond what&apos;s asked

## Never
- loosen a check to make it pass: no disabling or downgrading lint rules (Biome, Oxlint), no relaxing `tsconfig` flags, no `biome-ignore` / `@ts-ignore` / `@ts-expect-error`, no skipping or weakening tests, and no per-folder overrides that do the same. Fix the code. If a rule genuinely blocks (e.g. unmodified third-party code can't satisfy it), stop and raise it with the options instead of changing the rule
- push to main directly
- commit .env, secrets, or credentials
- commit personal information or personal docs: the repo is public. They go in the gitignored root `docs/private/` folder (see [docs/public-repo.md](docs/public-repo.md)). Commit messages, PR titles and descriptions, and review comments are public too: nothing from `docs/private/` in them either
- skip `bun check && bun ts` before finishing
- run `npm` or `yarn`
- use `git stash` or switch branches without asking
- make speculative changes without confirming the approach

## Commands
```bash
bun install                          # install dependencies
bun check                            # lint (biome + shadcn design rules)
bun ts                               # typecheck
bun run test                         # all app tests (turbo)
bun test path/to/file.test.ts        # single test
bun run dev --filter=app-name        # dev server for specific app
bun run build --filter=app-name      # build specific app
turbo run build                      # build all apps
```

## After Changes
Scope checks to the app you touched (faster, less noise) before finishing any task:
```bash
bun check --filter=<app-name> && bun ts --filter=<app-name>
```
Use the unscoped `bun check && bun ts` only when changes span multiple apps or shared packages.
If you touched tests, also run `bun test path/to/affected.test.ts`.

CI (`.github/workflows/ci.yml`) runs lint, typecheck and tests for every package a PR affects, using Turbo's `--filter='...[origin/main]'`. Lint fails if `biome check --write` would change a file, so run `bun check` before pushing. Builds are left to Vercel's per-PR deploys. An app with tests needs a `test` script in its `package.json` for Turbo to pick it up.

## Biome
- `@repo/biome-config` runs Biome's full recommended set. The one rule off is `useLiteralKeys`: the portfolio typechecks with `noPropertyAccessFromIndexSignature`, which requires `process.env["X"]`, the opposite of what the rule asks.
- The root `biome.json` exempts two things that can't satisfy specific rules, each listed by rule: shadcn registry source in `packages/ui/src/components/` (not the hand-written `file-drop-zone` and `theme-provider`), which an update would overwrite, and `next/og` image files (`apps/hectors-recipes/app/_lib/app-icon.tsx`), which can only draw a plain `<img>`.
- Remote images go through `next/image` with `unoptimized` when they can come from any site (recipe photos): it serves them as they are, needs no `remotePatterns`, and uses no image-optimization quota.

## Design-System Lint
`@shadcn/lint` runs on [Oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) to check how apps consume `@repo/ui`. Biome still owns everything else; Oxlint&apos;s own rule categories are off, so the two never report the same thing.
- Config: root `.oxlintrc.json`. Every rule is listed there on purpose — relax from the full set, don&apos;t add rules back one at a time.
- Each app&apos;s `lint` script is `biome check --write && oxlint .`, so Turbo filtering and CI cover it. Oxlint finds the root config from any app directory.
- Rules: `no-restyle` (restyling `@repo/ui` components through `className`), `no-raw-colors`, `no-unknown-classes`, `require-static-classes`, `no-inline-styles`, `no-arbitrary-values`.
- Rules are `warn` by default, so lint stays green. Promote an app's rules to `error` once its count is zero, in an `overrides` entry that keeps each rule's options (`no-restyle` keeps `allow: ["layout"]`). Every app is there (2026-10-01): design lint fails the build in all five.
- Deliberate relaxations, both in `overrides`: all rules off for `packages/ui/src/components/**` (shadcn registry source; the two hand-written files there, `file-drop-zone` and `theme-provider`, pass the rules without it), and `no-arbitrary-values` off for `hector-portfolio` (its custom type scale; that override comes after the apps' `error` one, so it still wins). Tests are in `ignorePatterns` — `cn()` tests use fake class names.
- Prefer the fix the error suggests (a variant or size prop, a theme token). For a real exception: `// oxlint-disable-next-line shadcn/<rule> -- reason`.
- Loosening a rule for a component is a design-system decision: use `contracts` in `.oxlintrc.json` rather than scattering disable comments.

## Commits, branches and pull requests
When asked to commit:
- format: `type(scope): description`
- types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- keep commits atomic and focused: one per task, so `git log --grep` finds it
- commit by path (`git commit -m "…" -- <paths>`), never `git add -A` or `git commit -a`: Hector stages his own work in the same checkout
- refer to issues and PRs as `hectarek/hector-mono#123`, never a bare `#123`: numbering restarted on 2026-10-01, and older docs' numbers mean the earlier private repo ([docs/public-repo.md](docs/public-repo.md#history))

Branches and PRs:
- branch from `main` as `type/short-topic` (e.g. `feat/recipes-ux-p9-itemized`, `docs/public-repo-followups`)
- one PR per topic or plan phase, titled in the commit format, its description following `.github/pull_request_template.md`
- agents open PRs; Hector merges. PRs merge with a merge commit (squash and rebase are off), which keeps each task's commit, and the branch is deleted on merge

## Before Finishing
Ask yourself: can this be simpler? If you can simplify the code without changing behavior, do it.

## Monorepo Structure
```
apps/
  hector-portfolio/    # Static portfolio site (Next.js, no backend)
  relationship-meter/  # Client-side relationship tracker (Next.js, no backend)
  hectors-recipes/     # Recipes app (Next.js + Neon + Drizzle + auth) — clean arch, kept simple
  stash/               # Stash/bookmark app (Next.js + Neon + Drizzle + auth) — full clean arch
  hectors-tools/       # AI/web tools catalog (Next.js + AI SDK) — clean arch + DI, no DB or auth yet

packages/
  ui/                  # Shared UI components (shadcn/ui based) — see packages/ui/AGENTS.md
  biome-config/        # Shared Biome config
  typescript-config/   # Shared TS configs
```

## Pattern Complexity (Match to App)

Choose the simplest pattern that solves the problem.

**Simple apps (portfolio, relationship-meter)**:
- Direct data imports or client state
- No DI containers, no domain error classes
- Server Components for static data

**Complex apps (stash, hectors-recipes, future apps with backend/auth/database)**:
- Typed domain errors, caught at the server-action boundary (see **Error Handling**)
- DI containers for dependency injection (`@evyweb/ioctopus`)
- Repository/Use Case/Controller layers
- Server actions for mutations
- Clean architecture boundaries
- `hectors-recipes` keeps the clean-arch structure but favors the simplest implementation per feature

## Shared Packages
- **`@repo/ui`**: shadcn/ui components — always check here before creating new components
- **`@repo/biome-config`**: Extends root biome.json
- **`@repo/typescript-config`**: Base tsconfig presets

## React & Next.js Patterns
- Next.js 16+, React 19
- Server Components by default
- Colocate components near their routes (`app/_components/`)
- Providers live in `app/_providers/`

## Data Flow (Complex Apps)
```
Page (Server) → Server Action → Controller → Use Case → Repository
      ↓
Client Components (receive data via props)
```

## Error Handling (complex apps only)
Both `stash` and `hectors-recipes` throw typed errors below the server action and catch them in it. Neither uses a `Result<T>` return type.
- Errors are the classes in `src/entities/errors/common.ts`: `InputParseError`, `UnauthenticatedError`, `UnauthorizedError`, `NotFoundError`, `DatabaseOperationError`.
- Controllers throw `UnauthenticatedError` / `InputParseError` (Zod error as `cause`); use cases throw `NotFoundError` / `UnauthorizedError`; repositories wrap driver errors as `DatabaseOperationError` via `BaseRepository.handleError`.
- Server actions catch, log, and turn the error into state the UI shows (e.g. `{ error: string }`). Only unexpected errors fall back to a generic message.
```typescript
try {
  await getInjection("ICreateThingController")(input, userId);
} catch (err) {
  // hectors-recipes centralizes this mapping in app/actions/shared.ts (follow that); stash inlines it per action.
  return toActionError(err, logger, "Couldn't save it.");
}
```
- A transaction manager that wraps errors must rethrow domain errors unchanged, or a denial inside a transaction surfaces as "Transaction failed".

Full pattern: [docs/clean-architecture.md §3.5](docs/clean-architecture.md#35-app-layer-app-proxyts).

## Layer Rules (complex apps only)
Full reference: [docs/clean-architecture.md](docs/clean-architecture.md). `hectors-recipes` is the reference implementation; `stash` was the first example of the pattern and isn't authoritative where they differ.
- **Entities** (`src/entities/`) → pure domain logic (Zod schemas), no dependencies
- **Application** (`src/application/`) → use cases + interfaces, imports only entities
- **Interface Adapters** (`src/interface-adapters/`) → controllers/DTOs, imports application + entities
- **Infrastructure** (`src/infrastructure/`) → implements interfaces, can import anything except app/
- **DI** (`di/`) → wires everything together

## Feature Implementation Order (complex apps)
1. Zod schema → `src/entities/models/`
2. Repo interface → `src/application/repositories/`
3. Repo impl → `src/infrastructure/repositories/`
4. Use case → `src/application/use-cases/`
5. Controller → `src/interface-adapters/controllers/`
6. DI module → `di/modules/`
7. Server action → `app/actions.ts`
8. UI → `app/_components/`

## Hook Placement (complex apps with client state)
- **Container components** (`*-container.tsx`): Call domain hooks, orchestrate logic
- **Leaf components**: Receive plain functions as props, only use local state hooks

## Task Approach
- **Bug fixes**: Minimize blast radius, reproduce first, don&apos;t refactor unrelated code
- **New features**: Follow feature implementation order, start with Zod schema
- **Refactors**: Preserve existing behavior, run checks frequently

## When Stuck
- Ask a clarifying question
- Propose a plan
- Don&apos;t push speculative changes

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
