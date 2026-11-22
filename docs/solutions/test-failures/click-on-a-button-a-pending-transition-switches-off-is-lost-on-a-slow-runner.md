---
title: A screen test's click on a button that a pending transition switches off was lost on CI's slower runner, and no longer wait brought the result back
date: 2026-11-22
category: test-failures
module: "Screen tests (happy-dom) in any app here; found in apps/community-game-library's Add games test"
problem_type: test_failure
component: testing_framework
symptoms:
  - "A screen test passes locally and fails on CI at a findByText that follows a fireEvent.click"
  - "Giving Testing Library's waits 3 seconds instead of 1 doesn't fix it: the wait runs out at 3 seconds too"
  - "The clicked button renders disabled={pending}, where pending comes from useTransition"
root_cause: async_timing
resolution_type: test_fix
severity: medium
framework_version: "react 19.3.1, happy-dom 21.0.4, @testing-library/react 16.3.3"
tags: [react-19, use-transition, is-pending, disabled-button, fire-event, flaky-test, ci-only, happy-dom, screen-tests]
---

# A screen test's click on a button that a pending transition switches off was lost on CI's slower runner

## Problem

`apps/community-game-library`'s Add games screen test ("adds several in a row, each with Added and Undo, and counts them", `apps/community-game-library/tests/app/(main)/my-library/add/page.test.tsx`) passed locally and failed twice on CI. It adds two games, waits for "2 added", taps the second row's Undo, then waits for "1 added", which never came on CI's runner.

## Symptoms

- On CI, `expect(await view.findByText("1 added"))` failed right after `fireEvent.click` on the row's Undo button. Locally, the test passed every time.
- The first CI run failed this test and one other, both in a wait after an action. Raising Testing Library's waits from 1 to 3 seconds (`asyncUtilTimeout` in `apps/community-game-library/tests/_support/dom.ts`, as job-search's harness already did) fixed the other test. This one failed again, after the full 3 seconds.

## What Didn't Work

- **A longer wait.** The other failure was a slow action, so a longer wait was the right fix for it. Here the click itself was lost, and no wait can bring back the result of a click that never ran.

## Solution

The test waits for the button to be switched on before it taps it, as a person would:

```tsx
// apps/community-game-library/tests/app/(main)/my-library/add/page.test.tsx
const undo = within(row(view, "Safe Harbor")).getByRole("button", {
  name: "Undo",
});
await waitFor(() => expect(undo.hasAttribute("disabled")).toBe(false));
fireEvent.click(undo);
expect(await view.findByText("1 added")).toBeTruthy();
```

The fix is in hectarek/hector-mono#128.

## Why This Works

`IOwnIt` (`apps/community-game-library/app/_components/i-own-it.tsx`) adds a copy inside `startTransition(async () => { … })`. After the action's `await`, it calls `setAdded(userGameId)`, which shows the Added stamp and its Undo button, and `tally?.change(1)`, which shows "2 added". The Undo button renders `disabled={pending}`, where `pending` is `useTransition`'s.

React's documentation says that a state update after an `await` inside `startTransition` isn't marked as a transition (the `useTransition` reference, https://react.dev/reference/react/useTransition, under Troubleshooting). So the Added stamp, the Undo button and "2 added" render as ordinary updates, and `pending` turns false only when the transition itself finishes rendering. The test awaited "2 added", then made one quick repository read, then clicked Undo. When the click landed while `pending` was still true, the button still had its `disabled` attribute, so React ran no `onClick` and nothing undid the copy.

What was measured, and what is inference:

- **Locally, at normal speed:** a probe in the test found the Undo button already switched on when "2 added" appeared, and again just before the click. The gap is too short to catch on a fast machine.
- **Locally, under load:** with 14 background `yes > /dev/null` processes running, the old test failed once in four runs at the same line as on CI, and the fixed test passed four of four.
- **Inference:** a transition render can yield to other work, so on a busy runner it can commit after the ordinary updates. That fits both observations, but nothing here traced React's scheduler step by step.

## Prevention

- In a screen test, before clicking a control that a transition's pending state can switch off, wait for it to be switched on: `await waitFor(() => expect(button.hasAttribute("disabled")).toBe(false))`. This matters most right after awaiting that same transition's visible result.
- When a test fails only on CI and still fails after a longer wait, suspect a lost event rather than a slow one. Check whether the control the test clicks can be disabled at that moment.
- To reproduce a CI-only failure locally, load the CPU while running that one file, for example 14 background `yes > /dev/null` processes, and kill them afterwards. Run the file several times: here the failure came once in four runs.

## Related Issues

- [base-ui-control-inside-its-label-flips-twice-in-happy-dom.md](base-ui-control-inside-its-label-flips-twice-in-happy-dom.md): another way a screen test's click on a control doesn't do what a tap does.
- [form-action-reset-puts-a-controlled-select-back-to-its-default-option.md](../ui-bugs/form-action-reset-puts-a-controlled-select-back-to-its-default-option.md): the same app's forms send from `onSubmit` inside `startTransition`.
