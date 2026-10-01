# hector-portfolio

Static personal portfolio site for Hector Gonzalez. Part of the [hector-mono](../../README.md) monorepo.

> Agent context lives in [`AGENTS.md`](./AGENTS.md). Read it before making changes.

## Stack

- Next.js 16 (App Router), React 19
- Tailwind CSS v4, shadcn/ui via `@repo/ui`, Framer Motion
- Static data from JSON — no backend, no auth, no database, no runtime fetching

## Structure

```
app/            # App Router pages + _components (organized by section)
src/data/       # Static JSON (profile, skills, experience, projects)
src/lib/        # Typed data getters, animations, skill icons
src/shared/     # Config, SEO utils
```

Content is edited directly in `src/data/*.json`. Pages call typed getters from `src/lib/data.ts` in Server Components.

## Commands

```bash
bun run dev --filter=hector-portfolio
bun run build --filter=hector-portfolio
bun check --filter=hector-portfolio && bun ts --filter=hector-portfolio
```

## Documentation

- [Spec](./docs/SPEC.md) · [Design](./docs/design.md)
- [SEO](./docs/seo.md) · [Lighthouse](./docs/lighthouse.md)
- Personal docs are kept in the repo's root `docs/private/`, which is gitignored and never committed.
