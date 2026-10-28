---
title: Users made in Neon's console have no password, so email sign-in fails until a reset
date: 2026-10-28
category: integration-issues
module: "apps/job-search, and any app here on Neon Auth with sign-up off in the UI"
problem_type: integration_issue
component: authentication
symptoms:
  - "Email and password sign-in fails for a user just created in the Neon console"
  - "neon_auth.account holds the user's credential row with a null password"
  - "The browser flows stop: set FLOW_AGENT_EMAIL and FLOW_AGENT_PASSWORD in .env"
root_cause: incomplete_setup
resolution_type: environment_setup
severity: medium
tags: [neon-auth, better-auth, test-accounts, password-reset, browser-flows]
---

# Users made in Neon's console have no password, so email sign-in fails until a reset

## Problem

The job search app's test project needed three users for its sign-in checks and browser flows, the owner's and Claude's among them (`OWNER_USER_ID`, `AGENT_USER_ID`). They were created in the Neon console, and none of them could sign in with a password.

## Symptoms

- Email and password sign-in fails for each new user.
- `neon_auth.account` holds each user's `credential` row, with `password` null.
- The browser flows (`bun run test:flows` in `apps/job-search`) stop before signing in: "set FLOW_AGENT_EMAIL and FLOW_AGENT_PASSWORD in .env". That message also shows when the main checkout's `.env` was edited but not saved, or not copied into the worktree that runs the flows.

## What Didn't Work

- Creating users with a password: Neon's user creation takes only an email and a name. The CLI's `neon neon-auth user create` has `--email` and `--name` and no password option ([Neon CLI: neon-auth](https://neon.com/docs/cli/neon-auth#user-create)).
- The app's sign-up form: `AuthProvider` sets `signUp={false}`, so the sign-up view sends visitors to sign in (`apps/job-search/app/_providers/auth-provider.tsx`).

## Solution

Set each password through the app's own forgot-password page, against the test project:

1. Start the dev server from a checkout whose `.env` holds the test project's values (`.claude/launch.json`'s `job-search`, port 3101). The test project's Neon Auth allows localhost.
2. Open `http://localhost:3101/auth/forgot-password`, enter the user's email and send the reset link.
3. Open the link from the email within 15 minutes ([Neon: password reset](https://neon.com/docs/auth/guides/password-reset)) and choose the password.
4. In the main checkout, fill the app's `.env` (made from `apps/job-search/.env.example`) with the two user ids and Claude's email and password (`FLOW_AGENT_EMAIL`, `FLOW_AGENT_PASSWORD`). Save it, and copy it into the worktree that runs the flows.

Check that it took:

```sql
select u.email, a.password is not null as has_password
from neon_auth."user" u
join neon_auth.account a on a."userId" = u.id and a."providerId" = 'credential';
```

## Why This Works

Neon Auth runs on Better Auth, which keeps an email user's password on their `credential` account. A user created without one gets that account with a null password. The reset flow is Neon's way to set it, and the app's auth pages already serve the forgot-password and reset views.

## Prevention

- After creating users in the console, run the query above before relying on them.
- Read the browser flows' "set FLOW_AGENT_EMAIL and FLOW_AGENT_PASSWORD" message as "this worktree's `.env` doesn't have them". The values have to be saved in the main checkout and copied into the worktree that runs the flows.

## Related Issues

- `apps/job-search/AGENTS.md`, Environments and Testing (the flows and the local `.env`).
