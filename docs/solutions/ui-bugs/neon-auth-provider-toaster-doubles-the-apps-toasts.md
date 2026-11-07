---
title: Neon Auth UI's provider mounts its own sonner toaster, so the app's toaster showed every toast twice
date: 2026-11-07
category: ui-bugs
module: "apps/job-search, and any app here wrapped by Neon Auth UI's provider that mounts a toaster of its own (hectors-recipes and stash use the provider)"
problem_type: ui_bug
component: frontend
symptoms:
  - "A toast looks like one, but the DOM holds two `section[aria-label=\"Notifications alt+T\"]` live regions, each with the same toast"
  - "A screen reader reads every toast twice"
  - "Screen tests that render one Toaster beside the component pass"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
framework_version: "sonner 2.0.8, @neondatabase/auth-ui 0.4.0-beta"
retire_when: "Neon Auth UI's provider stops mounting a toaster, or lets an app turn it off; check NeonAuthUIProvider in @neondatabase/auth-ui's dist for jsx(Toaster"
related_components: [accessibility, authentication]
tags: [sonner, toaster, toasts, neon-auth, aria-live, screen-reader, accessibility, provider]
---

# Neon Auth UI's provider mounts its own sonner toaster, so the app's toaster showed every toast twice

## Problem

`apps/job-search` mounted `@repo/ui`'s sonner `Toaster` in its shell for the toasts its saves show, with Undo. Every toast then rendered in two live regions, so a screen reader read each one twice. On screen the two copies sat on top of each other and looked like one.

## Symptoms

- In Playwright's Chromium on 2026-11-07, the page held two `section[aria-label="Notifications alt+T"]` elements, and after a save each held the same toast. One sat in the shell; the other was a child of `div.neon-auth-ui`, beside the shell.
- The screen tests passed: each renders one `Toaster` beside the component, so a second toaster mounted by a provider never appears in them.

## What Didn't Work

- Trusting the screen tests and a look at the page. Neither shows a second toaster stacked under the first.

## Solution

Sonner 2 can route toasts to one toaster. `apps/job-search/app/_lib/notify.ts` sends the app's toasts to the shell's toaster by its id:

```ts
// apps/job-search/app/_lib/notify.ts
export const APP_TOASTER = "app";

export function notify(message: string, options: ExternalToast = {}) {
  return toast(message, { ...options, toasterId: APP_TOASTER });
}
```

The shell renders `<Toaster id={APP_TOASTER} position="bottom-center" />`, and components call `notify`, never sonner's `toast`. Neon's toaster keeps only Neon's own toasts, which carry no toaster id. `apps/job-search/tests/app/_lib/notify.test.tsx` renders a `Toaster` without an id beside one with `APP_TOASTER`, calls `notify`, and expects the message once; with the `toasterId` taken out, it fails. A component's screen test renders `<Toaster id={APP_TOASTER} />`, since a toaster without the id shows none of the app's toasts.

## Why This Works

`NeonAuthUIProvider` (`@neondatabase/auth/react`), which wraps every page through the app's `AuthProvider`, always renders sonner's own `<Toaster />` after its children (`children: [children, jsx(Toaster, {})]` in `@neondatabase/auth-ui` 0.4.0-beta), with no prop to turn it off. The app pins `sonner` at `packages/ui`'s version, so there is one copy of sonner and one toast store, and every toaster subscribed to it rendered every toast.

Sonner 2.0.8's `Toaster` filters what it shows by id: one with an `id` keeps only toasts whose `toasterId` matches it, and one without an `id` keeps only toasts that have no `toasterId`. A toast sent with the shell's id therefore shows on the shell's toaster alone.

## Prevention

- Before mounting a toaster in an app wrapped by Neon Auth UI's provider, give it an id and send the app's toasts to it, or use Neon's toaster and its styling instead.
- After adding a toaster, count `section[aria-label^="Notifications"]` in a real browser. A screen test that renders one `Toaster` can't show one a provider mounts.

## Related Issues

- `apps/job-search/AGENTS.md`'s UI Rules (toasts) and Testing (a screen test of a toast).
