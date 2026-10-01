# hector-mono

Personal monorepo for Hector Gonzalez's apps and shared packages. Turborepo + Bun workspaces.

> **Working in this repo with an AI agent?** Start with [`AGENTS.md`](./AGENTS.md) — it's the canonical context, loaded automatically by Claude Code, Cursor, Codex, etc. Each app has its own `AGENTS.md` too.

## Apps

| App | What it is | Stack |
|---|---|---|
| [`hector-portfolio`](./apps/hector-portfolio) | Static personal portfolio | Next.js 16, React 19, Tailwind, Framer Motion — no backend |
| [`relationship-meter`](./apps/relationship-meter) | Client-side relationship tracker | Next.js 16, React 19 — in-memory state, no backend |
| [`hectors-recipes`](./apps/hectors-recipes) | Recipes app (auth + DB) | Next.js 16, Neon Postgres, Drizzle, Neon Auth, clean architecture |
| [`stash`](./apps/stash) | Stash/bookmark app (auth + DB) | Next.js 16, Neon Postgres, Drizzle, Neon Auth, full clean architecture |
| [`hectors-tools`](./apps/hectors-tools) | Catalog of small AI and web tools | Next.js 16, AI SDK via the Vercel AI Gateway, clean architecture + DI, no DB or auth yet |

## Packages

| Package | Purpose |
|---|---|
| [`@repo/ui`](./packages/ui) | Shared shadcn/ui component library |
| `@repo/biome-config` | Shared Biome config |
| `@repo/typescript-config` | Shared TypeScript presets |

## Tooling

- **Bun** — package manager + runtime (never npm/yarn)
- **Turborepo** — task orchestration + caching
- **Biome** — lint + format (no ESLint/Prettier)
- **TypeScript** — strict everywhere

## Quick start

```bash
bun install                              # from the repo root
bun run dev --filter=<app>               # dev server for one app
bun check                                # lint all (turbo run lint)
bun ts                                   # typecheck all (turbo run check-types)
bun run build --filter=<app>             # build one app
```

Scope checks to the app you're working on: `bun check --filter=<app> && bun ts --filter=<app>`.

## Documentation

- [`AGENTS.md`](./AGENTS.md) — conventions, patterns, and agent context (canonical)
- [`docs/monorepo-guide.md`](./docs/monorepo-guide.md) — Bun workspaces, Turborepo, deps, deployment
- [`docs/clean-architecture.md`](./docs/clean-architecture.md) — clean-architecture guide for complex apps
- [`docs/ui-package.md`](./docs/ui-package.md) — `@repo/ui` usage
- [`docs/development/agent-context-playbook.md`](./docs/development/agent-context-playbook.md) — how we keep agent context healthy
- [`docs/public-repo.md`](./docs/public-repo.md) — what stays out of this public repo, and where it goes instead

## License

[MIT](./LICENSE).
