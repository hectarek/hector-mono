---
title: Neon's Managed Better Auth deletes a user only through Neon's API
date: 2026-11-23
last_updated: 2026-11-24
category: integration-issues
module: "apps/community-game-library, and any app here on Neon Auth that deletes accounts"
problem_type: integration_issue
component: authentication
symptoms:
  - "POST /delete-user on Neon Auth answers 404 with an empty body, with a fresh session, with or without a password"
  - "POST /admin/remove-user answers 403 YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS to a member's own session"
  - "Neon's user management guide lists deleting user accounts but has no section for it"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
framework_version: "@neondatabase/auth 0.7.0-beta (better-auth 1.7.6)"
retire_when: "Neon's Managed Better Auth turns on Better Auth's delete-user, or documents its own way for an app to delete a user; check POST /delete-user with a fresh session on a test branch, and the Deleting user accounts entry in https://neon.com/docs/auth/guides/user-management"
related_components: [infrastructure, database]
tags: [neon-auth, better-auth, delete-account, neon-api, api-keys, anonymize]
---

# Neon's Managed Better Auth deletes a user only through Neon's API

## Problem

Community Game Library deletes a member's account when they ask (E9) and when the admin removes one (G8), and each has to deal with the person's Neon Auth user too. Neither of Better Auth's own routes for deleting it works in Neon's managed setup, so the sign-in would outlive the account.

## Symptoms

