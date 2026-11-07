---
title: A button that React turns into a submit button during its own click submits the form
date: 2026-11-07
category: ui-bugs
module: "apps/job-search, and any app here whose form swaps one button for another on a tap"
problem_type: ui_bug
component: frontend
symptoms:
  - "Tapping a button that should switch a form's view saves the form at once, with the next view's defaults"
  - "The screen tests pass: under happy-dom, the same tap switches the view"
root_cause: async_timing
resolution_type: code_fix
severity: high
framework_version: "react 19.3.1"
related_components: [testing_framework]
tags: [react, forms, button-type, reconciliation, keys, happy-dom, activation-behavior, sheets]
---

# A button that React turns into a submit button during its own click submits the form

## Problem

`apps/job-search`'s due-row sheet (`apps/job-search/app/_components/next-step-sheet.tsx`) is a form with two views. In the first, the footer holds Done (`type="button"`, which switches the view); in the second, it holds Save (`type="submit"`) in the same place. In a real browser, tapping Done saved the form straight away, logging a message that never happened, with the second view's defaults.

## Symptoms

- In Playwright's Chromium on 2026-11-07, tapping Done closed the sheet and showed the toast "Logged: Message sent", where it should have shown the Done view.
- The screen tests passed. Under happy-dom, Testing Library's `fireEvent.click` on Done switched the view, and a later tap on Save saved.

## What Didn't Work

- Trusting the screen tests: happy-dom didn't submit the form from the retyped button, so the tests never saw the bug.

## Solution

Each footer button gets a key of its own, so React mounts a new element for the next view instead of changing the tapped one:

```tsx
// apps/job-search/app/_components/next-step-sheet.tsx
<SheetFooter>
  {view === "push" ? (
    <>
      <Button key="done" type="button" onClick={startDone}>Done</Button>
      <Button key="push" type="submit">Push to that day</Button>
    </>
  ) : (
    <>
      <Button key="save" type="submit">Save</Button>
      <Button key="none" type="button" onClick={noNextStep}>No next step</Button>
    </>
  )}
</SheetFooter>
```

Checked again in Playwright's Chromium: Done opens the Done view, and Save then submits.

## Why This Works

Without keys, React matched the two footers' children by position. The Done `Button` and the Save `Button` sat at the same index, so React kept the same DOM `<button>` and changed its `type` from `button` to `submit`. React commits a click's state update before the browser finishes dispatching that click, as discrete events flush synchronously. The browser then runs the button's activation behavior, which reads the button's type as it is at that moment, after dispatch. By then the tapped element was a submit button inside a form, so the browser submitted the form, and its `onSubmit` ran the second view's save.

With keys, React removes the tapped button and mounts a new one. The removed button keeps `type="button"` and, out of the document, has no form, so its activation does nothing.

## Prevention

- When a tap changes which buttons a form shows, give each button its own key, or keep the submit button in the DOM in both states. `apps/job-search/AGENTS.md`'s UI Rules say so beside the sheet-as-form rule.
- Check a form's view switch in a real browser. A screen test under happy-dom passes either way.

## Related Issues

- `apps/job-search/AGENTS.md`'s UI Rules: a sheet is a form.
