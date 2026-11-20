---
title: A new Vercel project's first deployment went to production from a branch push
date: 2026-11-20
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
retire_when: "Vercel documents how a new project's first git deployment is targeted, or a new project's first push from a non-default branch is seen landing in preview; search Vercel's docs with the Vercel MCP's search_vercel_documentation, and read a first deployment's target with get_deployment"
tags: [vercel, deployments, environment-variables, new-project, preview, production]
---

# A new Vercel project's first deployment went to production from a branch push

## Context

On 2026-11-20 a throwaway Vercel project, `community-game-library-spike`, was made through the Vercel MCP's `create_project` for a spike on a branch. It was linked to `hectarek/hector-mono` with its root at `apps/community-game-library-spike`. Its three variables (`DATABASE_URL`, `NEON_AUTH_BASE_URL` and `NEON_AUTH_COOKIE_SECRET`) were set for Preview only, since the spike was never meant for production.

The next push, of the branch `spike/community-game-library-solid` at `78828e0`, made the project's first deployment, about 35 s after the project existed. The MCP's `get_deployment` showed `source: git`, `githubCommitRef: spike/community-game-library-solid` and `target: production`, with the project's production addresses, such as `community-game-library-spike.vercel.app`, among its aliases.

With no Production variables, the app ran in the mode it falls back to without them: sign-in off, `/account` unguarded, and search on an in-memory database, which took 5.78 s for the first search. Nothing failed, so only the deployment's target explained it.

Variables added afterwards didn't reach that deployment, as [apps/job-search/AGENTS.md](../../../apps/job-search/AGENTS.md) already records for any changed variable. A preview deployment made afterwards with the MCP's `create_deployment` (a `gitSource` and no `target`) picked up the Preview variables and worked.

Why the branch push became production wasn't confirmed. A search of Vercel's docs through the MCP's `search_vercel_documentation` on 2026-11-20 found nothing on it. The one condition seen was that the project had no production deployment yet.

## Guidance

- Before a new project's first push, set its variables for every environment the push could land in, Production included. Production values here come from Hector and never pass through a Claude session (the Community Game Library's [build plan](../../../apps/community-game-library/docs/build-plan.md), KTD1), so an agent that makes a project asks Hector to set Production's variables before the first push.
- Read the first deployment's target with `get_deployment` before treating it as a preview.
- Point a custom domain at the project only after a deployment from `main`, since a project's production addresses serve whatever its production deployment is.

## Why This Matters

The Community Game Library's build plan has Hector make its Vercel project and point communitygamelibrary.com at it before Batch 1's first push (H7). H7 lists Production's variables in that setup, but H3 only needs the production database before Batch 1 merges. If Production's variables wait for the merge and Batch 1's first push lands in production the way the spike's did, the public domain serves a feature branch's build with none of them.

## When to Apply

- Making any Vercel project here whose first deployment will come from a branch push, through the dashboard or the MCP.

## Related

- [vercel-counts-builds-an-ignore-command-cancels.md](./vercel-counts-builds-an-ignore-command-cancels.md): how the projects here skip pushes that don't touch their app.
- [solid-2-spike.md](../../solid-2-spike.md): the spike that ran into this.
