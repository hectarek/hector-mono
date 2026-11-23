---
title: Neon's Managed Better Auth deletes a user only through Neon's API
date: 2026-11-23
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
related_components: [infrastructure]
tags: [neon-auth, better-auth, delete-account, neon-api, api-keys]
---

# Neon's Managed Better Auth deletes a user only through Neon's API

## Problem

Community Game Library deletes a member's account when they ask (E9) and when the admin removes one (G8), and each has to delete the person's Neon Auth user too. Neither of Better Auth's own routes for it works in Neon's managed setup, so the sign-in would outlive the account.

## Symptoms

- `POST {NEON_AUTH_BASE_URL}/delete-user` answers 404 with an empty body. Tried on the test project with a throwaway account's fresh session, with and without a password, through the paths `@neondatabase/auth`'s server SDK maps (`auth.deleteUser`).
- `POST {NEON_AUTH_BASE_URL}/admin/remove-user` answers 403 with `YOU_ARE_NOT_ALLOWED_TO_DELETE_USERS` to a session whose user lacks Neon Auth's admin role.
- [Neon's user management guide](https://neon.com/docs/auth/guides/user-management) names deleting user accounts in its list of topics, with no section for it.

## What Didn't Work

- **Better Auth's `deleteUser`** (`auth.deleteUser()` on the server, `authClient.deleteUser()` in the browser). It's off unless the server's config turns on `user.deleteUser` ([Better Auth's docs](https://better-auth.com/docs/concepts/users-accounts#delete-user)), and an app can't set Neon's managed config. Even where it's on, a member without a password needs a session made within `session.freshAge` (a day by default) or an email confirmation, so most members would have to sign in again first.
- **The admin plugin's `removeUser`** (`auth.admin.removeUser({ userId })`). It needs a session with Neon Auth's admin role ([Neon's Admin plugin guide](https://neon.com/docs/auth/guides/plugins/admin): an existing user with an admin role calls the admin APIs). A member deleting their own account has no such session, and even the admin's removal would need the admin's Neon Auth user given that role on every branch.
- **Deleting the row in `neon_auth.user` ourselves.** The app's database role (`neondb_owner`) has `DELETE` on it, and `neon_auth.session` and `neon_auth.account` cascade off it, so it would delete everything in the app's own transaction. But [Neon's webhooks guide](https://neon.com/docs/auth/guides/webhooks) says Managed Better Auth manages the `neon_auth` schema: apps read and reference its tables, and don't add triggers or alter them. Writing to it goes around the service that owns it.

## Solution

Neon's [Delete Auth User endpoint](https://neon.com/docs/reference/api/auth/delete-branch-neon-auth-user), `DELETE https://console.neon.tech/api/v2/projects/{project_id}/branches/{branch_id}/auth/users/{auth_user_id}` with `Authorization: Bearer <NEON_API_KEY>`. The Neon MCP's `delete_auth_user` and `neon neon-auth user delete` call the same API. On the test project it deleted the throwaway user with its sessions and accounts (no rows left in `neon_auth.user`, `session` or `account`), and its old session cookie's `get-session` then answered `null`.

The key is a [project-scoped organization API key](https://neon.com/docs/manage/api-keys): Editor access on its one project, unable to delete the project or reach another. The app calls the endpoint from `NeonAuthService.deleteUser` (`apps/community-game-library/src/infrastructure/services/neon-auth.service.ts`), with `NEON_API_KEY`, `NEON_PROJECT_ID` and `NEON_BRANCH_ID`:

```ts
async deleteUser(userId: string): Promise<void> {
  const { key, projectId, branchId } = this.neonApi;
  if (!key || !projectId || !branchId) {
    this.logger.warn("Sign-in kept: Neon's API settings are missing", {
      userId,
    });
    return;
  }
  const path = [projectId, "branches", branchId, "auth", "users", userId]
    .map(encodeURIComponent)
    .join("/");
  try {
    const response = await fetch(
      `https://console.neon.tech/api/v2/projects/${path}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${key}` } },
    );
    if (!response.ok) {
      this.logger.error("Failed to delete the sign-in", {
        userId,
        status: response.status,
      });
      return;
    }
    this.logger.info("Sign-in deleted", { userId });
  } catch (err) {
    this.logger.error("Failed to delete the sign-in", {
      userId,
      ...loggable(err),
    });
  }
}
```

It runs after the app's own deletion transaction commits, so a deletion the app refuses (a loan still open) never deletes the sign-in, and it never throws: by then the app's rows are gone, so a failure is logged for the admin to finish in Neon's console. The server action then signs the device out through the server SDK's `auth.signOut()`, which applies Neon's cookie deletions and clears the SDK's `session_data` copy too.

## Why This Works

The endpoint is Neon's management API, so it acts as the project rather than as a signed-in user: no session, freshness or role is involved, and the same call serves a member deleting their own account and the admin's removal. Neon deletes the user through its own service, which owns the `neon_auth` schema, so its sessions and accounts go with it.

## Prevention

- An app on Neon Auth that deletes users plans for a project-scoped API key per branch's project from the start: the person who holds production's values makes it and adds it to the hosting provider. The key never passes through a coding session.
- Two gaps stay open, and the app names them. The app trusts a signed session copy for a day (`sessionDataTtl`), so another device stays signed in until it expires, and the gate then finds no profile. And once the user is deleted, the same person can sign up again with the same email or Google account as a new user, so a row keyed by the old user id (the app's `removed_users`) doesn't keep them out. Banning the user through Neon's admin plugin would, but needs an admin session.

## Related Issues

- `docs/solutions/integration-issues/neon-console-users-have-no-password.md`: another way Neon's managed setup differs from self-hosted Better Auth.
- The app's `AGENTS.md`, "How a Neon Auth user is deleted" and U22's patterns.
