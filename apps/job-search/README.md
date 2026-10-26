# job-search

A private job search workspace: its owner and an AI agent both keep it current, and each day it shows what needs a decision and what's due. The agent is to work in the app through page tools (WebMCP) from its own browser profile. Part of [hector-mono](../../README.md).

Status: the foundation and the start of the pipeline, not yet a tracker. It has sign-in for the owner's and the agent's accounts, an activity log of every change, the agent's first page tools, and companies, lead sources and the owner's settings. Jobs come next. The plan of record is [docs/build-plan.md](docs/build-plan.md); setting up the agent's browser is in [docs/agent-access.md](docs/agent-access.md).

> Agent context lives in [`AGENTS.md`](./AGENTS.md). Read it before making changes.

## Privacy

The repo is public, so it holds no specifics of the search. Companies, people, targets, pay and strategy live only in the app's database or the owner's private notes, and the code, tests and docs use fictional or generic data.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui via `@repo/ui`
- Neon Postgres via `@neondatabase/serverless` + Drizzle ORM
- Auth: Neon Auth (Better Auth powered)
- DI: `@evyweb/ioctopus`

## Architecture

Clean architecture on the monorepo's [clean-architecture guide](../../docs/clean-architecture.md), with `hectors-recipes` as the reference implementation. Its infrastructure is copied from recipes rather than shared; [`AGENTS.md`](./AGENTS.md#differences-from-recipes) lists what differs.

## Commands

```bash
cp .env.example .env    # the Neon test project's values only
bun run dev --filter=job-search
bun run build --filter=job-search
bun check --filter=job-search && bun ts --filter=job-search
bun run test --filter=job-search
```
