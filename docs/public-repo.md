# Public repo

This monorepo is public. Everything tracked in git is readable by anyone, including every past version, so nothing personal or secret is ever committed.

## What stays out, and where it goes

| What | Where | Why |
|---|---|---|
| Secrets (database URLs, API keys, auth secrets) | Each app's `.env`, which is gitignored. Its `.env.example` lists the names with no values. The root `.worktreeinclude` copies the `.env` files into each new Claude Code worktree, under the gitignored `.claude/worktrees/`. | Credentials. |
| Hector's personal docs (the portfolio's dossier, résumé, LinkedIn copy and other working notes) | Outside this repo, on Hector's machine only. `docs/private/`, their old home at the root, stays gitignored. | Personal information. |
| Personal agent settings and worktrees (`.claude/settings.local.json`, `CLAUDE.local.md`, `.claude/worktrees/`) | Gitignored. The shared `.claude/settings.json` is tracked. | Personal approvals and local paths. |
| Local data snapshots and one-off data scripts | Gitignored folders such as `apps/hectors-recipes/.reread/`. | Real user data. |

The portfolio site's content (`apps/hector-portfolio/src/data/*.json`) is tracked: it's what the public site shows.

## Rules

- A new personal doc goes outside this repo from the start. Moving it out later doesn't help: once committed, it stays in history.
- No personal contact details (phone, private email, address) in tracked files.
- Commits are authored with the GitHub noreply address, not a work or personal email.
- Commit messages, pull request titles and descriptions, and review comments are public too, and GitHub keeps a pull request's text after its branch is deleted: no personal details or private-doc content in them.
- A pull request from someone else that changes `.claude/` (settings, hooks, skills) or `.github/workflows/` is code that runs on Hector's machine or in CI: read the change before checking the branch out or approving its workflow run. Claude Code runs a repo's hooks without asking in some cases (a trusted parent folder, `claude -p`).
- If something private is committed by mistake, don't just delete it in a new commit: it stays in history, and pull requests keep a copy. Stop and rewrite history (`git filter-repo`), then ask GitHub Support to purge pull request refs and cached views.

## GitHub settings for a public repo

- Secret scanning and push protection on.
- Dependabot alerts on.
- Private vulnerability reporting on; [SECURITY.md](../SECURITY.md) tells reporters how to use it.
- `main` protected: changes land through a pull request with CI passing. Pull requests merge with a merge commit only (squash and rebase are off), and merged branches are deleted.
- CI's token is read-only (`permissions: contents: read` in `.github/workflows/ci.yml`), and workflows from first-time contributors' forks need approval to run (GitHub's default).
- On Vercel, a pull request from a fork deploys only once Hector authorizes it (see [monorepo-guide.md](./monorepo-guide.md#deploying-from-a-public-repo)).

## History

The history starts at the first public commit (2026-10-01). Earlier work was in a private repo, since deleted, so pull request numbers, branch names and commits named in older docs (such as the recipes [ux-plan.md](../apps/hectors-recipes/docs/ux-plan.md) log) refer to it and don't exist here. Pull request numbers here start again at #1.
