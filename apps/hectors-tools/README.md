# hectors-tools

A catalog of small AI and general-purpose web tools, accessible from a single sidebar. Part of [hector-mono](../../README.md).

> Agent context lives in [`AGENTS.md`](./AGENTS.md). Read it before making changes.

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui via `@repo/ui`
- DI: `@evyweb/ioctopus` (lean — the logger, the AI service, and the resume-analyzer use case and controller)
- No database or auth yet — added per-tool only when one needs persistence/users

## Architecture

Lean clean architecture: `entities → application → interface-adapters → infrastructure`, wired by `di/`. The first tool (Resume Analyzer) is stateless and calls the `ai` SDK through `IAiService`. See the canonical [clean-architecture guide](../../docs/clean-architecture.md) and [`AGENTS.md`](./AGENTS.md).

## Commands

```bash
bun run dev --filter=hectors-tools
bun run build --filter=hectors-tools
bun run test --filter=hectors-tools
bun check --filter=hectors-tools && bun ts --filter=hectors-tools
```
