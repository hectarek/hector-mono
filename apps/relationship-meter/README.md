# relationship-meter

Client-side relationship strength tracker with research-based decay and interaction models. Part of [hector-mono](../../README.md).

> Agent context lives in [`AGENTS.md`](./AGENTS.md). Read it before making changes.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui via `@repo/ui`
- Client-side state only — data is in-memory and lost on refresh (no backend, auth, or database)

## Structure

Single-page app. A container component (`app/_components/relationship-meter-container.tsx`) owns all state; domain algorithms (decay, Granovetter tie strength, Dunbar layers) live in `app/_lib/model.ts`.

## Commands

```bash
bun run dev --filter=relationship-meter
bun run build --filter=relationship-meter
bun check --filter=relationship-meter && bun ts --filter=relationship-meter
```

## Documentation

- [Algorithm](./docs/algorithm.md) and research notes ([1](./docs/research.md), [2](./docs/research2.md), [3](./docs/research3.md))
