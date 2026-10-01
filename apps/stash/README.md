# stash

Stash/bookmark app with auth and a database. The first app built on the monorepo's clean architecture; `hectors-recipes` is now the reference implementation. Part of [hector-mono](../../README.md).

> Agent context lives in [`AGENTS.md`](./AGENTS.md) — it's detailed and authoritative. Read it before making changes.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui via `@repo/ui`
- Neon Postgres via `@neondatabase/serverless` (WebSocket Pool) + Drizzle ORM
- Auth: Neon Auth (Better Auth powered)
- DI: `@evyweb/ioctopus`

## Architecture

Full clean architecture: `entities → application → interface-adapters → infrastructure`, wired by `di/`, with server actions in `app/actions/` and route protection in `proxy.ts`. See the canonical [clean-architecture guide](../../docs/clean-architecture.md) and [`AGENTS.md`](./AGENTS.md).

## Commands

```bash
bun run dev --filter=stash
bun run build --filter=stash
bun run --filter=stash db:push
bun run --filter=stash db:studio
bun check --filter=stash && bun ts --filter=stash
```

## Documentation

- [Clean Architecture Guide](../../docs/clean-architecture.md)
- [Proxy Auth Research](../../docs/proxy-auth-research.md) — Next.js 16 + Neon Auth proxy notes
