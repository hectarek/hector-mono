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
  packages/
    ui/                   # Shared UI components (shadcn/ui based)
    biome-config/         # Shared Biome linting config
    typescript-config/    # Shared TypeScript configs (base, nextjs, react-library)
  package.json            # Root — monorepo tooling only
  turbo.json              # Turborepo task definitions
  biome.json              # Root Biome config (extends @repo/biome-config)
  bun.lock                # Single lockfile for entire monorepo
```

**Key principle**: The root `package.json` only contains monorepo-level tooling (`turbo`, `biome`, `typescript`, `tsx`). App-specific dependencies (`next`, `react`, `drizzle-orm`, etc.) belong in each app&apos;s own `package.json`.

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
4. Installs packages into `node_modules/` using **hoisting**

### Hoisting

Bun installs most packages in the **root** `node_modules/`. All workspaces share these packages via Node&apos;s module resolution (Node walks up directories until it finds `node_modules`).

When hoisting isn&apos;t possible (version conflicts), bun creates a **local** `node_modules/` inside the app with just the conflicting packages. Everything else still resolves from root.

**Example**: If `@react-email/tailwind` needs exactly `tailwindcss@4.1.18` but your apps resolve `^4` to `4.2.2`, bun can&apos;t put a single version at root. It installs `4.2.2` in each app&apos;s local `node_modules/` and `4.1.18` in the `.bun/` cache for the transitive dep.

### Why `bun install` must run from the root

In a workspace, the lockfile lives at the root. Running `bun install` from an app directory:

- Detects it&apos;s inside a workspace
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

When you run `turbo run check-types`, turbo looks at every workspace and runs the `check-types` script if that workspace has one. **If a workspace doesn&apos;t have a matching script name, turbo silently skips it.**

This means script naming is critical. If the root runs `turbo run check-types` but an app only has a `ts` script, that app&apos;s typecheck will never run.

### Script naming convention

All Next.js apps in this monorepo use:

| Script | Command | Purpose |
|---|---|---|
| `dev` | `next dev` | Start dev server |
| `build` | `next build` | Production build |
| `start` | `next start` | Start production server |
| `ts` | `tsc --noEmit` | Typecheck (local alias) |
| `check-types` | `tsc --noEmit` | Typecheck (turbo alias) |
| `lint` | `biome check --write` | Lint and format (turbo alias) |

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

Turbo caches task outputs. If inputs haven&apos;t changed, it replays the cached output instantly. The `.turbo/` directories store this cache locally. The `clean:install` script clears these caches along with `node_modules`.

---

## Dependency Management

### Where dependencies belong

| Location | What goes there | Examples |
|---|---|---|
| Root `devDependencies` | Monorepo tooling used across all workspaces | `turbo`, `@biomejs/biome`, `typescript`, `tsx` |
| Root `dependencies` | Nothing — keep empty | — |
| App `dependencies` | Runtime deps for that specific app | `next`, `react`, `drizzle-orm` |
| App `devDependencies` | Build/dev-time deps for that specific app | `tailwindcss`, `@types/react`, `typescript` |
| Package `dependencies` | Runtime deps for the shared package | `tailwind-merge`, `clsx` |
| Package `peerDependencies` | Deps the consumer must provide | `react`, `react-dom` |

**Why keep root `dependencies` empty?** Root deps are available to all workspaces via hoisting, which creates confusion about where a dep actually belongs. It also installs unnecessary packages for apps that don&apos;t need them. Each app should declare its own deps.

### Version range consistency

When multiple workspaces depend on the same package, use the **same version range string** everywhere. This helps bun deduplicate and hoist a single copy.

```json
// Good — all apps use the same range
"tailwindcss": "^4"
"tailwindcss": "^4"
"tailwindcss": "^4"

