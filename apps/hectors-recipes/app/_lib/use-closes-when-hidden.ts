"use client";

import { useLayoutEffect, useRef } from "react";

// Next.js keeps the last few pages you left alive but hidden (React's Activity, under Cache
// Components), so a sheet or dialog left open would still be open when you come back.
// React runs layout-effect cleanups when it hides a page, as it does on unmount, so this
// closes it then (docs/ux-plan.md D88). `close` may change every render; the latest runs.
export function useClosesWhenHidden(close: () => void): void {
  const latest = useRef(close);
  useLayoutEffect(() => {
    latest.current = close;
  });
  useLayoutEffect(() => () => latest.current(), []);
}
