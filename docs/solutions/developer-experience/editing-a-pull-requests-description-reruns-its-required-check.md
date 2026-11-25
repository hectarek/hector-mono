---
title: Editing a pull request's title or description reruns its required CI check, so the merge waits for it
date: 2026-11-25
category: developer-experience
module: "GitHub CI (.github/workflows/ci.yml) and merging pull requests, for every app in hector-mono"
problem_type: developer_experience
component: development_workflow
severity: low
applies_when:
  - "A pull request's title or description is edited after its checks pass, before it merges"
  - "`gh pr merge` refuses with \"the base branch policy prohibits the merge\" although every check passed a moment before"
root_cause: missing_workflow_step
resolution_type: workflow_improvement
tags: [github-actions, ci, pull-request, merge, branch-protection, gh-cli]
---

# Editing a pull request's title or description reruns its required CI check, so the merge waits for it

## Context

`.github/workflows/ci.yml` runs on `pull_request` events of the types `opened`, `synchronize`, `reopened` and `edited`. `edited` is there for a stacked pull request: when its base merges, GitHub retargets it to `main` and sends no other event. GitHub also sends `edited` for a change to the title or description, so each such edit starts a new run of the required check, "Lint, typecheck & test (affected)", on the same head commit. The workflow's comment says so. Nothing an agent reads before editing a pull request does: the root `AGENTS.md` mentions only the retarget.

On 2026-11-25, every check on hectarek/hector-mono#142 had passed and GitHub called it mergeable (`mergeStateStatus` `CLEAN`). Its description was then updated with `gh pr edit --body-file`, to say production had the migration it needed. The next `gh pr merge 142 --merge` failed:

```
X Pull request hectarek/hector-mono#142 is not mergeable: the base branch policy prohibits the merge.
To have the pull request merged after all the requirements have been met, add the `--auto` flag.
To use administrator privileges to immediately merge the pull request, add the `--admin` flag.
```

`mergeStateStatus` had turned to `BLOCKED`, and the required check was pending again. Its previous run on that pull request had taken about three and a half minutes. Vercel's statuses kept their earlier deployments: the edit built nothing there.

## Guidance

- Settle the title and description before the push the merge will rest on. A note that becomes true only after the checks pass, such as a production step done, can be added after the merge, when an edit blocks nothing.
- When the description has to change before the merge, expect the required check to run again, and merge once it passes on the same head commit: `gh pr checks <number> --required`.
- Don't use `--admin` to get past it: main's protection applies to admins too (`enforce_admins`).
- Leave `edited` in the workflow. Its comment gives the reason: filtering title and description edits out with a job `if` would report the required check as skipped, which GitHub counts as passing.

## Why This Matters

The refusal names branch policy, not a running check, and it came a minute after every check had passed, so it reads as a protection setting. Settling it took four calls (below). A session that doesn't wait on CI then leaves the merge to a later turn.

## When to Apply

- Any pull request in this repo, between its last green run and its merge, whoever merges it.

## Examples

How the rerun was told apart from a policy block, in the order that settled it on 2026-11-25:

```bash
gh api repos/hectarek/hector-mono/rules/branches/main                          # []: no rulesets apply to main
gh api repos/hectarek/hector-mono/branches/main/protection                     # one required check, 0 approving reviews, enforce_admins on
gh pr view 142 --repo hectarek/hector-mono --json mergeable,mergeStateStatus   # MERGEABLE, BLOCKED (CLEAN before the edit)
gh pr checks 142 --repo hectarek/hector-mono --required                        # Lint, typecheck & test (affected)  pending
```

With no rulesets, no review required and no conflict, the pending check is what blocks the merge, and the workflow's `on:` block shows that the edit started it.

## Related

- Root `AGENTS.md`, "Working in parallel": "A PR stacked on another branch gets CI when GitHub retargets it to `main` (the workflow listens for that base change)", which leaves out title and description edits.
