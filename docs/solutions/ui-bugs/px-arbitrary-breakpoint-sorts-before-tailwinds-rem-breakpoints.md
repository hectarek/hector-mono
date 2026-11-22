---
title: A px breakpoint such as min-[1100px] sorts before Tailwind's rem breakpoints, so md wins wherever both match; write it in rem
date: 2026-11-21
category: ui-bugs
module: "Tailwind CSS v4 breakpoints (every hector-mono app)"
problem_type: ui_bug
component: frontend
symptoms:
  - "A list meant to run three columns from 1100 px stayed at two columns at 1100 and 1280 px"
  - "The generated CSS holds the 1100 px rule, in an @media block placed before md's"
  - "The app's screen test passes with either unit, since it checks class names"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
framework_version: "tailwindcss 4.3.5"
retire_when: "Tailwind orders breakpoint variants by length across units, so a px arbitrary breakpoint sorts by size among the theme's rem ones; check by compiling md:grid-cols-2 min-[1100px]:grid-cols-3 with the installed tailwindcss and seeing which @media block comes first, or by rereading the unit note under Customizing your theme on tailwindcss.com/docs/responsive-design"
tags: [tailwind, breakpoints, responsive, css-order, arbitrary-values, media-queries, rem, units]
---

# A px breakpoint such as min-[1100px] sorts before Tailwind's rem breakpoints, so md wins wherever both match; write it in rem

## Problem

`apps/community-game-library` runs a list someone browses (the library, a friend's library) in two columns from 768 px and three from 1100 px. The first version wrote the 1100 px step as an arbitrary breakpoint in px, beside the theme's `md`, which is `48rem` (768 px):

```tsx
"md:grid md:grid-cols-2 min-[1100px]:grid-cols-3"
```

The third column never appeared. Every app here runs Tailwind CSS v4 (tailwindcss 4.3.5 on 2026-11-21) on the default rem breakpoints, and none overrides `--breakpoint-*`, so the same classes fail the same way in any of them.

## Symptoms

- At 1100 and 1280 px the list showed two columns, not three.
- The generated CSS held the 1100 px rule, in an `@media` block placed before `md`'s.
- `apps/community-game-library/tests/app/_components/list-row.test.tsx` passes with either unit: it checks class names, not which rule wins.

## What Didn't Work

- `min-[1100px]:`, written in px as in Tailwind's own example under [Using arbitrary values](https://tailwindcss.com/docs/responsive-design#using-arbitrary-values) (`max-[600px]:`, `min-[320px]:`). That section says nothing about units.

## Solution

Write the arbitrary breakpoint in rem, the unit of the theme's breakpoints. 1100 px is `68.75rem` (1100 ÷ 16):

```tsx
// apps/community-game-library/app/_components/list-row.tsx, List (the border classes left out)
browse && "md:grid md:grid-cols-2 min-[68.75rem]:grid-cols-3",
```

A rem in a media query is measured against the browser's default text size, 16 px unless the reader has changed it, and never against the page's own `html` font size ([Media Queries Level 4, §1.3](https://www.w3.org/TR/mediaqueries-4/#units)). With `html { font-size: 20px }`, the rule above still switched at 1100 px, not 1375.

Checked on 2026-11-21 by compiling with the repo's Tailwind (tailwindcss 4.3.5, through `@tailwindcss/node` 4.3.5) and rendering in headless Chromium 156 (Playwright 1.64.1):

| Width | `md:grid-cols-2 min-[1100px]:grid-cols-3` | `md:grid-cols-2 min-[68.75rem]:grid-cols-3` |
|---|---|---|
| 800 px | 2 columns | 2 columns |
| 1100 px | 2 columns | 3 columns |
| 1280 px | 2 columns | 3 columns |

The app writes each 1100 px step this way (`list-row.tsx`, `app-header.tsx`), and its `AGENTS.md` records the rule under Screens. The fix was on the branch for the app's first batch, not yet merged, when this was written.

## Why This Works

Tailwind v4 sorts the theme's breakpoints (`sm` to `2xl`, plus any `--breakpoint-*` added in `@theme`) and the `min-*` variants as one group, smallest first. When two rules of the same specificity both match, the later one in the stylesheet wins. But the group's comparator (in `apps/community-game-library/node_modules/tailwindcss/dist/lib.mjs`, 4.3.5) compares sizes only within one unit. It reduces each value to what's left once its digits and dots are removed (`1100px` to `px`, `48rem` to `rem`), or to the function name for a value such as `calc(…)`. It compares those strings first, and the numbers only when the strings match. `px` sorts before `rem`, so every px breakpoint comes before every rem one, whatever its size:

```css
/* md:grid-cols-2 min-[1100px]:grid-cols-3, as Tailwind 4.3.5 emits them */
@layer utilities {
  @media (width >= 1100px) {
    .min-\[1100px\]\:grid-cols-3 {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (width >= 48rem) {
    .md\:grid-cols-2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}
```

From 1100 px both blocks match, and `md`'s comes later, so its two columns win. In rem both values share a unit, the comparator compares 48 with 68.75, and the three-column rule comes last.

The same comparator, compiled on 4.3.5:

- `em` sorts before both: `min-[70em]:` came before `min-[1100px]:` and `md:`.
- `max-*` fails the other way round: `max-[600px]:` came before `max-md:`, so below 600 px `max-md:` beats the narrower rule.
- A theme breakpoint in px sorts with the px group: `--breakpoint-wide: 1100px` put `wide:` before `md:`. This is the case Tailwind's docs warn about under [Customizing your theme](https://tailwindcss.com/docs/responsive-design#customizing-your-theme), which says to "always use the same unit for defining your breakpoints", and rem beside the defaults.
- A px value the order happens to suit works: `min-[600px]:` before `md:` is the right order anyway. It fails when a px `min-*` is larger than a rem breakpoint setting the same property on the same element, or a px `max-*` is smaller than one.

## Prevention

- Write every arbitrary breakpoint in rem, px ÷ 16: `min-[68.75rem]:` for 1100 px, `max-[37.5rem]:` for 600 px. A px one that works today breaks once a larger rem breakpoint sets the same property.
- Check a new breakpoint in a browser at a width past it: class-name tests pass either way.

## Related Issues

- `apps/community-game-library/AGENTS.md`, Screens: "One breakpoint for the shell", the app's own line for this rule.
- Tailwind CSS docs, Responsive design: [Customizing your theme](https://tailwindcss.com/docs/responsive-design#customizing-your-theme) (the unit note) and [Using arbitrary values](https://tailwindcss.com/docs/responsive-design#using-arbitrary-values).
