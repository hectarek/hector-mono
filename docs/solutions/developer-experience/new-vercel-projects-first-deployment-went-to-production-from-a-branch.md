---
title: A new Vercel project's first deployment went to production from a branch push
date: 2026-11-20
last_updated: 2026-11-22
category: developer-experience
module: "Vercel projects, for a new app in hector-mono"
problem_type: developer_experience
component: infrastructure
severity: medium
root_cause: incomplete_setup
resolution_type: environment_setup
applies_when:
  - "Making a Vercel project for an app before main has the app, so its first deployment comes from a branch push"
  - "A new project has variables for Preview but not yet for Production"
  - "A custom domain points at a project that has no production deployment yet"
symptoms:
  - "The first deployment from a feature branch's push shows target production"
  - "The project's production addresses serve the branch's build"
  - "An app that runs without its variables comes up with sign-in off and no database, and nothing fails"
  - "A production-only build step, such as a migration check, fails the branch's first deployment"
retire_when: "Vercel documents how a new project's first git deployment is targeted, or a new project's first push from a non-default branch is seen landing in preview; search Vercel's docs with the Vercel MCP's search_vercel_documentation, and read a first deployment's target with get_deployment"
tags: [vercel, deployments, environment-variables, new-project, preview, production]
---

# A new Vercel project's first deployment went to production from a branch push

## Context

On 2026-11-20 a throwaway Vercel project, `community-game-library-spike`, was made through the Vercel MCP's `create_project` for a spike on a branch. It was linked to `hectarek/hector-mono` with its root at `apps/community-game-library-spike`. Its three variables (`DATABASE_URL`, `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`) were set for Preview only, since the spike was never meant for production.

The next push, of the branch `spike/community-game-library-solid` at `78828e0`, made the project's first deployment, about 35 s after the project existed. The MCP's `get_deployment` showed `source: git`, `githubCommitRef: spike/community-game-library-solid` and `target: production`, with the project's production addresses, such as `community-game-library-spike.vercel.app`, among its aliases.

With no Production variables, the app ran in the mode it falls back to without them: sign-in off, `/account` unguarded, and search on an in-memory database, which took 5.78 s for the first search. Nothing failed, so only the deployment's target explained it.

Variables added afterwards didn't reach that deployment, as [apps/job-search/AGENTS.md](../../../apps/job-search/AGENTS.md) already records for any changed variable. A preview deployment made afterwards with the MCP's `create_deployment` (a `gitSource` and no `target`) picked up the Preview variables and worked.

It happened again on 2026-11-21 with the Community Game Library's own project, `community-game-library`, made the same way through `create_project`, rooted at `apps/community-game-library`, with Skip deployment on and Production's variables entered before the first push. The first push, of `feat/community-game-library-b1-foundation`, made a deployment with `target: production` (`dpl_73WX6UY1SfH7sJBzKYkxWAuzHF6J`). This one failed instead of serving. The app's `build` script runs [scripts/require-migrations.ts](../../../apps/community-game-library/scripts/require-migrations.ts) before `next build`, and on a production build (`VERCEL_ENV` is `production`) that check stops the build while production's database lacks a migration the code needs. Production had no migrations yet, so the deployment ended in `ERROR` and the production addresses served nothing.

A preview made next with `create_deployment` (a `gitSource` and no `target`) came up `READY` and turned the pull request's Vercel check green. The branch's later pushes (`a3243f4`, `8d93685`) went to preview on their own, with `target: null`, at the branch alias. Once production had its migration and the pull request merged on 2026-11-22 (hectarek/hector-mono#127), main's push made the first working production deployment (`dpl_GwuhdYaoT923gPtJbPuwcfuB7FKA`).

Why a new project's first branch push becomes production wasn't confirmed. A search of Vercel's docs through the MCP's `search_vercel_documentation` on 2026-11-20 found nothing on it. Both projects had no production deployment yet at their first push. Before the second project's second push it had both a failed production deployment and a ready preview, so either could be what sent later pushes to preview.

## Guidance

- Expect it: both projects made here through the MCP sent their first branch push to production.
- Before a new project's first push, set its variables for every environment the push could land in, Production included. Production values here come from Hector and never pass through a Claude session (the Community Game Library's [build plan](../../../apps/community-game-library/docs/build-plan.md), KTD1), so an agent that makes a project asks Hector to set Production's variables before the first push.
- A build step that runs only on production builds and fails without the app's production setup turns that stray deployment into a harmless `ERROR`. The Community Game Library's migration check does this: it refuses a production build whose database lacks a migration, and one with no `DATABASE_URL`. Without such a check, as in the spike, the branch's build serves at the production addresses.
- Read the first deployment's target with `get_deployment` before treating it as a preview. If it went to production, make a preview with `create_deployment` (a `gitSource` and no `target`) for the pull request's check. Later pushes went to preview on their own.
- Point a custom domain at the project only after a deployment from `main`, since a project's production addresses serve whatever its production deployment is.

## Why This Matters

The Community Game Library's build plan has Hector make its Vercel project just before Batch 1's first push with Production's variables already in, and point communitygamelibrary.com at it only after Batch 1 merges and main deploys (H3, H7). That order held when the first push did land in production: the deployment failed at the migration check, and no domain pointed at the project. A project with Preview's variables alone, a domain already pointed, and no production-only check would have served a feature branch's build on the public domain with none of production's settings.

## When to Apply

- Making any Vercel project here whose first deployment will come from a branch push, through the dashboard or the MCP.

## Related

- [vercel-counts-builds-an-ignore-command-cancels.md](./vercel-counts-builds-an-ignore-command-cancels.md): how the projects here skip pushes that don't touch their app.
- [solid-2-spike.md](../../solid-2-spike.md): the spike that ran into this.
- [apps/community-game-library/AGENTS.md](../../../apps/community-game-library/AGENTS.md), Environments: the app's Vercel project, its production migrations and the build's migration check.
