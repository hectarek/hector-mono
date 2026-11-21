# community-game-library

A private library for a circle of friends' board games: who owns what, borrowing with due dates nobody has to remember, and game nights with the right games for the people coming. Phone-first and installable to the home screen. Part of [hector-mono](../../README.md).

What it does and why each decision was made: [docs/build-plan.md](docs/build-plan.md), with the tables in [docs/data-model.md](docs/data-model.md) and the screens' rules in [docs/screens.md](docs/screens.md).

> Agent context lives in [`AGENTS.md`](./AGENTS.md). Read it before making changes.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui via `@repo/ui`
- Neon Postgres via `@neondatabase/serverless` + Drizzle ORM (generated migrations)
- Auth: Neon Auth (Better Auth powered)
- Files: Neon Object Storage, through the AWS SDK
- DI: `@evyweb/ioctopus`

## Architecture

Clean architecture on [hectors-recipes](../hectors-recipes)' pattern (`app → interface-adapters → application → entities`; `infrastructure` implements the application's interfaces; `di/` wires them). See the [clean-architecture guide](../../docs/clean-architecture.md).

## Commands

```bash
bun run --cwd apps/community-game-library dev --port 3102
bun run build --filter=community-game-library
bun run --filter=community-game-library db:generate
bun run --filter=community-game-library db:migrate
bun check --filter=community-game-library && bun ts --filter=community-game-library
cd apps/community-game-library && bun run test
```
