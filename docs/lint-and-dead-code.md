# Lint and dead code

How Biome, Oxlint and Fallow are set up across the monorepo, with their exemptions and gotchas. The root [AGENTS.md](../AGENTS.md#lint-and-dead-code) keeps the rules every task needs.

## Biome
- `@repo/biome-config` runs Biome's full recommended set. The one rule off is `useLiteralKeys`: the portfolio typechecks with `noPropertyAccessFromIndexSignature`, which requires `process.env["X"]`, the opposite of what the rule asks.
- Warnings fail like errors: the recommended set reports some rules only as warnings (`noExplicitAny`, for one), so every `lint` script runs `biome check --write --error-on-warnings`.
- The root `biome.json` exempts two things that can't satisfy specific rules, each listed by rule: shadcn registry source in `packages/ui/src/components/` (not the hand-written `file-drop-zone` and `theme-provider`), which an update would overwrite, and `next/og` image files (`apps/hectors-recipes/app/_lib/app-icon.tsx`), which can only draw a plain `<img>`.
- Remote images go through `next/image` with `unoptimized` when they can come from any site (recipe photos): it serves them as they are, needs no `remotePatterns`, and uses no image-optimization quota.

## Design-System Lint
`@shadcn/lint` runs on [Oxlint](https://oxc.rs/docs/guide/usage/linter/js-plugins.html) to check how apps consume `@repo/ui`. Biome still owns everything else; Oxlint's own rule categories are off and it runs only the rules listed in its config (these and the **Architecture Lint** ones), so the two never report the same thing.
- Config: root `.oxlintrc.json`. Every rule is listed there on purpose — relax from the full set, don't add rules back one at a time.
- Each app's `lint` script is `biome check --write --error-on-warnings && oxlint --deny-warnings .`, so Turbo filtering and CI cover it. Oxlint finds the root config from any app directory.
- Rules: `no-restyle` (restyling `@repo/ui` components through `className`), `no-raw-colors`, `no-unknown-classes`, `require-static-classes`, `no-inline-styles`, `no-arbitrary-values`.
- Rules are `warn` at the root and `error` in an `overrides` entry listing every app, which keeps each rule's options (`no-restyle` keeps `allow: ["layout"]`). `--deny-warnings` makes a warning fail too, so a design-lint finding fails the app's `lint` script, `bun check` and CI either way (the build doesn't run Oxlint).
- Deliberate relaxations, both in `overrides`: all rules off for `packages/ui/src/components/**` (shadcn registry source; the two hand-written files there, `file-drop-zone` and `theme-provider`, pass the rules without it), and `no-arbitrary-values` off for `hector-portfolio` (its custom type scale; that override comes after the apps' `error` one, so it still wins). Tests are in `ignorePatterns` — `cn()` tests use fake class names.
- Prefer the fix the error suggests (a variant or size prop, a theme token). For a real exception: `// oxlint-disable-next-line shadcn/<rule> -- reason`.
- Loosening a rule for a component is a design-system decision: use `contracts` in `.oxlintrc.json` rather than scattering disable comments.

## Architecture Lint
Oxlint enforces the complex apps' layer rules ([clean-architecture.md §5](clean-architecture.md#5-layer--import-rules)) with `no-restricted-imports`, one `.oxlintrc.json` override per layer listing `stash`, `hectors-recipes` and `hectors-tools`. A new complex app adds its paths to every layer entry (the `new-app` skill).
- Entities, application and interface-adapters are allow-lists: only `zod`, the layer itself and the layers inside it. Infrastructure and `app/` are deny-lists, since they also use vendor SDKs and the framework.
- `app/` (with `proxy.ts`) is strict: it imports entities, `@/di` and other `app/` files, never `src/application`, `src/interface-adapters`, `src/infrastructure`, `db/` or `drizzle-orm`. Root `lib/` is allowed only in the auth route and auth page, through the last override.
- A violation is a design problem: declare an interface in application and implement it in infrastructure, or call a controller through `getInjection`. Never widen a pattern to make it pass.
- `import/no-cycle` runs for every app. `plugins: ["import"]` replaces Oxlint's default plugin set, which costs nothing since every rule is listed explicitly.
- Writing patterns: keep each layer to one `group` with the relative escapes (`../**/infrastructure/**`) at the end, re-banning what `!../**` allowed. Oxlint leaks a `!` negation into the rule's other pattern objects. `@/src/*` doesn't match nested paths (write `**`), and regex lookahead isn't supported. A later override replaces a rule's options rather than merging them.

## Dead Code
[Fallow](https://fallow.tools/docs/) (root devDependency, pinned: it releases often) builds the whole repo's import graph to find what nothing uses, which Biome and tsc can't see one file at a time. `bun run dead-code` runs it, and so does CI.
- Config: root `.fallowrc.json`. It fails on unused files, exports, types, enum and class members and dependencies, unlisted or misplaced dependencies, Next.js server/client mistakes (a `"use client"` file exporting `metadata`, a misplaced directive, a route collision), CSS drift, and a `fallow-ignore` without a reason. Import cycles are off here because Oxlint owns them (**Architecture Lint**).
- An export used only in its own file is a finding: drop the `export`. If the code is then unused, delete it, unless it's a feature that was never wired up: then wire it or ask. Check for one before deleting: a doc that says it isn't applied yet, a comment saying what should call it, or a UI field nothing reads.
- There's no baseline: the repo is at zero findings, and any finding fails.
- Config exceptions, each for a file Fallow can't see being used: `apps/hectors-recipes/scripts/*.ts` is an entry point (Playwright runs one and the other runs by hand), `@repo/biome-config` is resolved by Biome's `extends`, `generateStaticParams` in a route handler is called by Next.js, and so are `ensureStatic` and `instant` in a layout or page (route segment configs from Next.js 16.4 that Fallow's Next.js plugin doesn't know yet, as of 3.32.0).
- Before deleting something Fallow reports, confirm it: `bunx fallow dead-code --trace <file>:<export>`.
- Held at 3.31.0 (2026-10-08): 3.32.0 doesn't count a file passed to `bun test --preload` in a `package.json` script as an entry point, so it reports recipes' screen-test preload (`tests/_support/dom.ts`) as unused. Try each new release with `bun run dead-code` before moving off 3.31.0.
