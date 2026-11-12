# U1. Scaffold from recipes

| | |
|---|---|
| Batch | 1, Foundation (`feat/community-game-library-b1-foundation`) |
| Model | Strong: every later unit builds on what this copies |
| After | Nothing. H3 before step 7, H7 before the batch's first push |
| Serves | R44, R45; KTD1, KTD2, KTD11, KTD20 |

An empty `apps/community-game-library` that builds and runs, signed out and signed in, with recipes' infrastructure and test harness, job-search's logging rule, file storage, and a Neon test project behind it.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- `.claude/skills/new-app/SKILL.md`, the new-app checklist. This brief says where it differs.
- `docs/fast-first-open.md`, all of it.
- `apps/hectors-recipes/AGENTS.md`: Architecture, Cache Components, Backend Rules, Testing, Auth Rules, Logging Rules, Deploying.
- `apps/job-search/AGENTS.md`: Differences from recipes, Logging Rules, Environments.
- [build-plan.md](../build-plan.md): KTD1, KTD2, KTD11, KTD20; H3 and H7.
- Neon's Object Storage docs: `neon.com/docs/storage/get-started`, `buckets` and `authentication`.

## Build

1. **The new-app checklist**, steps 1 to 8 and 10, for a complex app named `community-game-library`:
   - `package.json` with recipes' scripts, `test`, `test:screens` and the `db:` scripts included, and recipes' versions.
   - `tsconfig.json` with `"types": ["bun"]`; `components.json`, `postcss.config.mjs` and the one-line `app/globals.css` (U2 adds the theme).
   - `.oxlintrc.json`: the app's paths in the shadcn rules' override and in every architecture-layer override. Plant a forbidden import (`@/db` in an entity), see `bun check --filter=community-game-library` fail, then remove it.
   - `turbo.json` listing every variable `next build` reads.
   - `vercel.json` with `$schema` only. No `ignoreCommand` (KTD20); U17 adds the schedule.
   - `.env.example` naming every variable: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `ADMIN_USER_ID`, the storage endpoint, region, access key id and secret (names as Neon's quickstart gives them, prefixed `STORAGE_`), `CRON_SECRET` and `LOG_LEVEL`.
   - `bunfig.toml` with the test preload, and `.claude/launch.json` with `community-game-library` on port 3102.
   - The root `AGENTS.md` Monorepo Structure block and the README's apps table.
   - Biome formats Markdown, padding its tables. Once the app is a package, the first `bun check` reformats every file in `docs/` and `docs/units/`, as it did job-search's spec. Commit that reformat in this unit, so later diffs show only real changes.
2. **Copy from `apps/hectors-recipes`**, renamed for this app:
   - `lib/auth/server.ts`, with `cookies.sessionDataTtl: 86400` (KTD2); `lib/logger.ts`; `db/index.ts`; `proxy.ts`, sending signed-out requests to `/welcome` except `/welcome` and `/auth/*` (later units add theirs)
   - `app/(api)/api/auth/[...path]/route.ts`, `app/actions/shared.ts`, and in `app/_lib/`: `call-action.ts`, `current-user.ts`, `safe-redirect.ts`, `auth-paths.ts`, `use-closes-on-leave.ts`
   - `app/_components/back-link.tsx` and `action-form.tsx`
   - `src/entities/errors/common.ts`, `src/entities/week.ts` with its test
   - `src/infrastructure/repositories/base.repository.ts`, and in `src/infrastructure/services/`: `neon-auth`, `transaction-manager` and `console-logger`, each with its mock
   - `di/container.ts`, `di/types.ts`, and `di/modules/` for authentication, logger and transaction
   - `tests/_support/` (`preload`, `next`, `app`, `database`, `controller`, `dom`, `focus`, `form`, `static-imports`), `tests/di/container.test.ts`, `tests/app/layout.test.ts`
   - `scripts/check-test-database.ts`, checking for the comment `community-game-library-test`
   
   Leave out Ably, the AI reader, the page and PDF fetchers, spaces and every recipes feature, and take their lines out of the copied container, preload and tests.
3. **Logging (KTD1).** Copy `src/entities/errors/loggable.ts` from `apps/job-search`, and log through it in the transaction manager, `BaseRepository.handleError`, `toActionError` and the auth route, as job-search's Logging Rules describe.
4. **File storage (KTD11).** `IFileStorage` in `src/application/services/` (`put(bucket, key, bytes, contentType)`, `remove(bucket, key)`, `signedUrl(bucket, key, seconds)`, `publicUrl(bucket, key)`); `s3-file-storage.service.ts`, which imports `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner` inside its methods, on first use; `mock-file-storage.service.ts`; `di/modules/file-storage.module.ts`. The bucket names are constants: `profile-photos` and `catalog-images`. Add both packages to the container test's kept-out list.
5. **The admin (KTD1).** `di/modules/access.module.ts` reads `ADMIN_USER_ID`, and `src/application/use-cases/admin/require-admin.ts` refuses anyone else with recipes' `UnauthorizedError`. A missing or malformed id makes nobody the admin.
6. **Placeholder pages** under Cache Components' rules (each reads the session first): `app/layout.tsx` with no `ThemeProvider` (KTD12), `/welcome` showing the app's name, `(main)/layout.tsx` and `(main)/page.tsx` with a "Library" heading for a signed-in member, `error.tsx` and `not-found.tsx`.
7. **The test project**, with H3's OK. Through the Neon MCP:
   - create `community-game-library-test` in AWS US East (N. Virginia), with Neon Auth on and trusting localhost
   - run `COMMENT ON DATABASE neondb IS 'community-game-library-test'`
   - make the two buckets: `profile-photos` private, `catalog-images` public-read
   - make a storage credential
   
   Write the test project's values into the app's local `.env`, and never a production value.
8. **The app's `AGENTS.md`**, modelled on recipes': Overview (linking this spec and `docs/units/`), Stack, Architecture (the code map's tree, as far as it's built), Differences from recipes (KTD1), Cache Components (recipes' rules), Backend Rules, Auth Rules, Logging Rules, Environments (the test project, production in Vercel only, ports 3102 and 3302), Testing, Commands, Before Finishing.
9. **Vercel (after H7).** Push only when the batch is done. On that push, check that the project builds. Then check, on a later push that touches only another app, that this project shows as skipped rather than canceled.

## Not in this unit

The theme, fonts and components (U2). Any table (U3). The real sign-in pages (U5). The service worker (U23). The daily run's schedule (U17).

## Tests

- Proxy: a page without a session cookie goes to `/welcome?redirectTo=…`; `/welcome` and `/auth/*` pass; a server action without a session is answered as recipes' proxy answers it.
- The copied `week.ts` tests.
- The container test: neither `@aws-sdk` package loads when the container starts.
- The layout test: the root and `(main)` layouts don't reach Neon's sign-in kit.
- File storage, on the mock: `put`, then `signedUrl` and `publicUrl` give addresses with the key.

## Done when

- [ ] `bun check --filter=community-game-library && bun ts --filter=community-game-library` pass, and the planted import failed before it was removed
- [ ] `bun run dead-code` passes
- [ ] `bun run test --filter=community-game-library` passes
- [ ] On the dev server (port 3102), a signed-out visit to `/` lands on `/welcome`
- [ ] The test project exists in AWS US East, with Neon Auth, the comment and both buckets, and `.env` holds only its values
- [ ] `.env.example` and `turbo.json` list every variable, and `vercel.json` has no `ignoreCommand`
- [ ] The app's `AGENTS.md`, the root structure block, the README's table and `.claude/launch.json` are updated
- [ ] Committed as `feat(community-game-library): U1 scaffold from recipes`, and the task's notes say what was checked