- `POST {NEON_AUTH_BASE_URL}/delete-user` answers 404 with an empty body. Tried on the test project with a throwaway account's fresh session, with and without a password, through the paths `@neondatabase/auth`'s server SDK maps (`auth.deleteUser`).
- `POST {NEON_AUTH_BASE_URL}/admin/remove-user` answers 403 with `YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS` to a session whose user lacks Neon Auth's admin role.
- [Neon's user management guide](https://neon.com/docs/auth/guides/user-management) names deleting user accounts in its list of topics, with no section for it.

## What Didn't Work

- **Better Auth's `deleteUser`** (`auth.deleteUser()` on the server, `authClient.deleteUser()` in the browser). It's off unless the server's config turns on `user.deleteUser` ([Better Auth's docs](https://better-auth.com/docs/concepts/users-accounts#delete-user)), and an app can't set Neon's managed config. Even where it's on, a member without a password needs a session made within `session.freshAge` (a day by default) or an email confirmation, so most members would have to sign in again first.
- **The admin plugin's `removeUser`** (`auth.admin.removeUser({ userId })`). It needs a session with Neon Auth's admin role ([Neon's Admin plugin guide](https://neon.com/docs/auth/guides/plugins/admin): an existing user with an admin role calls the admin APIs). A member deleting their own account has no such session, and even the admin's removal would need the admin's Neon Auth user given that role on every branch.

## Solution

There are two ways that work. Neon supports the first; the app has used the second since 2026-11-24.

**1. Neon's API, with a key (supported).** Neon's [Delete Auth User endpoint](https://neon.com/docs/reference/api/auth/delete-branch-neon-auth-user), `DELETE https://console.neon.tech/api/v2/projects/{project_id}/branches/{branch_id}/auth/users/{auth_user_id}` with `Authorization: Bearer <NEON_API_KEY>`. The Neon MCP's `delete_auth_user` and `neon neon-auth user delete` call the same API. On the test project it deleted a throwaway user with its sessions and accounts (no rows left in `neon_auth.user`, `session` or `account`), and its old session cookie's `get-session` then answered `null`. The key is a [project-scoped organization API key](https://neon.com/docs/manage/api-keys): Editor access on its one project, unable to delete the project or reach another. The app called the endpoint after its own deletion transaction committed, from 2026-11-23 until the change below, with the key, the project and the branch in its hosting settings.

**2. Anonymizing the sign-in in Neon Auth's tables (the app's way now).** On 2026-11-24 Hector chose not to keep a project-scoped Neon key in Vercel. A deleted or removed account's sign-in is now anonymized in Neon Auth's own tables, in the deletion's own transaction: `endAccount` ends with `ISignInsRepository.anonymize` (`apps/community-game-library/src/infrastructure/repositories/sign-ins.repository.ts`). The app's database role (`neondb_owner`) has `UPDATE` and `DELETE` on those tables (checked on the test project).

```ts
// Codes and links still waiting for it: an email's codes end with the address, and a
// password reset's carries the user's id. Before the address changes.
await db.execute(sql`
  delete from neon_auth.verification as v
  using neon_auth."user" as u
  where u.id = ${userId}
    and (v.value = ${userId} or right(v.identifier, length(u.email)) = u.email)`);
await db.execute(sql`delete from neon_auth.session where "userId" = ${userId}`);
await db.execute(sql`delete from neon_auth.account where "userId" = ${userId}`);
// The address stays unique, as Neon Auth requires, and .invalid never receives mail.
await db.execute(sql`
  update neon_auth."user"
  set name = ${formerMember(userId).name},
      email = ${`deleted-${userId}@deleted.invalid`},
      image = null,
      "emailVerified" = false,
      "updatedAt" = now()
  where id = ${userId}`);
```

The user keeps its id, so history that names it still points at a row; its name reads "A former member", as the app shows them. Its ways in (the Google link, the password hash) and its sessions are gone, so nobody can sign in to it again, and the same Google account later makes a new user. The server action then signs the device out through the server SDK's `auth.signOut()`, as before.

The catch is Neon's own word on that schema. Its [webhooks guide](https://neon.com/docs/auth/guides/webhooks) says "Managed Better Auth manages the neon_auth schema, so you can read and reference its tables but not add triggers to them or alter them." Updating and deleting rows is outside what Neon describes, so the writes rest on the tables' shape as of 2026-11-24:
- `user`: a uuid `id`, `name`, a unique `email` (`user_email_key`), `emailVerified` and `image`;
- `session` and `account` cascade off `user`.

Verified on 2026-11-24:
- `apps/community-game-library/tests/src/infrastructure/repositories/sign-ins.repository.test.ts` passes on a PGlite stand-in of those tables (`apps/community-game-library/tests/_support/database.ts`).
- The account use-case tests pass on both backends.
- `apps/community-game-library/tests/flows/delete-account.flow.ts` passes on the test project: the account was deleted, the device signed out, and its email and password no longer signed in. Afterwards, Neon Auth's real tables showed the user as "A former member" with the placeholder email, no picture, no accounts and no sessions.

## Why This Works

The API acts as the project rather than as a signed-in user: no session, freshness or role is involved, and the same call serves a member deleting their own account and the admin's removal. Neon deletes the user through its own service, which owns the `neon_auth` schema, so its sessions and accounts go with it.

The anonymizing works because Neon Auth keeps its state in the app's own database, and the app's role may write it. Done in the deletion's own transaction, it can't happen without the rest of the deletion, or the other way round: a deletion the app refuses (a loan still open) changes neither. Better Auth's sign-out clears the device's cookies even when the session's row is already gone, so the device still signs out.

## Prevention

- An app on Neon Auth that deletes users chooses one of the two from the start. With the API, plan a project-scoped key per project: the person who holds production's values makes it and adds it to the hosting provider, and the key never passes through a coding session. With the anonymizing, keep a browser flow on a real branch that deletes an account and tries its sign-in again, since a change Neon makes to its tables would break the writes; this app's is `apps/community-game-library/tests/flows/delete-account.flow.ts`.
- Two gaps stay open either way, and the app names them. The app trusts a signed session copy for a day (`sessionDataTtl`), so another device stays signed in until it expires, and the gate then finds no profile. And the same person can sign up again with the same email or Google account as a new user, so a row keyed by the old user id (the app's `removed_users`) doesn't keep them out. Banning the user through Neon's admin plugin would, but needs an admin session.

## Related Issues

- `docs/solutions/integration-issues/neon-console-users-have-no-password.md`: another way Neon's managed setup differs from self-hosted Better Auth.
- The app's `AGENTS.md`, "A deleted or removed account's sign-in is anonymized" and U22's patterns.
