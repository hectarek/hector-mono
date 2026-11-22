---
title: A form action resets its form when it ends, which put a controlled select back to its default option while its state kept the saved one
date: 2026-11-22
category: ui-bugs
module: "apps/community-game-library, and any app here whose form stays on its page after a successful action and holds a controlled select"
problem_type: ui_bug
component: frontend
symptoms:
  - "After Save and its message, a controlled select shows another option than the one just saved"
  - "On a page loaded in full it shows the option the page loaded with; on one reached by a client navigation, its first option"
  - "The next Save sends the option on screen, not the one in React state"
root_cause: wrong_api
resolution_type: code_fix
severity: high
framework_version: "react 19.3.1, react-dom 19.3.1"
retire_when: "react-dom keeps a controlled select's defaultSelected in step with its value, as it keeps a textarea's defaultValue, so form.reset() leaves the saved option; check updateOptions in react-dom's client build for the setDefaultSelected argument it gets on a value update"
related_components: [testing_framework]
tags: [react, forms, form-actions, useactionstate, form-reset, select, controlled-inputs, happy-dom]
---

# A form action resets its form when it ends, which put a controlled select back to its default option

## Problem

`apps/community-game-library`'s copy page (B7, `apps/community-game-library/app/(main)/copies/[id]/copy-form.tsx`) saves a copy's condition, its missing parts and the expansions in its box with one Save, and stays on the page. The form passed its `useActionState` dispatcher as `<form action={submit}>`, and the condition was a controlled `NativeSelect` (`value={chosen}`). After a save, the select showed another condition than the one saved, while React state and the database held the saved one. The next Save would have sent the one on screen.

## Symptoms

- In Playwright's Chromium on 2026-11-22, polling the select every 150 ms after Save read "good", the condition just chosen, until "Saved." appeared, then "worn", the condition the page had loaded with.
- On the same page reached by a client navigation from My library, the select went to "like-new", its first option.
- The textarea beside it kept its text.

## What Didn't Work

- Reading the field with `document.querySelector('#copy-condition')` right after the save. Next keeps pages you left mounted but hidden (React's Activity, under Cache Components), so the query can return a hidden copy of the field. Check a value in the browser on the visible element (`offsetParent !== null`).

## Solution

Send from `onSubmit`, and dispatch the action inside a transition:

```tsx
// apps/community-game-library/app/(main)/copies/[id]/copy-form.tsx
<form
  ref={form}
  onSubmit={(event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => submit(formData));
  }}
  noValidate
>
```

`submit` is still `useActionState`'s dispatcher, so its pending flag, its returned state and the "Saved." message work as before. Only the reset is gone. A screen test (`apps/community-game-library/tests/app/(main)/copies/[id]/page.test.tsx`, "saves This copy with Save: Saved.") reads the select after "Saved."; with `<form action={submit}>` it fails in happy-dom, which resets the select to its first option.

## Why This Works

When a form's `action` is a function, react-dom runs it through `startHostTransition`, which calls `requestFormReset` before running the action. When that transition commits, React calls the DOM's `form.reset()` (`startHostTransition` and `recursivelyResetForms` in react-dom 19.3.1's client build). `form.reset()` puts every field back to its default.

React keeps a controlled textarea's `defaultValue` equal to its value, so a reset leaves the textarea as it is. For a select, a value update sets each option's `selected` but not `defaultSelected` (`updateOptions` gets `setDefaultSelected` false), so the reset lands on the option the server rendered as selected or, for a select made on the client, the first option. React state hasn't changed, so React doesn't apply the controlled value again.

A submit handler that prevents the default and dispatches the action itself never goes through `startHostTransition`, so nothing requests the reset.

## Prevention

- A form that stays on its page after a save and holds a controlled select sends from `onSubmit` in a transition, not through `action`. `apps/community-game-library/AGENTS.md` says so in U7's patterns.
- A form that leaves its page after a save, such as `profile-form.tsx` (A4 and E6) or recipes' forms that redirect, doesn't show it, since the page goes.
- A screen test that saves a form checks a select's value after the save's message: happy-dom performs the same reset.

## Related Issues

- `docs/solutions/ui-bugs/button-retyped-during-its-click-submits-the-form.md`: another form behavior that a test in happy-dom alone can miss.
