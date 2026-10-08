# Monorepo Guide

Reference for how this monorepo is structured, why it works the way it does, and how to avoid common pitfalls.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Bun Workspaces](#bun-workspaces)
- [Turborepo](#turborepo)
- [Dependency Management](#dependency-management)
- [Adding a New App](#adding-a-new-app)
- [Deployment](#deployment)
- [Commands Reference](#commands-reference)
- [Troubleshooting](#troubleshooting)

---

## Architecture Overview

```
hector-mono/
  apps/
    hector-portfolio/     # Static portfolio site
    hectors-recipes/      # Recipes app (Neon + Drizzle + auth)
    stash/                # Stash/bookmark app (Neon + Drizzle + auth)
    relationship-meter/   # Client-side relationship tracker
    hectors-tools/        # AI/web tools catalog (AI SDK, no DB or auth)
  packages/
    ui/                   # Shared UI components (shadcn/ui based)
    biome-config/         # Shared Biome linting config
    typescript-config/    # Shared TypeScript configs (base, nextjs, react-library)
  package.json            # Root — monorepo tooling only
  turbo.json              # Turborepo task definitions
  biome.json              # Root Biome config (extends @repo/biome-config)
  bun.lock                # Single lockfile for entire monorepo
```

**Key principle**: The root `package.json` only contains monorepo-level tooling (`@biomejs/biome`, `@shadcn/lint`, `drizzle-kit`, `fallow`, `oxlint`, `turbo`, `typescript`). App-specific dependencies (`next`, `react`, `drizzle-orm`, etc.) belong in each app's own `package.json`.

---

## Bun Workspaces

### How they work

The root `package.json` declares:

```json
"workspaces": ["apps/*", "packages/*"]
```

This tells bun that every directory matching those globs is a **workspace member**. When you run `bun install` from the root, bun:

1. Reads every `package.json` across all workspaces
2. Resolves a single unified dependency tree
3. Generates one `bun.lock` at the root
4. Installs packages with the **isolated** linker (below)

### Isolated installs

`bun.lock` has `configVersion: 1`, and for a workspace that makes Bun's isolated linker the default ([Bun: isolated installs](https://bun.com/docs/pm/isolated-installs)). Each package version is stored once in `node_modules/.bun/`, and each workspace's own `node_modules/` holds symlinks to only the packages it declares. The root `node_modules/` holds the root's own devDependencies.

So a workspace can't import a package it doesn't declare, even when another workspace has it. When two workspaces resolve the same package to different versions, each gets its own copy.

### Why `bun install` must run from the root

In a workspace, the lockfile lives at the root. Running `bun install` from an app directory:

- Detects it's inside a workspace
- Validates against the existing lockfile
- Reports "no changes" even if symlinks are broken
- **Does not** do a fresh resolution or create missing links

Always run `bun install` (and `bun add`/`bun remove`) from the **monorepo root**. To add a dep to a specific app:

```bash
# From the root
bun add some-package --filter=hectors-recipes

# Or cd into the app and run bun add (this does work for adding)
cd apps/hectors-recipes && bun add some-package
```

### Running scripts from app directories

After a root install, you **can** run scripts from app directories:

```bash
cd apps/hectors-recipes
bun run dev      # works — deps resolve from root + local node_modules
bun run build    # works
```

The distinction is: `bun install` = root only, `bun run <script>` = anywhere.

---

## Turborepo

### How turbo finds tasks

`turbo.json` defines task names:

```json
{
  "tasks": {
    "build": { ... },
    "dev": { ... },
    "check-types": { ... },
    "lint": { ... }
  }
}
```

When you run `turbo run check-types`, turbo looks at every workspace and runs the `check-types` script if that workspace has one. **If a workspace doesn't have a matching script name, turbo silently skips it.**

This means script naming is critical. If the root runs `turbo run check-types` but an app only has a `ts` script, that app's typecheck will never run.

### Script naming convention

All Next.js apps in this monorepo use:

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Start dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `ts` | `tsc --noEmit` | Typecheck (local alias) |
| `check-types` | `tsc --noEmit` | Typecheck (turbo alias) |
| `lint` | `biome check --write --error-on-warnings && oxlint --deny-warnings .` | Biome lint and format, then the design-system and architecture lint; warnings fail (turbo alias) |

Both `ts` and `check-types` run the same command. `ts` is a convenience for running locally (`bun ts`), `check-types` is what turbo looks for. Same pattern for `lint`.

### Root script mapping

The root `package.json` maps developer-friendly names to turbo tasks:

```json
"scripts": {
  "ts": "turbo run check-types",
  "check": "turbo run lint",
  "build": "turbo run build"
}
```

So `bun ts` from root typechecks all apps, `bun check` lints all apps.

### Task dependencies

```json
"build": {
  "dependsOn": ["^build"]
}
```

The `^` prefix means "run this task in all dependencies first." So if `hectors-recipes` depends on `@repo/ui`, turbo builds `@repo/ui` before `hectors-recipes`. This ensures shared packages are ready before apps that consume them.

### Caching

Turbo caches task outputs. If inputs haven't changed, it replays the cached output instantly. The `.turbo/` directories store this cache locally. The `clean:install` script clears these caches along with every `node_modules` and `bun.lock` (see [Troubleshooting](#troubleshooting)).

---

## Dependency Management

### Where dependencies belong

| Location | What goes there | Examples |
|---|---|---|
| Root `devDependencies` | Monorepo tooling used across all workspaces | `turbo`, `@biomejs/biome`, `oxlint`, `@shadcn/lint`, `fallow`, `typescript`, `drizzle-kit` |
| Root `dependencies` | Nothing — keep empty | — |
| App `dependencies` | Runtime deps for that specific app | `next`, `react`, `drizzle-orm` |
| App `devDependencies` | Build/dev-time deps for that specific app | `tailwindcss`, `@types/react`, `typescript` |
| Package `dependencies` | Runtime deps for the shared package | `@base-ui/react`, `cn` |
| Package `peerDependencies` | Deps the consumer must provide | `react`, `react-dom` |

**Why keep root `dependencies` empty?** Root deps are reachable from every workspace (Node's resolution walks up to the root `node_modules/`), which creates confusion about where a dep actually belongs. It also installs unnecessary packages for apps that don't need them. Each app should declare its own deps.

### Version range consistency

When multiple workspaces depend on the same package, use the **same version string** everywhere (`"tailwindcss": "^4.3.3"` in every app), so they resolve to one version. Two versions mean two copies, and for a package that holds shared state that fails without an error: an app's `recharts` chart inside `@repo/ui`'s `ChartContainer` renders nothing, and a second `next-themes` can split the theme context (see [packages/ui/AGENTS.md](../packages/ui/AGENTS.md)).

### Version ranges in practice

- **`^major.minor.patch`** (e.g. `^4.3.3`, what `bun add` writes): most deps.
- **Exact** (e.g. `16.4.0`): `next`, `react` and `react-dom` (the same in every app), `recharts` (identical in `packages/ui` and every app that imports it), and a few tools and SDKs (`@biomejs/biome`, `@types/bun`, `fallow`, recipes' `ably`, and `ai` with `@ai-sdk/gateway` in hectors-recipes and hectors-tools, pinned together).
- **`workspace:*`**: For internal packages (`@repo/ui`, `@repo/biome-config`). Always use this for cross-workspace references.

### Updating dependencies

```bash
bun run deps:check        # bun outdated --recursive: what's outdated in every workspace
bun run deps:update       # bun update --latest --recursive: see below
bun run deps:interactive  # bun update --interactive --recursive: pick what to update
```

`deps:update` is not "latest compatible": `--latest` ignores the current ranges, jumps major versions, and rewrites the ranges in every `package.json`. Read the changelogs of anything that crossed a major, and check that `recharts` is still the identical version in `packages/ui` and every app that imports it.

After updating, always run `bun ts && bun check && bun run test` to verify nothing broke.

### Experimental Next.js options

Turned on 2026-10-08 with Next.js 16.4, in every app's `next.config.ts` under `experimental`. Next.js marks both as experimental; remove each one here and in the configs when it becomes the default.

- **`turbopackRustReactCompiler`** (the apps with `reactCompiler: true`): the React Compiler's Rust port runs inside Turbopack instead of through Babel, so `babel-plugin-react-compiler` isn't installed. It compiles the components the Babel plugin compiled, memoized much the same way, and also hectors-recipes' link import (`link-import.tsx`), which the Babel plugin skipped only because of syntax it couldn't handle. Like the Babel plugin, it leaves cook mode uncompiled: `CookModeContent` reads a ref during render. In one clean build of each app, the compile step was 9–29% faster. To go back: remove the option and add `babel-plugin-react-compiler` as a dev dependency.
- **`turbopackGc`** (every app): Turbopack removes work it no longer needs from memory and from its cache in `.next/`, so long dev sessions and a `.next` per worktree stay smaller. It applies to `next dev` and `next build`.

Left off: worker threads (`turbopackPluginRuntimeStrategy`), which save memory but aren't a setup change, and Bun's global store with `turbopackAdditionalRoots`, which Next.js 16.4 supports only by hand.

---

## Adding a New App

Follow the `new-app` skill ([.claude/skills/new-app/SKILL.md](../.claude/skills/new-app/SKILL.md); in Claude Code, `/new-app`). It covers the `package.json` scripts and dependencies, `tsconfig.json`, styling through `@repo/ui`, the design-system lint, the app's `turbo.json`, tests, files to delete, and the app's `AGENTS.md`. There's no per-app `biome.json`: the root one covers every app.

---

## Deployment

### How Vercel builds an app

Each deployed app is its own Vercel project whose **root directory is the app's folder** (`apps/hector-portfolio`, `apps/hectors-recipes`, `apps/relationship-meter`), with the Next.js framework preset. For each deploy, Vercel:

1. Clones the whole monorepo and runs `bun install` (it detects Bun from the root `bun.lock`)
2. Detects Turborepo and runs `turbo run build` from the app's folder, which Turborepo scopes to that app and its dependencies
3. Deploys the app's `.next/` output

Because the build runs through Turborepo, its strict env mode applies: an env var not listed in the app's `turbo.json` (`tasks.build.env`) is withheld from `next build`, even when it's set in Vercel.

`apps/hector-portfolio/vercel.json` overrides the build command with `bun run build` (the app's own `next build`, without Turborepo), and sets its install command and a few env flags.

### Vercel project settings

- **Root directory**: the app's folder (e.g. `apps/hectors-recipes`)
- **Framework preset**: Next.js. Build, install and output settings stay at the preset's defaults unless the app's `vercel.json` overrides them

### Important considerations

- The `bun.lock` must be committed — Vercel uses it for deterministic installs
- Environment variables are set per-project in Vercel, not in `.env` files
- Turbo's remote caching can speed up CI/CD builds across deploys (optional, requires Vercel account linking)

### Deploying from a public repo

The projects live in the `hectareks-projects` Hobby team, connected to the public `hectarek/hector-mono`. Hector's pushes deploy as usual. A pull request from someone else's fork deploys only after Hector authorizes it from the link Vercel comments on the PR (Git Fork Protection, on in each project), and preview deployments need a Vercel login ([Vercel: deploying forks of public Git repositories](https://vercel.com/docs/git#deploying-forks-of-public-git-repositories)).

While the repo was private (until 2026-10-01), Vercel only built commits whose author it matched to the team's owner through the GitHub **Login Connection**, and when that connection moved to another Vercel account every deploy was "blocked" (`TEAM_ACCESS_REQUIRED`). That rule is for private repos only ([Vercel: deploying private Git repositories](https://vercel.com/docs/git#deploying-private-git-repositories)). If the repo goes private again: `vercel api /v13/deployments/<deployment id> --scope hectareks-projects` shows the `seatBlock`; reconnect GitHub under Account Settings → Authentication → Login Connections on the personal Vercel account, then push again (blocked deployments don't retry).

---

## Commands Reference

### Daily development

```bash
bun install                              # Install/update all deps (from root)
bun run dev --filter=hectors-recipes     # Dev server for one app
bun ts                                   # Typecheck all apps
bun check                                # Lint all apps
```

### Per-app (from app directory, after root install)

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun ts               # Typecheck this app only
bun run lint         # Lint this app only
```

### Dependency management

```bash
bun run deps:check       # See outdated deps across all workspaces
bun run deps:update      # Update all to latest, across majors, rewriting ranges (see Updating dependencies)
bun run deps:interactive # Interactive update picker
```

### Troubleshooting

```bash
bun run clean:install    # Nuclear option — delete every node_modules, the .turbo caches and bun.lock, then reinstall
```

---

## Troubleshooting

### "Can't resolve 'X'" errors

**Cause**: Package is in the lockfile but not properly linked in `node_modules`. Happens when the lockfile gets out of sync with installed packages.

**Fix**:
```bash
bun run clean:install
```

`clean:install` runs `rm -rf node_modules apps/*/node_modules packages/*/node_modules .turbo apps/*/.turbo packages/*/.turbo bun.lock && bun install`. Deleting `bun.lock` means a fresh resolution: every dependency can move to the newest version its range allows, so review the regenerated `bun.lock` before committing it.

### `bun ts` or `bun check` skips an app

**Cause**: The app is missing the `check-types` or `lint` script that turbo looks for. Turbo silently skips workspaces without a matching script.

**Fix**: Add the missing script to the app's `package.json`:
```json
"check-types": "tsc --noEmit",
"lint": "biome check --write --error-on-warnings && oxlint --deny-warnings ."
```

### `bun install` from app directory shows "no changes" but deps are missing

**Cause**: In a workspace, `bun install` from a subdirectory validates against the existing lockfile but doesn't do a fresh resolution.

**Fix**: Always run `bun install` from the monorepo root.

### Apps have local `node_modules/` directories

**Cause**: Bun's isolated installs (see [Isolated installs](#isolated-installs)): each workspace's `node_modules/` holds symlinks to the packages it declares, which live in the root `node_modules/.bun/`.

**Not a problem**: This is normal.

### `.next/types/` TypeScript errors

**Cause**: Stale auto-generated Next.js type files from a previous build.

**Fix**:
```bash
rm -rf apps/<app-name>/.next
bun ts
```

### Peer dependency warnings during install

**Cause**: A dependency declares a peer dependency that doesn't match the installed version. Common with `@neondatabase/auth` and `better-auth` ecosystem packages during beta periods.

**Usually safe to ignore**: These are warnings, not errors. If they cause runtime issues, check the package's changelog for compatibility notes.
