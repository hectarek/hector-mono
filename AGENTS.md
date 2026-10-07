# AGENTS.md

## Important
- This file is the **canonical agent context** for the monorepo (read by Claude Code, Cursor, Codex, etc.). Claude Code's project settings, hook and skills live in `.claude/`; don't duplicate this file anywhere.
- MUST fully read this file before writing ANY code
- Don't add a `CLAUDE.md` or `CLAUDE.local.md` anywhere in the repo: Claude Code reads `AGENTS.md` only when neither exists in the working directory or above it
- Each app in `apps/` has its own `AGENTS.md` with app-specific context — read it too. Scope work to the relevant app directory.
- When unsure about pattern complexity, check **Pattern Complexity** section below
- Simplicity wins: YAGNI, KISS, Rule of Three

## Communication
- No sycophancy — skip praise, get to the point
- High-level overviews; assume competence with the stack

## Maintaining Agent Context (every task)
Context is part of the deliverable — keep it lean, layered, and current. See [docs/development/agent-context-playbook.md](docs/development/agent-context-playbook.md).
- Read the relevant `AGENTS.md` (root + app + `packages/ui`) before editing; scope work to that app.
- When you learn something durable (new pattern, structure, or gotcha), write it back into the nearest `AGENTS.md` in the same change.
- Fix or remove any stale reference you touch — stale context misleads more than missing context.
- Commit `AGENTS.md` / `.claude/` / `docs/` updates alongside the code they describe.
- Big reference material → a kebab-case doc under `docs/` (global) or `apps/<app>/docs/` (app-specific), linked from `AGENTS.md` — don't inline it here.
- Work that spans sessions runs from a plan doc in the app's `docs/`, and that doc is the plan of record ([playbook](docs/development/agent-context-playbook.md#work-that-spans-sessions-the-plan-doc)). A task in Hector's private tracker only links to it: never copy the plan's steps into a task.

## Do
- use `bun` for everything (never npm/yarn)
- use `@repo/ui` components before creating new ones
- use kebab-case for all file and folder names. Exceptions: `AGENTS.md`, `README.md`, `SECURITY.md`, `LICENSE`, `SKILL.md` (the name Claude Code requires), `.github/pull_request_template.md`, generated Drizzle migrations (`db/migrations/`), and Next.js route syntax such as `(main)`, `[id]` and `_components`
- use named exports over default exports
- use async/await over `.then()` chains
- use Server Components first, add `"use client"` only when necessary
- use `&apos;` for apostrophes in JSX text (only there: not in Markdown, strings or comments)
- use strict TypeScript mode always
- use union types over enums
- use type inference where obvious, explicit return types for exported functions
- inject interfaces, never concrete implementations (complex apps only)
- keep diffs small and focused

## Don't
- don't use `any` — find the correct type, use `unknown` with type guards if truly needed
- don't use `_unused` variables — fix the root cause
- don't use ESLint or Prettier — Biome handles linting and formatting, Oxlint only runs the shadcn design-system and clean-architecture rules (see **Lint and Dead Code**)
- don't use barrel files (index files solely for re-exporting)
- don't use class components — functional only
- don't abstract until 3 duplications exist
- don't add single-implementation interfaces
- don't add comments everywhere — only explain non-obvious essential logic
- don't add features beyond what's asked

