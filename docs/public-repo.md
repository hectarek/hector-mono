# Public repo

This monorepo is public. Everything tracked in git is readable by anyone, including every past version, so nothing personal or secret is ever committed.

## What stays out, and where it goes

| What | Where | Why |
|---|---|---|
| Secrets (database URLs, API keys, auth secrets) | Each app's `.env`, which is gitignored. Its `.env.example` lists the names with no values. | Credentials. |
| Hector's personal docs (the portfolio's dossier, résumé, LinkedIn copy and other working notes) | `docs/private/` at the root, which is gitignored. They exist only on Hector's machine. | Personal information. |
| Local data snapshots and one-off data scripts | Gitignored folders such as `apps/hectors-recipes/.reread/`. | Real user data. |

The portfolio site's content (`apps/hector-portfolio/src/data/*.json`) is tracked: it's what the public site shows.

## Rules

- A new personal doc goes in `docs/private/` from the start. Moving it there later doesn't help: once committed, it stays in history.
- No personal contact details (phone, private email, address) in tracked files.
- Commits are authored with the GitHub noreply address, not a work or personal email.
- If something private is committed by mistake, don't just delete it in a new commit: it stays in history, and pull requests keep a copy. Stop and rewrite history (`git filter-repo`), then ask GitHub Support to purge pull request refs and cached views.

## GitHub settings for a public repo

- Secret scanning and push protection on.
- Dependabot alerts on.
- `main` protected: changes land through a pull request with CI passing.
- CI's token is read-only (`permissions: contents: read` in `.github/workflows/ci.yml`), and workflows from first-time contributors' forks need approval to run (GitHub's default).
