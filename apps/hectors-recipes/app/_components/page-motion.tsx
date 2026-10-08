import { type ReactNode, ViewTransition } from "react";

// How a page moves in and out (docs/ux-plan.md D89; AGENTS.md's UI Rules, Motion between
// screens). The link you tapped names the move with its `transitionTypes`; anything else (the
// browser's Back, a refresh, a save) moves nothing. One map serves every page, since the
// page coming in and the one going out are told apart: on `open-cook-mode` cook mode rises
// over the recipe, which stays put under it. The classes are styled in `app/globals.css`.
const ENTER = {
  "go-deeper": "go-deeper",
  "go-back": "go-back",
  "switch-tab": "switch-tab",
  "open-cook-mode": "cook-rise",
  "close-cook-mode": "cook-under",
  default: "none",
};
const EXIT = {
  "go-deeper": "go-deeper",
  "go-back": "go-back",
  "switch-tab": "switch-tab",
  "open-cook-mode": "cook-under",
  "close-cook-mode": "cook-lower",
  default: "none",
};

// Around a loading screen: it fades out as its page arrives (D89). Only a skeleton fades, so
// coming back to a page Next.js kept, which has none, moves nothing.
export function SkeletonMotion({ children }: { children: ReactNode }) {
  return (
    <ViewTransition exit="skeleton-out" default="none">
      {children}
    </ViewTransition>
  );
}

// In each page.tsx, around everything the page shows: `(main)`'s layout never comes in or
// goes out. Cook mode's is the exception: it comes and goes with its one page.
export function PageMotion({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter={ENTER} exit={EXIT} default="none">
      {children}
    </ViewTransition>
  );
}