## Never
- loosen a check to make it pass: no disabling or downgrading lint rules (Biome, Oxlint), no relaxing `tsconfig` flags, no `biome-ignore` / `@ts-ignore` / `@ts-expect-error`, no skipping or weakening tests, and no per-folder overrides that do the same. Fix the code. If a rule genuinely blocks (e.g. unmodified third-party code can't satisfy it), stop and raise it with the options instead of changing the rule
- push to main directly
- commit .env, secrets, or credentials
- commit personal information or personal docs: the repo is public. Hector's personal docs live outside this repo, on his machine only (see [docs/public-repo.md](docs/public-repo.md)). Commit messages, PR titles and descriptions, and review comments are public too: nothing from his personal docs in them either
- open GitHub issues for follow-ups or deferred review findings: the repo is public. They go in Hector's private task tracker (Backlog.md), outside this repo
- finish without running the checks in **After Changes**
- run `npm` or `yarn`
- switch branches, stash, reset or clean in the main checkout: it's Hector's. Branch work happens in your own worktree (see **Working in parallel**)
- write to a real database (migrations, seeds with `--commit`, bulk updates) without Hector's explicit OK at that moment
- make speculative changes without confirming the approach

## Commands
```bash
bun install                          # install dependencies
bun check                            # lint (biome + oxlint design and architecture rules)
bun ts                               # typecheck
bun run test                         # all app tests (turbo)
cd apps/<app> && bun test tests/path/to/file.test.ts   # single test (from the app, so its bunfig.toml preload applies)
bun run dev --filter=app-name        # dev server for specific app (--filter after the script works only for root scripts: dev, build, test, check, ts)
bun run --filter=app-name db:studio  # an app's own script (db:*): --filter goes before the script name
bun run build --filter=app-name      # build specific app
bun run build                        # build all apps
```

## After Changes
Scope checks to the app you touched (faster, less noise) before finishing any task:
```bash
bun check --filter=<app-name> && bun ts --filter=<app-name>
```
Use the unscoped `bun check && bun ts` only when changes span multiple apps or shared packages.
Then run `bun run dead-code` (Fallow, whole repo, under a second): it fails on an unused file, export, type or dependency your change left behind (see **Lint and Dead Code**).
If you touched tests, also run them from the app: `cd apps/<app> && bun test tests/path/to/affected.test.ts`.
Claude Code's `PostToolUse` hook (`.claude/hooks/lint-on-edit.sh`) already runs each edited file through its package's linters, Biome with `--write` and then Oxlint, and reports what's left; fix it before moving on. Typecheck and tests aren't in the hook, so the checks above still apply.

CI (`.github/workflows/ci.yml`) runs lint, typecheck and tests for every package a PR affects, using Turbo's `--filter='...[origin/main]'`, and the dead-code check on the whole repo. Lint fails if `biome check --write` would change a file, or on any warning (every `lint` script runs `biome check --error-on-warnings` and `oxlint --deny-warnings`), so run `bun check` before pushing. Builds are left to Vercel's per-PR deploys. An app with tests needs a `test` script in its `package.json` for Turbo to pick it up.

## Lint and Dead Code
Biome lints and formats; Oxlint runs only the shadcn design-system rules and the complex apps' architecture rules; Fallow finds dead code. Config, rule lists, exemptions and gotchas: [docs/lint-and-dead-code.md](docs/lint-and-dead-code.md).
- A design-lint or architecture-lint finding is a design problem: use the fix the error suggests (a variant, a theme token), or declare an interface in application and implement it in infrastructure. Never widen a rule or pattern to make it pass.
- There's no dead-code baseline: the repo is at zero findings, and any finding fails. Before deleting something Fallow reports, confirm it: `bunx fallow dead-code --trace <file>:<export>`.

## Commits, branches and pull requests
When asked to commit:
- format: `type(scope): description`
- types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- keep commits atomic and focused: one per task, so `git log --grep` finds it
- in the main checkout, commit by path (`git commit -m "…" -- <paths>`), never `git add -A` or `git commit -a`: Hector stages his own work there
- refer to issues and PRs as `hectarek/hector-mono#123`, never a bare `#123`: numbering restarted on 2026-10-01, and older docs' numbers mean the earlier private repo ([docs/public-repo.md](docs/public-repo.md#history))

Branches and PRs:
- branches start from `main` and are named `type/short-topic` (e.g. `feat/recipes-ux-p9-itemized`, `docs/public-repo-followups`); an agent's branch is its worktree's (see **Working in parallel**)
- one PR per topic or plan phase, titled in the commit format, its description following `.github/pull_request_template.md`
- agents open PRs from their worktree branch; Hector merges. PRs merge with a merge commit (squash and rebase are off), which keeps each task's commit, and the branch is deleted on merge
- after opening a PR that changes code, build its [Whiteboard](https://dev.fast) for Hector's review: `session_create` with the PR's `pullRequestUrl`, then author it by Whiteboard's own `session_get_instructions`, not from memory. It opens in Whiteboard Desktop. After pushing more commits to that PR, update the same board (`session_create` with the URL returns it) rather than making another. Docs- or config-only PRs skip it unless asked, and so does any agent without the Whiteboard MCP tools (Hector's user-level `whiteboard@devfast` Claude Code plugin)

### Working in parallel
Hector runs several Claude Code sessions at once, so each agent does its branch and PR work in its own git worktree ([Claude Code: worktrees](https://code.claude.com/docs/en/worktrees)):
- Start one with `claude --worktree <name>` (or `-w`), the desktop app's worktree option, or by asking Claude to "work in a worktree". It's created at `.claude/worktrees/<name>/` (gitignored) from `origin/main`, on a new branch `worktree-<name>` (CLI and subagents) or `claude/<name>` (desktop app).
- A worktree is a fresh checkout: run `bun install` in it first. The root `.worktreeinclude` copies the apps' gitignored `.env` files into each new worktree.
- Rename the branch to the convention before pushing: `git branch -m <type/short-topic>`.
- One topic per worktree: start another worktree for another PR rather than switching this one's branch, so a branch with an open PR stays checked out where its session can find it.
- `.claude/launch.json` gives each app a fixed port, so only one session at a time can preview a given app.
- A PR stacked on another branch gets CI when GitHub retargets it to `main` (the workflow listens for that base change).
- On exit, Claude Code removes a clean worktree and asks about one that has work in it.

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

**Complex apps (stash, hectors-recipes, hectors-tools, future apps with backend/auth/database)**:
- Typed domain errors, caught at the server-action boundary (see **Complex Apps**)
- DI containers for dependency injection (`@evyweb/ioctopus`)
- Repository/Use Case/Controller layers
- Server actions for mutations
- Clean architecture boundaries
- `hectors-recipes` keeps the clean-arch structure but favors the simplest implementation per feature
- `hectors-tools` has no DB or auth: no repositories, transactions or auth gate

## Shared Packages
- **`@repo/ui`**: shadcn/ui components — always check here before creating new components
- **`@repo/biome-config`**: Shared Biome config; the root `biome.json` extends it and adds per-path overrides (see [docs/lint-and-dead-code.md](docs/lint-and-dead-code.md#biome))
- **`@repo/typescript-config`**: Base tsconfig presets

## React & Next.js Patterns
- Next.js 16+, React 19
- Server Components by default
- Colocate components near their routes (`app/_components/`)
- Providers live in `app/_providers/`

## Complex Apps
`stash`, `hectors-recipes` and `hectors-tools` follow [docs/clean-architecture.md](docs/clean-architecture.md). `hectors-recipes` is the reference implementation; `stash` was the first example of the pattern and isn't authoritative where they differ.
- Layers: entities (Zod schemas, no dependencies), application (use cases and interfaces), interface adapters (controllers), infrastructure (implements the interfaces with `db/`, `lib/` and vendor SDKs), and `di/`, which wires them. Each imports only inward, and Oxlint enforces it ([§5](docs/clean-architecture.md#5-layer--import-rules)).
- Reads go page → controller (through `getInjection`) → use case → repository. Writes go through a server action in `app/actions/<domain>.ts`, then `revalidatePath` or `redirect` ([§3](docs/clean-architecture.md#3-layers-in-detail) has the diagram).
- Errors are typed classes thrown below the server action and caught in it with `toActionError`, never returned as a `Result<T>` ([§3.5](docs/clean-architecture.md#35-app-layer-app-proxyts)). A transaction manager rethrows domain errors unchanged ([§7](docs/clean-architecture.md#transactions)).
- Build a feature inward-out, from the Zod schema to the server action and UI ([§9](docs/clean-architecture.md#9-adding-a-feature-order)).

## Hook Placement (apps with client state)
- **Container components** (`*-container.tsx`, e.g. relationship-meter's `relationship-meter-container.tsx`): Call domain hooks, orchestrate logic
- **Leaf components**: Receive plain functions as props, only use local state hooks

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
