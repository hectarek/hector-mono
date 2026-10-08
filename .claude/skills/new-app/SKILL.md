---
name: new-app
description: Checklist for adding a new Next.js app to this monorepo (package.json scripts and workspace packages, tsconfig, styling through @repo/ui, the design-system lint override, turbo.json env vars, tests, files to delete, the app's AGENTS.md, checks). Use when creating an app under apps/ or bringing an existing Next.js app into the repo.
---

# New App Onboarding Checklist

Use this checklist when adding a new Next.js app to the monorepo.

## 1. Package Configuration

Update `package.json` (take current versions from an existing app, e.g. `apps/hectors-tools/package.json`; the ones below only show the shape):

```json
{
  "name": "app-name",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "ts": "tsc --noEmit",
    "check-types": "tsc --noEmit",
    "lint": "biome check --write --error-on-warnings && oxlint --deny-warnings .",
    "format": "biome format --write"
  },
  "dependencies": {
    "@repo/ui": "workspace:*",
    "next": "…",
    "react": "…",
    "react-dom": "…"
  },
  "devDependencies": {
    "@repo/biome-config": "workspace:*",
    "@repo/typescript-config": "workspace:*",
    "@tailwindcss/postcss": "…",
    "@types/node": "…",
    "@types/react": "…",
    "@types/react-dom": "…",
    "tailwindcss": "…",
    "typescript": "…"
  }
}
```

- `next.config.ts` sets `reactCompiler: true`, as in every app except `relationship-meter`, and the experimental options in [docs/monorepo-guide.md](../../../docs/monorepo-guide.md#experimental-nextjs-options): `turbopackRustReactCompiler` runs the compiler inside Turbopack, so there's no `babel-plugin-react-compiler` to install.
- Add every package the app imports itself (e.g. `lucide-react`): installs are isolated, so an app can't import a package it doesn't declare, even when `@repo/ui` has it. Not `next-themes` or `tw-animate-css`: those come through `@repo/ui`.
- Use the same version string as the other apps for shared packages; `recharts`, if the app imports it, must be exactly `packages/ui`'s version.

## 2. TypeScript Configuration

Replace `tsconfig.json`:

```json
{
  "extends": "@repo/typescript-config/nextjs.json",
  "compilerOptions": {
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

## 3. Styling, Fonts, Dark Mode

Follow "Setting up an app" in [docs/ui-package.md](../../../docs/ui-package.md): `components.json`, `postcss.config.mjs`, a one-line `app/globals.css`, fonts on `<html>`, and `ThemeProvider` from `@repo/ui` in `app/_providers/providers.tsx`. Don't define tokens or add `@source` lines in the app.

## 4. Design-System Lint

The `lint` script above already runs Oxlint. Add `"apps/<app>/**"` to the `files` of the `.oxlintrc.json` override that sets the six `shadcn/*` rules to `error` (the entry listing every app; keep each rule's options, e.g. `no-restyle`'s `allow: ["layout"]`). The script runs `oxlint --deny-warnings`, so the app's design-lint findings fail `bun check` and CI from the start. See "Design-System Lint" in [docs/lint-and-dead-code.md](../../../docs/lint-and-dead-code.md#design-system-lint).

**Complex app** (clean architecture): add its paths to every layer override in `.oxlintrc.json` (the entries for `src/entities/**`, `src/application/**`, `src/interface-adapters/**`, `src/infrastructure/**`, `app/**` with `proxy.ts`, and the auth route and page), following the existing apps. Plant one forbidden import (e.g. `@/db` in an entity) and confirm `bun check --filter=<app>` fails before removing it. See "Architecture Lint" in [docs/lint-and-dead-code.md](../../../docs/lint-and-dead-code.md#architecture-lint).

## 5. Environment Variables

If `next build` needs env vars (a module that reads one at import, a page rendered at build time), add `apps/<app>/turbo.json` listing them: Turborepo runs builds in strict env mode, so a variable not listed is withheld from `next build`, even when it's set in Vercel. Copy `apps/hectors-recipes/turbo.json`:

```json
{
  "$schema": "https://v2-11-5.turborepo.dev/schema.json",
  "extends": ["//"],
  "tasks": {
    "build": {
      "env": ["$TURBO_EXTENDS$", "DATABASE_URL", "LOG_LEVEL"]
    }
  }
}
```

Keep secrets in a gitignored `.env` with a tracked `.env.example` listing the names. The root `.worktreeinclude` already copies `apps/*/.env` into new Claude Code worktrees.

## 6. Tests

For an app with tests (as `hectors-recipes`, `stash` and `hector-portfolio` have):

- [ ] A `"test": "bun test"` script, so `bun run test` and CI (Turbo) pick the app up
- [ ] `@types/bun` in `devDependencies` and `"types": ["bun"]` in `tsconfig.json`'s `compilerOptions`; without it `tsc` and `next build` fail on `bun:test` imports
- [ ] Test files under `tests/`, mirroring the source tree
- [ ] If tests must never reach real services: a `bunfig.toml` with `[test]` `preload = ["./tests/_support/preload.ts"]`, and a preload that deletes the credentials Bun loads from `.env` (see `apps/hectors-recipes/tests/_support/preload.ts`)

## 7. Files to Delete

Remove these files/folders (use monorepo equivalents):

- [ ] `bun.lockb` or `package-lock.json` (use root lockfile)
- [ ] `eslint.config.mjs` or `.eslintrc.*` (use Biome)
- [ ] `tailwind.config.ts` (Tailwind v4 uses CSS config)
- [ ] Unused public assets (`next.svg`, `vercel.svg`, etc.)

## 8. Agent Context

- [ ] An `AGENTS.md` for the app, modelled on an app of the same complexity (`apps/relationship-meter/AGENTS.md` for a simple one, `apps/hectors-recipes/AGENTS.md` for one with a backend), with its scoped check commands
- [ ] The app in the root `AGENTS.md` "Monorepo Structure" block and in the README's app table

## 9. Final Steps

1. Run `bun install` from root
2. Run `bun check && bun ts` to verify
3. Run `bun run build --filter=app-name` to test build
4. With tests: `bun run test --filter=app-name`

## Common Issues

**Missing dependencies**: Check if the app uses packages not in the updated `package.json`

**Type errors**: Ensure `@repo/typescript-config` is properly extended

**Styling not working**: Compare `app/globals.css`, `components.json` and the `<html>` classes with `docs/ui-package.md`

**Build fails**: Check for ESLint references in `next.config.ts`
