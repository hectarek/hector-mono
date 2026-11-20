# Solid 2.0 for an app here: what a spike found

In November 2026 a slice of the Community Game Library was built on Solid 2.0, to see what moving an app here off React and Next.js would take. The slice ran on Vercel, with Neon and Neon Auth. The app stayed on React and Next.js (decided 2026-11-20): every component would have sat on a component library still in alpha, and three of the stack's packages were pre-release. Start here if Solid comes up again.

## The code

- **Where:** the branch `spike/community-game-library-solid`, which never merges. The app is `apps/community-game-library-spike/`, in commits `2f9b24d` (the app) and `78828e0` (the Vercel build). Outside the app, the branch changes only `bun.lock` and `.claude/launch.json` (a dev server on port 3109). The file paths on this page are inside the app's folder on that branch; none of them is on `main`.
- **What it has:** search (screen B10) and a game's page (B5) on the clean-architecture layers, an ask-to-borrow sheet on Kobalte, and sign-up with an emailed code, sign-in, sign-out and a guarded `/account` page through Neon Auth.
- **Running it:** `bun install`, then `bun run --cwd apps/community-game-library-spike dev`. Without a `.env` it needs no services: search reads PGlite in memory, seeded with six fictional games, and sign-in is off (`/api/auth/*` answers 404 and `/account` isn't guarded). The variables are declared in `env.ts`: `DATABASE_URL`, `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`. Its `.env.example` is still the template's.
- **Tests,** from the app's folder: `bun test tests/catalog.test.ts` runs the use cases on PGlite with `pg_trgm` (6 tests). The screen test runs under Vitest (`bun run test`), or under bun:test with `bun test --conditions browser --preload ./tests/screens/dom.ts --preload ./tests/screens/solid-jsx.ts tests/screens`.
- **From Solid's `fullstack` template:** the app's `README.md`, which explains server functions, single-flight mutations, the typed environment and the deployment recipes, and its `AGENTS.md`, Solid's 2.0 primer for agents.
- **Versions:** `solid-js` and `@solidjs/web` 2.0.3, `@solidjs/vite-plugin` 3.0.1 (start mode), `@solidjs/router` 2.0.1, `filesystem-routing` 0.5.0, `nitro` 3.0.261103-rc, `@kobalte/core` 2.0.0-alpha.5, `@solidjs/testing-library` 1.0.0-rc.2, `@neondatabase/auth` 0.7.0-beta and Vite 8.3.8.

## The four open questions

1. **Hosting on Vercel.** Start mode (`@solidjs/vite-plugin`) has no Vercel adapter of its own; Nitro v3 fills in. `nitro({ serverEntry: false })` after `solid()` in `vite.config.ts` finds Solid's request handler, and Nitro's Vercel preset writes `.vercel/output` with one Node 24 function that streams. Nitro picks that preset when `VERCEL` is set at build time, or `NITRO_PRESET=vercel` locally. The build took 0.3 s locally and about 38 s on Vercel, 28 s of it installing.
2. **Neon Auth's components are React-only.** Its server toolkit, `@neondatabase/auth/server`, works without them:
   - `src/server/auth.ts` wires `createAuthServer` to Solid's request event, in about 40 lines.
   - `src/routes/api/auth/[...path].ts` proxies Neon Auth's endpoints, so its cookies are the app's own.
   - `src/middleware.ts` guards `/account` with `processAuthMiddleware`.
   - The sign-up, code and sign-in screens are the app's own forms, posting to server functions in `src/lib/account.ts`.

   Tried: sign-up, the emailed code, the automatic sign-in after it, the account page and the guard. Not tried: sign-out, a second sign-in, and any sign-in on Vercel, so cookies set through Nitro there are unverified.
3. **Better Auth's Solid client supports Solid 1 only.** The app doesn't need it: every auth call runs on the server, and the browser loads no auth code. The session cookies are `__Secure-` prefixed, httpOnly and SameSite Lax. A session made through the server toolkit records `node` as its device, so a list of signed-in devices would need the browser's user agent passed on.
4. **Kobalte's Solid 2 release is an alpha.** Its dialog opens, moves focus in and closes from a button, but Escape doesn't close it (2.0.0-alpha.5; no upstream report found on 2026-11-20). `@repo/ui` is React, so every component would sit on Kobalte or be built from scratch.

## Measured

On the spike's preview, from a Mac on 2026-11-20, with curl. Recipes' numbers are from [fast-first-open.md](./fast-first-open.md) (2026-11-10).

| | Spike | Recipes |
| --- | --- | --- |
| JavaScript, compressed | 60 KB (search, the home page), 75 KB (a game's page) | 207 KB (welcome) |
| Cold open, first byte | 0.63–0.68 s | 87 ms, from its prerendered shell |
| Cold open, content complete | 1.26–1.31 s | recipes on screen by 3.5 s |
| Warm, first byte | 0.15–0.24 s | 37 ms |

- **Cold** means a first request after 30 s or more idle, with the database asleep. The Neon MCP's `suspend_postgres_endpoint` put the database to sleep on demand, instead of waiting out its 5 idle minutes. The app logged nothing, so the slow first byte couldn't be split between the function starting and the preview's protection check.
- **Streaming:** Solid sends the page and its `<Loading>` fallback first, and streams the results in when the query returns. Timed per streamed chunk with a warm function and the database asleep, the page came at 0.23 s and the results 0.68 s later.
- **Not like for like:** the spike searched six games and checked no session, while recipes' library checks the session and reads a real library. Recipes' first byte comes from a shell Next.js prerenders; Solid renders every page per request.

## What a switch would change

**Unchanged:** the entities, the use cases, the repository interface and its Drizzle implementation, the ioctopus container, and the use-case tests on PGlite. The layers in [clean-architecture.md](./clean-architecture.md) held.

**Rebuilt:**

- Every UI component, without `@repo/ui`.
- Pages and writes: routes with `query()` reads and `formAction()` server functions, in place of Server Components and server actions.
- The sign-in screens. Neon's sign-in kit is React-only (about 870 KB of JavaScript, per [fast-first-open.md](./fast-first-open.md)).
- The Vercel build, through Nitro's release candidate.
- Screen tests. Bun compiles JSX for React's runtime, so under bun:test the spike runs each `.tsx` file through Solid's compiler in a Bun plugin (`tests/screens/solid-jsx.ts`), with a happy-dom preload. Vitest with Solid's testing library needs neither.
- The lint config. Two shared rules assume Next.js and Tailwind: Biome's `noHeadElement` fires on Solid's `src/Document.tsx`, and Oxlint's `shadcn(no-unknown-classes)` fires on the spike's plain CSS classes. Both were left failing, since a check is never loosened to pass ([AGENTS.md](../AGENTS.md)); scoping them is Hector's call.
- The prerendered shell from [fast-first-open.md](./fast-first-open.md), which is a Next.js feature. The saved copy a service worker keeps on the phone works with either.

**Agents:** Solid 2.0 went stable on 2026-11-17, after the training data of the models that build here, and the 1.x patterns they know are wrong in 2.0. The spike worked from Solid's docs (`https://v2.solidjs.com/llms-full.txt`) and the primer in the app's `AGENTS.md`, which lists the 1.x-to-2.0 corrections.

## Before starting again

- Check the versions above against current releases: a stable Kobalte 2.0 with Escape fixed, a stable Nitro v3 and a stable Solid testing library would each remove a pre-release dependency.
- Rebase the branch on `main`. Outside the app, only `bun.lock` and `.claude/launch.json` conflict.
- Make a Neon project with Neon Auth, allowing localhost and adding the preview's address as a trusted domain.
- Give a new Vercel project its variables for every environment before the first push. The spike's first deployment, from a branch push, went to production, where only preview variables were set, and a deployment never picks up a variable added after it starts.
- Try what the spike didn't: sign-out, a second sign-in, and sign-in on Vercel.
- Settle the two lint rules with Hector before the first pull request.
