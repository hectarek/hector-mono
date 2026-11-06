---
title: A one- or two-letter error class in production logs is a renamed class; find it in a local build, then name it
date: 2026-11-06
category: developer-experience
module: "apps/job-search, and any app here whose logs name errors by class"
problem_type: developer_experience
component: observability
severity: medium
applies_when:
  - "A production log names an error class with a letter or two (cX, cW) and gives no code"
  - "A library's error class sets no name, so the log falls back to the class's own name, which the build renames"
resolution_type: code_fix
related_components: [database, tooling]
tags: [minification, production-logs, error-class, drizzle, turbopack, debugging]
---

# A one- or two-letter error class in production logs is a renamed class; find it in a local build, then name it

## Context

`apps/job-search` logs an error by its class and code, never its message (`loggable`, `apps/job-search/src/entities/errors/loggable.ts`). The class is the error's `name`, or its constructor's name when the `name` is just `"Error"`. The production build (Turbopack, Next.js 16.4.3) renames classes, so an error that doesn't set its own `name` logs under a made-up one. Repository errors on Vercel logged `errorClass: "cW"` on 2026-10-31 and `"cX"` on 2026-11-06, with no code, and two sessions noted them as unreadable without finding the class.

## Guidance

Find the class in a local production build, then give it a name.

1. **Check that a local build matches production.** Server chunk files are named by content hash. Take a stack trace from the same production logs (a library's own error log often has one), note the chunk files it names (build output in `.next`, such as `[root-of-the-server]__1xiv4b687q_x9._.js` in the server's SSR chunks here), run `next build` locally, and check that those files exist under the same names.
2. **Find the class.** `grep -l -E 'class cX[^a-zA-Z0-9_$]|[^a-zA-Z0-9_$.]cX=class ' .next/server/chunks/ssr/*.js` lists the chunk that defines it. Print the code around the match with a short Python script: in Claude Code's sandbox, `grep` is ugrep, which refused a pattern with a long context window ("exceeds complexity limits").
3. **Read what it is.** Here the chunk held `class cX extends Error{constructor(a,b,c){super(\`Failed query: ${a} params: ${b}\`),this.query=a,this.params=b,this.cause=c,...}}`, drizzle-orm's `DrizzleQueryError` (drizzle-orm 0.45.4, `errors.js`). It wraps every failed query and, unlike drizzle's `DrizzleError`, sets no `name`.
4. **Name it once, where it's logged.** A class the app owns sets `override name`. For a library's class, set the name on its prototype in a module the logging code imports. `apps/job-search/src/infrastructure/drizzle-errors.ts` does it for drizzle, imported for its side effect by the base repository and the transaction manager, the two places that log drizzle's errors:

```ts
import { DrizzleQueryError } from "drizzle-orm/errors";

DrizzleQueryError.prototype.name = "DrizzleQueryError";
```

Its test (`apps/job-search/tests/src/infrastructure/drizzle-errors.test.ts`) stands a subclass named `cX` in for the build's renaming and expects `loggable` to give `DrizzleQueryError`. Tests run unminified, so without such a test a test that expects a class name passes while production logs a made-up one.

## Why This Matters

Every failed query reached the logs through drizzle's wrapper, so every database failure in production logged as `cX`. When the code down the cause chain is missing too, as it was here, the log says only that something failed.

Turning off server minification would make every name readable, but Next's docs warn against deploying such a build ("may impact performance", `apps/job-search/node_modules/next/dist/docs/01-app/03-api-reference/06-cli/next.md`, under `--debug-prerender`).

## When to Apply

- A log line names a class with a letter or two.
- A library's error class sets no `name`. Check its source: drizzle's `DrizzleError` sets one, and `DrizzleQueryError` doesn't.

A local build matches production only where nothing changed the chunk. Uncommitted edits change the hashes of the chunks they touch, so check the chunks named in a production stack first. Here, the build that found the class had uncommitted edits elsewhere in the app, and the class's local name matched production's.

## Examples

On 2026-11-06 the unreadable `cX` errors came from page prefetches, and their fix is in `docs/solutions/runtime-errors/partial-prefetching-runs-page-reads-that-fail-in-production.md`. Before the name was decoded, the same errors had been put down to "the prerender pass".

## Related

- `apps/job-search/AGENTS.md`, Logging Rules: a new error class sets `override name`, and a library error that logs under a made-up name is named on its prototype.
