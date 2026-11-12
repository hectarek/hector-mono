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

That stops the build, not the deployment. On a project without Vercel's own skipping, every push still creates a deployment, and the step cancels it about 15 seconds into the build. On 2026-11-12, Hector reported the allowance still running out on busy days. The account's 50 latest deployments (2026-11-10 14:40 to 2026-11-11 10:03 Eastern, through the Vercel MCP's `list_deployments`) were 32 Canceled, 16 Ready and 2 Error, from 13 pushes. Not every cancel counted. hectors-recipes and job-search also had Skip deployment on, so Vercel skipped their unaffected pushes before any build, and a skip lists as Canceled too. relationship-meter and main-portfolio didn't, so every push cost a counted, canceled deployment in each (found the same day by hectarek/hector-mono#118).

## Guidance

What Vercel's docs say, read 2026-11-12:

- **The limit.** Hobby allows 100 deployments created per day, counted for the whole account rather than per project, plus 100 an hour and 60 per five minutes, with one concurrent build (`vercel.com/docs/limits`).
- **An ignored build counts.** The Ignored Build Step's note says a canceled build counts as a full deployment, since it runs a command in the build step, and takes a concurrent build slot (`vercel.com/docs/project-configuration/project-settings`).
- **Vercel's own skipping doesn't count.** "Skipping unaffected projects" decides from the package graph and lockfile which projects a commit affects. It supports npm, yarn, pnpm and Bun workspaces, works only for projects connected to GitHub, and takes no build slot. It's on by default for new monorepo projects, and turned on for an existing one under Settings, Build and Deployment, Root Directory, "Skip deployment" (`vercel.com/docs/monorepos`). Vercel's changelog post "Skipped monorepo deployments no longer count against limits" says those skips don't count.
- **Root files deploy every app.** A change to any file outside a workspace package (the root `docs/`, `AGENTS.md`, `.claude/`, `.github/`, the root configs, or an app folder with no `package.json` yet) is global, so every project deploys, skipping or not (`vercel.com/docs/monorepos#requirements`).
- **Telling the two apart.** A skip lists as Canceled with no build time and a link to `#skipping-unaffected-projects`, and Vercel's GitHub comment files it under Skipped. A cancel by the Ignored Build Step links to `#ignored-build-step` after about 15 seconds of build, and the comment calls it Ignored.

So:

1. **A new app** keeps Skip deployment on and gets no `ignoreCommand`. `apps/community-game-library/docs/build-plan.md` (KTD20) does this, on its spec branch at the time of writing.
2. **The existing apps:** hectarek/hector-mono#118 (open when this was written) turns Skip deployment on for relationship-meter and main-portfolio and removes all four `ignoreCommand`s, with `docs/monorepo-guide.md` and the new-app checklist.
3. **Keep pushes few.** One PR holds a batch of related units or tasks with a commit each, and is pushed when the batch is ready for review (root `AGENTS.md`, since 2026-11-12). A push that touches a root file still deploys every app.

Both settings can be on for one project, and the skip comes first: Vercel decides before a build starts, so the step runs only on pushes it didn't skip. The Vercel MCP's project responses leave the setting (`enableAffectedProjectsDeployments`) out, so read it in the dashboard, or from a push that touches one app.

## Why This Matters

The `ignoreCommand` saves build minutes, and it looked like the fix for the rate limit, so the limit kept coming back with no visible cause. And because a skip and a cancel both list as Canceled, counting Canceled deployments overstates what the step costs.

## When to Apply

- Any Vercel project in this account, whenever deploys are rate limited or a new app is added.

## Examples

A day's pushes, before and after, with four projects:

- An `ignoreCommand` on every project and no Skip deployment: a push that touches one app costs four deployments (one Ready, three canceled by the step).
- Skip deployment on every project: the same push costs one, and the three skips aren't counted.
- A push that touches a root file costs four either way.

## Related

- `docs/monorepo-guide.md`, "Building only the apps that changed": how the projects skip pushes (described the `ignoreCommand` until #118).
- `.claude/skills/new-app/SKILL.md`, step 5: a new app's Vercel setup (told it to copy the `ignoreCommand` until #118).
- `docs/solutions/developer-experience/neon-operations-log-is-the-record-of-database-wake-times.md`: the other limits the Hobby and Neon Free plans set on what can be seen.
