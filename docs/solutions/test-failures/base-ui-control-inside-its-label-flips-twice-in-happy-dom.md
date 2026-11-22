---
title: A Base UI switch or checkbox inside its own label flips twice on one fireEvent.click in happy-dom, so the click seems to do nothing; put the label beside it
date: 2026-11-22
category: test-failures
module: "@repo/ui's Switch and Checkbox (Base UI) in any app's happy-dom screen tests; found in apps/community-game-library"
problem_type: test_failure
component: testing_framework
symptoms:
  - "One fireEvent.click on a Switch or Checkbox inside its own <label> calls onCheckedChange twice, true then false, and the control ends where it started"
  - "A click on the label's words flips it once, and so does a click on the control when its label sits beside it"
  - "Giving the wrapping label htmlFor and the control an id changes nothing"
  - "In Chromium the same click flips it once, so only the screen test sees the double flip"
  - "A test that clicks with user-event sees one flip"
root_cause: async_timing
resolution_type: code_fix
severity: medium
framework_version: "@base-ui/react 1.9.0, happy-dom 21.0.4, react 19.3.1"
retire_when: "happy-dom forwards a label's click to its control after the whole dispatch, so a listener above the label that calls preventDefault cancels it; check HTMLLabelElement.dispatchEvent in the installed happy-dom's src/nodes/html-label-element/HTMLLabelElement.ts, which in 21.0.4 reads defaultPrevented right after the label's own listeners"
related_components: [frontend]
tags: [base-ui, happy-dom, label, switch, checkbox, fire-event, user-event, screen-tests]
---

# A Base UI switch or checkbox inside its own label flips twice on one fireEvent.click in happy-dom

## Problem

`@repo/ui`'s `Switch` and `Checkbox` wrap Base UI's `Switch.Root` and `Checkbox.Root`. Put one inside its own `<label>`, a plain one or shadcn's layout of a `FieldLabel` around a horizontal `Field`, and a screen test's `fireEvent.click` on it turns it on and straight back off. The test's click seems to do nothing, while in Chromium the same click flips it once. `apps/community-game-library`'s switches that save as they flip and its copy page's expansion checkboxes put their labels beside them for this reason.

## Symptoms

Checked on 2026-11-22 with a throwaway screen test in `apps/community-game-library` (`bun run test:screens <file>`), recording every `onCheckedChange` call (versions: `@base-ui/react` 1.9.0, from `packages/ui/package.json`'s `^1.9.0`; happy-dom 21.0.4, through `@happy-dom/global-registrator` 21.0.4, from `apps/community-game-library/package.json`'s `^21.0.4`; React 19.3.1; `@testing-library/react` 16.3.3):

- A `Switch` inside its `<label>`: one `fireEvent.click` on the switch calls `onCheckedChange(true)`, then `onCheckedChange(false)`, and `aria-checked` ends `"false"`. The same happens uncontrolled (no `checked` prop), with `htmlFor` on the label and the `id` on the switch, and for a `Checkbox` inside `FieldLabel htmlFor` with a horizontal `Field`.
- A click on the label's words flips it once. So does a click on the control when its label sits beside it.
- `getByLabelText("Available now")` throws "Found multiple elements with the text of: Available now" in every layout, beside or around: it finds the visible control and the hidden input.
- user-event 14.6.13's `user.click`, run in `apps/hectors-recipes` on the same happy-dom, flips a wrapped switch or checkbox once per click.
- In Playwright's headless Chromium 156.0.8078.4, with the same components bundled into a page, a mouse click, a dispatched click `MouseEvent` like the one `fireEvent.click` makes, and a click on the label's words each flip the control once, in every layout. WebKit and Firefox weren't checked.

## What Didn't Work

- Giving the wrapping label `htmlFor` and the control an `id`, which Biome's `noLabelWithoutControl` asks for on a label around a component: the label's control is the same hidden input either way, so it still gets two clicks.
- Clicking the label's words in the test instead: one flip, but the tap a person makes, on the control itself, goes untested.

## Solution

Put the label beside the control, joined to it by `htmlFor`, never around it:

```tsx
// apps/community-game-library/app/_components/saved-switch.tsx, abridged
const switchId = useId();

<div className="flex min-h-11 items-center justify-between gap-2.5">
  <label htmlFor={switchId}>{label}</label>
  <Switch id={switchId} checked={checked} onCheckedChange={flip} />
</div>
```

