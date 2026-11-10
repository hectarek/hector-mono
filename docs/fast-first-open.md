# A fast first open on the free plans

How an app here opens quickly after time away, on Vercel Hobby with a Neon Free database and Neon Auth, from a phone it's installed on. It comes from `apps/hectors-recipes`, which opened slowly and was fixed in its Phases 30 and 31 (`apps/hectors-recipes/docs/ux-plan.md`, D100 to D103, November 2026). Each pattern says what to do, why, and where recipes does it, so a new app can copy it.

## What a cold open waits on

After a quiet spell, everything on the server side is asleep:

- **The database.** Neon Free suspends after 5 idle minutes. A wake took a median 0.46 s, and 1.6–4.6 s once Neon had archived the storage after a day asleep. Neon Auth keeps its sessions in the same database, so a sign-in check waits too.
- **The function.** Vercel Hobby keeps no function warm. Starting a new one took about 1.8–2 s for recipes, the largest single cost of a cold open.
- **The phone.** Every open starts from the network unless something on the phone keeps a copy. Every byte of JavaScript has to download and run before taps work.

Paying fixes the first two (Neon Launch can turn scale-to-zero off; Vercel Pro keeps functions warm). The free fixes don't remove them; they keep the phone from waiting on them.

## The patterns

### 1. Measure before changing anything

Neon's operations log has every wake and how long the database slept; Vercel's runtime logs, within the hour, have when a request arrived and when the function first logged. How to read both: `docs/solutions/developer-experience/neon-operations-log-is-the-record-of-database-wake-times.md`. Recipes' explainer had guessed a function's start at 0.2 s; measured, it was 1.8 s.

### 2. Nothing slow before the first byte

The proxy runs before every page, so it reads cookies and nothing else. A check it can't avoid has to be rare: a cache in front of it saves nothing if it runs out before the usual gap between opens. Neon Auth's signed session copy defaults to 5 minutes. Set it to a day (`cookies.sessionDataTtl: 86400`), which is Better Auth's own `updateAge`, so how long anyone stays signed in doesn't change. Reasons and numbers: `docs/proxy-auth-research.md`, 2026-11 addendum. Recipes: `apps/hectors-recipes/lib/auth/server.ts`.

### 3. A function loads only what every request needs

The DI container imports every adapter, so a vendor SDK only some requests use (an AI SDK, a realtime client, a PDF parser) loads on every cold start unless its adapter imports it on first use. The rule and an example: `docs/clean-architecture.md` §3.4. Recipes' `tests/di/container.test.ts` walks the container's imports and fails if one comes back.

### 4. A request's first reads run in a row

Each read run side by side with another opens its own connection from Neon's serverless pool, and on a cold open the second connection was slower than waiting: recipes' library read 1.35 s side by side and 0.93 s in a row, once the first read had opened the connection. Warm, side by side saved nothing. One cold sample each (2026-11-10), so time it before relying on it either way. Recipes: `loadLibrary` in `apps/hectors-recipes/app/(main)/(library)/page.tsx`.

### 5. Send a library's code only to the pages that use it

A provider in the root layout sends its library to every page. Neon's sign-in kit is about 870 KB of JavaScript, so its `NeonAuthUIProvider` belongs in the layouts of the sign-in and account pages, and the header's account button is a plain link. Recipes' `tests/app/layout.test.ts` walks the shared layouts' imports and fails if the kit comes back.

### 6. Keep a copy of each page on the phone

A small service worker answers a page you've read from a saved copy at once, marks it, and the page brings itself up to date in place. Everything that must be fresh goes to the network: RSC requests, server actions, API calls, forms that save over shared data, sign-in and account pages. Signing out deletes the copies. Each deploy's worker carries the commit, so the browser installs it and it drops the last deploy's caches. A switch turns it all off.

- Write it by hand: Serwist's Turbopack route is for apps without Cache Components, and its defaults fetch pages from the network first (as of November 2026).
- Saving the network's copy in the background, not before answering, keeps a page with no saved copy streaming.
- The cost: each such open runs the page twice on the server, once for the worker's fresh copy and once for the page's refresh.
- Recipes: `apps/hectors-recipes/service-worker/`, `scripts/build-service-worker.ts`, and `SavedCopy` in `app/_components/saved-copy.tsx`; the rules are in its AGENTS.md, under Saved copies.

## What it did for recipes

Measured on production on 2026-11-10, from a Mac (the phone's own check is P31.3 in recipes' plan):

| | Before | After Phase 30 (server) | After Phase 31 (phone) |
| --- | --- | --- | --- |
| The session check before the first byte | on nearly every open: 0.19–0.48 s, plus a wake when the database slept | about once a day | about once a day |
| Welcome's JavaScript | 1,403 KB to run, 424 KB compressed | the same | 631 KB to run, 207 KB compressed |
| A cold open (database asleep, function cold) | not timed | first byte in 87 ms, recipes by 3.5 s | the saved page in 12 ms, all on screen by 33 ms, fresh in place by 3.0 s |
| A page opened again, warm | not timed | first byte in 37 ms | the saved page in 6 ms, all on screen by 18 ms |

## For a new app

- [ ] Measure a cold open first (pattern 1), and keep the numbers in the app's plan.
- [ ] Neon Auth's `sessionDataTtl` is a day (pattern 2).
- [ ] Adapters for SDKs only some requests use import them on first use, with a container import test (pattern 3).
- [ ] A request's first reads run in a row (pattern 4).
- [ ] `NeonAuthUIProvider` only in the sign-in and account layouts, with a layout import test (pattern 5).
- [ ] The service worker, copied from recipes, with the app's own pages in `SAVED_PAGES` and its forms left out (pattern 6). The proxy lets `/sw.js` through signed out.