// Bad — different ranges, may resolve to different versions
"tailwindcss": "^4"
"tailwindcss": "^4.1.18"
"tailwindcss": "4.2.2"
```

Even if `^4` and `^4.1.18` resolve to the same version today, the different range strings can cause bun to treat them as separate entries and break hoisting.

### Version range best practices

- **`^major`** (e.g., `^4`): For most deps. Accepts any compatible version within the major. Broadest range, best for deduplication.
- **`^major.minor`** (e.g., `^4.1`): When you need features from a specific minor release.
- **`^major.minor.patch`** (e.g., `^4.1.18`): When you need a specific bugfix. Avoid unless necessary — it limits deduplication.
- **Exact** (e.g., `4.1.18`): Only for deps that break on minor/patch bumps. Rare.
- **`workspace:*`**: For internal packages (`@repo/ui`, `@repo/biome-config`). Always use this for cross-workspace references.

### Updating dependencies

```bash
bun run deps:check        # See what's outdated
bun run deps:update       # Update all to latest compatible
bun run deps:interactive  # Interactive update picker
```

After updating, always run `bun ts && bun check` to verify nothing broke.

---

## Adding a New App

1. Create the directory: `apps/my-new-app/`
2. Add a `package.json` with the standard scripts (`dev`, `build`, `start`, `ts`, `check-types`, `lint`)
3. Use the same version ranges as existing apps for shared deps
4. Add `@repo/ui`, `@repo/biome-config`, `@repo/typescript-config` as applicable
5. Create a `tsconfig.json` extending `@repo/typescript-config/nextjs.json`
6. Create a `biome.json` extending `@repo/biome-config`
7. Run `bun install` from the root
8. Verify: `bun ts` and `bun check` should include the new app

### Standard scripts template (Next.js app)

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "ts": "tsc --noEmit",
    "check-types": "tsc --noEmit",
    "lint": "biome check --write"
  }
}
```

Add app-specific scripts as needed (`db:push`, `test`, etc.) — these don&apos;t need to be universal.

### Standard devDependencies template (Next.js app)

```json
{
  "devDependencies": {
    "@repo/biome-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "^4",
    "@types/node": "^25.1.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "tailwindcss": "^4",
    "typescript": "^5"
  }
}
```

---

## Deployment

### How Vercel handles monorepos

When deploying a specific app (e.g., `hectors-recipes`) to Vercel:

1. Vercel clones the entire monorepo
2. Runs `bun install` from the root (creates full `node_modules` with hoisting)
3. Runs `turbo run build --filter=hectors-recipes`
4. Turbo resolves the dependency graph (`@repo/ui` builds first via `dependsOn: ["^build"]`)
5. Next.js outputs `.next/` which Vercel deploys

### Vercel project settings

- **Root directory**: `/` (the monorepo root, not the app directory)
- **Build command**: `turbo run build --filter=hectors-recipes`
- **Install command**: `bun install` (default, runs from root)
- **Output directory**: `apps/hectors-recipes/.next`

### Important considerations

- The `bun.lock` must be committed — Vercel uses it for deterministic installs
- Environment variables are set per-project in Vercel, not in `.env` files
- Turbo&apos;s remote caching can speed up CI/CD builds across deploys (optional, requires Vercel account linking)

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
bun run deps:update      # Update all to latest
bun run deps:interactive # Interactive update picker
```

### Troubleshooting

```bash
bun run clean:install    # Nuclear option — wipe everything and reinstall
```

---

## Troubleshooting

### "Can&apos;t resolve &apos;X&apos;" errors

**Cause**: Package is in the lockfile but not properly linked in `node_modules`. Happens when the lockfile gets out of sync with installed packages.

**Fix**:
```bash
bun run clean:install
```

### `bun ts` or `bun check` skips an app

**Cause**: The app is missing the `check-types` or `lint` script that turbo looks for. Turbo silently skips workspaces without a matching script.

**Fix**: Add the missing script to the app&apos;s `package.json`:
```json
"check-types": "tsc --noEmit",
"lint": "biome check --write"
```

### `bun install` from app directory shows "no changes" but deps are missing

**Cause**: In a workspace, `bun install` from a subdirectory validates against the existing lockfile but doesn&apos;t do a fresh resolution.

**Fix**: Always run `bun install` from the monorepo root.

### Apps have local `node_modules/` directories

**Cause**: Version conflicts prevent hoisting. When two packages need different versions of the same dependency, bun installs the app-specific version locally.

**Not a problem**: This is normal. The local `node_modules/` only contains conflicting packages; everything else resolves from root. Common culprit: transitive dependencies pinning exact versions (e.g., `@react-email/tailwind` pinning `tailwindcss@4.1.18` while apps use `^4`).

**To minimize**: Use consistent, broad version ranges (`^4` over `^4.1.18`) across all workspaces.

### `.next/types/` TypeScript errors

**Cause**: Stale auto-generated Next.js type files from a previous build.

**Fix**:
```bash
rm -rf apps/<app-name>/.next
bun ts
```

### Peer dependency warnings during install

**Cause**: A dependency declares a peer dependency that doesn&apos;t match the installed version. Common with `@neondatabase/auth` and `better-auth` ecosystem packages during beta periods.

**Usually safe to ignore**: These are warnings, not errors. If they cause runtime issues, check the package&apos;s changelog for compatibility notes.
