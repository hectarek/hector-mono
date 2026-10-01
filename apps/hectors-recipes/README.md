# hectors-recipes

Shared recipe books, a weekly meal plan, one grocery list, and a cook mode, for a household cooking from the same recipes. Mobile-first and installable to the home screen. Part of [hector-mono](../../README.md).

What it does and why each decision was made: [docs/meal-planner-spec.md](docs/meal-planner-spec.md) (see "As built" at the end). How each feature works now, and what to keep true when changing it: [docs/features.md](docs/features.md).

> Agent context lives in [`AGENTS.md`](./AGENTS.md). Read it before making changes.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui via `@repo/ui`
- Neon Postgres via `@neondatabase/serverless` + Drizzle ORM (generated migrations)
- Auth: Neon Auth (Better Auth powered)
- DI: `@evyweb/ioctopus`

## Architecture

Clean architecture (`app → interface-adapters → application → entities`; `infrastructure` implements the application's interfaces; `di/` wires them), kept as simple as each feature allows. This app is the reference implementation of the [clean-architecture guide](../../docs/clean-architecture.md).

## Commands

```bash
bun run dev --filter=hectors-recipes
bun run build --filter=hectors-recipes
bun run --filter=hectors-recipes db:generate
bun run --filter=hectors-recipes db:migrate
bun run --filter=hectors-recipes db:studio
bun check --filter=hectors-recipes && bun ts --filter=hectors-recipes
cd apps/hectors-recipes && bun test
```

Deploying (Vercel root directory, env vars, Neon trusted domains) is covered in [AGENTS.md](./AGENTS.md#deploying-vercel).