The copy page's expansion checkboxes (`apps/community-game-library/app/(main)/copies/[id]/copy-form.tsx`) are laid out the same way: a `Checkbox`, then its `<label htmlFor>`.

In a test, find the control by role and name, `getByRole("switch", { name: "Available now" })`, which returns the visible control, never with `getByLabelText`. The name comes from the `aria-labelledby` Base UI sets on the control, so a test that lists several controls' names reads that attribute, as the Library page's screen test does:

```ts
// apps/community-game-library/tests/app/(main)/page.test.tsx
// A Base UI control's name, from the label it's labelled by.
const nameOf = (control: HTMLElement) =>
  (control.getAttribute("aria-labelledby") ?? "")
    .split(" ")
    .map((id) => control.ownerDocument.getElementById(id)?.textContent)
    .join(" ")
    .trim();
```

## Why This Works

Base UI 1.9.0's `Switch.Root` and `Checkbox.Root` render a `<span role="switch">` (or `role="checkbox"`) and, beside it, a visually hidden `<input type="checkbox" aria-hidden="true" tabindex="-1">`. The `id` passed to the root goes on that input; the span gets a generated `base-ui-…` id. The span's `onClick` calls `preventDefault()` and then clicks the input itself, and the input's `onChange` calls `onCheckedChange` (`SwitchRoot.mjs` and `CheckboxRoot.mjs` in `@base-ui/react`).

React handles clicks with listeners on the root container (`listenToAllSupportedEvents(container)` in react-dom's client), so the span's `onClick` runs only when the click reaches the root, after it has passed any label around the span.

happy-dom 21.0.4's `HTMLLabelElement` overrides `dispatchEvent` (`HTMLLabelElement.ts`, in src/nodes/html-label-element in the happy-dom package). As a click passes the label, the label clicks its control there and then, unless a listener has already called `preventDefault` or the click started on the control. The control is the element the label's `for` names, or else its first labelable descendant: the hidden input, either way. React's listener sits above the label and hasn't run yet, so nothing has prevented the click. The input gets the label's click, which flips it, and then Base UI's, which flips it back.

A browser runs a label's forwarding as the label's activation behavior, after the whole dispatch, and only if no listener canceled the click ([DOM Standard, dispatching events](https://dom.spec.whatwg.org/#dispatching-events)). Base UI's `preventDefault` cancels it, so the input gets Base UI's click alone. user-event 14.6.13 keeps that order: for a click inside a label, it calls the event's own `preventDefault` before dispatching, which keeps happy-dom's label from acting, and clicks the label's control itself afterwards only if no handler canceled the click (`dispatchEvent.js`, and the click behavior in `click.js`, in user-event's dist).

With the label beside the control, the span's click never passes a label, so the input gets one click, Base UI's. A click on the label reaches its control, the input `htmlFor` names, once.

Base UI's `useAriaLabelledBy` handles both layouts: it finds the input's label, around it or beside it, gives the label an id (the input's id plus `-label`) when it has none, and points the span's `aria-labelledby` at it. That's where the visible control's name comes from, and why `getByLabelText` finds two elements: the span, through its `aria-labelledby`, and the hidden input, as the label's control.

## Prevention

- Give a Base UI `Switch` or `Checkbox` its label beside it, with `htmlFor` and the control's `id`. That includes shadcn's choice-card layout, a `FieldLabel` around a horizontal `Field`, since `@repo/ui`'s `FieldLabel` renders a `<label>`. `apps/hectors-recipes/app/_components/join-button.tsx` and `apps/hectors-recipes/app/_components/ingredient-rows.tsx` use that layout, and no screen test clicks either yet: a test that clicks one with `fireEvent.click` would see two flips, and one with user-event, which recipes' tests use, one.
- After a click, check the control's `aria-checked`, or what it saved, so a double flip fails the test instead of passing on a message.
- A `RadioGroupItem` inside its label is unaffected in practice: `apps/community-game-library/app/_components/piece-picker.tsx` wraps each one, and `apps/community-game-library/tests/app/_components/profile-form.test.tsx` picks a piece with `fireEvent.click` and passes, presumably because a second click leaves a radio checked.

## Related Issues

- `apps/community-game-library/AGENTS.md`, Testing: the app's rule, beside its other notes on Base UI in happy-dom.
- `docs/solutions/ui-bugs/button-retyped-during-its-click-submits-the-form.md`: the reverse case, a bug only a browser shows, which also turns on when the browser runs a click's activation behavior.
