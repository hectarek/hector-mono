---
title: On Vercel's Hobby plan, a build the ignoreCommand cancels still counts as a deployment, so it doesn't protect the daily limit
date: 2026-11-12
category: developer-experience
module: "Vercel deploys, for every app in hector-mono"
problem_type: developer_experience
component: infrastructure
severity: medium
applies_when:
  - "Vercel answers a push or merge with \"Deployment rate limited\", or the account runs out of deployments on a busy day"
  - "Adding an app to the monorepo, or a Vercel project to the account"
  - "Deciding how to keep pushes that don't touch an app from building it"
root_cause: config_error
resolution_type: config_change
related_components: [development_workflow]
retire_when: "Vercel stops counting the deployments an Ignored Build Step cancels, or every project in the account uses Vercel's own Skip deployment with no ignoreCommand; check the Ignored Build Step note on vercel.com/docs/project-configuration/project-settings and each app's vercel.json"
tags: [vercel, hobby-plan, deployment-limit, ignore-command, monorepo, turborepo]
---

# On Vercel's Hobby plan, a build the ignoreCommand cancels still counts as a deployment, so it doesn't protect the daily limit

## Context

On 2026-10-08 the account hit Vercel Hobby's daily deployment limit ("Deployment rate limited — retry in 24 hours"), and merges to `main` stopped reaching production. The answer was an `ignoreCommand` in every deployed app's `vercel.json` (commit 1c9cf38), described in `docs/monorepo-guide.md` under "Building only the apps that changed" and copied by the new-app checklist's step 5:

```json
"ignoreCommand": "bunx turbo@2 query affected --packages hectors-recipes --base \"${VERCEL_GIT_PREVIOUS_SHA:-HEAD~1}\" --exit-code"
```

That stops the build, not the deployment. Every push still creates one deployment in each Vercel project, and each project the push doesn't affect shows its deployment as Canceled. On 2026-11-12, Hector reported the allowance still running out on busy days, and the account's 50 latest deployments (2026-11-10 14:40 to 2026-11-11 10:03 Eastern, through the Vercel MCP's `list_deployments`) were 32 Canceled, 16 Ready and 2 Error, from 13 pushes: about 3.8 deployments per push across the account's four projects.

## Guidance

What Vercel's docs say, read 2026-11-12:

- **The limit.** Hobby allows 100 deployments created per day, counted for the whole account rather than per project, plus 100 an hour and 60 per five minutes, with one concurrent build (`vercel.com/docs/limits`).
- **An ignored build counts.** The Ignored Build Step's note says a canceled build counts as a full deployment, since it runs a command in the build step, and takes a concurrent build slot (`vercel.com/docs/project-configuration/project-settings`).
- **Vercel's own skipping doesn't count.** "Skipping unaffected projects" decides from the package graph and lockfile which projects a commit affects. It supports npm, yarn, pnpm and Bun workspaces, works only for projects connected to GitHub, and takes no build slot. It's on by default for new monorepo projects, and turned on for an existing one under Settings, Build and Deployment, Root Directory, "Skip deployment" (`vercel.com/docs/monorepos`). Vercel's changelog post "Skipped monorepo deployments no longer count against limits" says those skips don't count.

So:

1. **A new app** keeps Skip deployment on and gets no `ignoreCommand`. `apps/community-game-library/docs/build-plan.md` (KTD20) does this, on its spec branch at the time of writing.
2. **The existing apps** move to Skip deployment in a change of their own, which also updates `docs/monorepo-guide.md` and the new-app checklist. That change is pending.
3. **Keep pushes few.** One PR holds a batch of related units or tasks with a commit each, and is pushed when the batch is ready for review (root `AGENTS.md`, since 2026-11-12). Each push costs a deployment in every project until the existing apps move over.

Not verified: whether Skip deployment and an `ignoreCommand` can both be set on one project, and which wins. The Vercel MCP's `get_project` returns a trimmed project without the setting, so read it in the dashboard.

## Why This Matters

The `ignoreCommand` saves build minutes, and it looked like the fix for the rate limit, so the limit kept coming back with no visible cause. With four projects, about 25 pushes in a day spend the 100, wherever they land.

## When to Apply

- Any Vercel project in this account, whenever deploys are rate limited or a new app is added.

## Examples

A day's pushes, before and after, with four projects:

- With `ignoreCommand`: a push that touches one app costs four deployments (one Ready, three Canceled).
- With Skip deployment: the same push costs one; the three skipped projects aren't counted.

## Related

- `docs/monorepo-guide.md`, "Building only the apps that changed": the `ignoreCommand` setup this corrects.
- `.claude/skills/new-app/SKILL.md`, step 5: tells a new app to copy the `ignoreCommand`.
- `docs/solutions/developer-experience/neon-operations-log-is-the-record-of-database-wake-times.md`: the other limits the Hobby and Neon Free plans set on what can be seen.
