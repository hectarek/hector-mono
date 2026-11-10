---
title: A deploy outran its migration, and every query on the new columns failed until the migration ran
date: 2026-11-10
category: runtime-errors
module: "apps/job-search, and any app here whose database migrations run apart from its deploy"
problem_type: runtime_error
component: infrastructure
symptoms:
  - "Right after a production deploy, pages and tools that read a table or column the PR added fail, while the rest of the app works"
  - "Production logs DrizzleQueryError with SQLSTATE 42703 (undefined column) from the repositories, and the actions answer unexpected"
  - "The database's drizzle.__drizzle_migrations holds fewer migrations than the deployed commit's journal"
root_cause: missing_workflow_step
resolution_type: tooling_addition
severity: high
related_components: [database, development_workflow]
tags: [migrations, drizzle, neon, vercel, deploy, turborepo, production, outage]
---

# A deploy outran its migration, and every query on the new columns failed until the migration ran

## Problem

`apps/job-search` migrates production apart from its deploy: Hector runs the migration from his terminal, or Claude applies it through the Neon MCP at his request. A PR whose code reads a new table or column has to wait for its migration, and three times it didn't:

- hectarek/hector-mono#65's migration ran ten minutes after its deploy.
- hectarek/hector-mono#92's ran three minutes after, while This week read the missing `blocks` table.
- hectarek/hector-mono#107 merged before its OK to migrate and deployed at once. Every read and write of jobs and settings failed for about 90 minutes, Claude's MCP tools included.

## What didn't work

After #92, `apps/job-search/AGENTS.md` got a rule: ask for the OK and apply the migration when the PR is ready, before the merge, and open the PR's description with the migration its merge needs. #107 did all of that. Its description's first line named the migration, and the OK question was waiting. The merge still came first. A rule that someone has to remember at merge time fails on the day they don't, and nothing stopped the deploy.

## Root cause

Nothing between the merge and the live deploy checked that production's database had the migrations the new code needs. Vercel built and promoted the commit as soon as it landed on `main`.

## Solution

A check now runs where the deploy happens. `apps/job-search/package.json`'s build runs it first:

```json
"build": "bun scripts/require-migrations.ts && next build"
```

`apps/job-search/scripts/require-migrations.ts` checks only when `VERCEL_ENV` is `production`. It reads `drizzle.__drizzle_migrations` through `DATABASE_URL` and lists the journal's migrations the database hasn't recorded:

```ts
export async function missingMigrations(db: Database): Promise<string[]> {
  const recorded = new Set(
    (await recordedMigrations(db)).map(({ hash }) => hash),
  );
  return journalMigrations()
    .filter(({ hash }) => !recorded.has(hash))
    .map(({ tag }) => tag);
}
```

Any missing migration fails the build. A failed Vercel build is never promoted, so the live deploy keeps serving the old code, which works on the old schema. Apply the migration, then redeploy: the failed deployment's Redeploy in Vercel, or the next commit that changes the app.

The rest of the design:

- **Failing closed is safe.** A failed production build changes nothing users see. So the check also fails when `DATABASE_URL` is missing or the query errors.
- **Extra migrations pass.** The check doesn't fail when the database records a migration the journal lacks. That's older code deployed again on a database migrated past it, which works because migrations only add before the code that needs them ships.
- **Previews and local builds skip the check.** They still read no database at build time. The output names migration tags only, never the URL or an error's message.
- **Shared readers.** `apps/job-search/scripts/lib/migrations.ts` holds the journal and recorded-migration readers that `apps/job-search/scripts/migrate-production.ts` also uses, so the hashes match what drizzle records.
- **Turborepo and `VERCEL_ENV`.** Vercel detects Turborepo and runs `turbo run build`, whose strict mode passes a task only the variables `turbo.json` lists, plus built-in ones. In Turborepo 2.11, an experiment showed `VERCEL_ENV` reaching the task without being listed. The app's `turbo.json` lists it anyway, beside `DATABASE_URL`, so the build cache keys a production build apart from a preview's.

`apps/job-search/tests/scripts/require-migrations.test.ts` covers the check on PGlite: a database that has run the whole journal, one missing the newest two migrations, one with none, and one that records a migration the journal lacks.

## Prevention

For an app here whose database migrates apart from its deploy: put the check in the production build, failing closed, rather than in a rule someone has to remember when they merge.
