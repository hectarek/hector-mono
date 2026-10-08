"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// Next.js keeps the last few pages you left alive but hidden (React's Activity, under Cache
// Components), so a sheet, dialog or video left open would still be open when you come back
// (docs/ux-plan.md D88). React holds a hidden page's updates until it shows the page again,
// so a close made as the page hides lands only after you're back, with the sheet on screen
// for a moment and a video playing on meanwhile. This closes it as you leave instead, while
// the page still shows: on a tap on a link, or on Back or Forward. Leaving another way (a
// save that redirects) still closes it, through the cleanup when the page hides.
//
// It returns a key for the sheet or dialog: it changes as you leave, so the sheet goes at
// once. Closed the usual way, it would start its closing animation, and the next page can
// hide it before that runs, leaving it open on screen when you come back.
// `close` may change every render; the latest runs.
export function useClosesOnLeave(close: () => void): number {
  const latest = useRef(close);
  const [leaves, setLeaves] = useState(0);
  useLayoutEffect(() => {
    latest.current = close;
  });
  useEffect(() => {
    const leave = () => {
      latest.current();
      setLeaves((count) => count + 1);
    };
    const onLinkTap = (event: MouseEvent) => {
      if (leavesThePage(event)) leave();
    };
    // Capture, so it runs before the link's own handler starts the navigation.
    document.addEventListener("click", onLinkTap, true);
    window.addEventListener("popstate", leave);
    return () => {
      document.removeEventListener("click", onLinkTap, true);
      window.removeEventListener("popstate", leave);
    };
  }, []);
  useLayoutEffect(
    () => () => {
      latest.current();
      setLeaves((count) => count + 1);
    },
    [],
  );
  return leaves;
}

// A plain tap on a link that opens in this tab. A new tab, or a link that downloads, leaves
// the page as it is.
function leavesThePage(event: MouseEvent): boolean {
  if (
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey
  ) {
    return false;
  }
  const link =
    event.target instanceof Element ? event.target.closest("a[href]") : null;
  return (
    link !== null &&
    link.getAttribute("target") !== "_blank" &&
    !link.hasAttribute("download")
  );
}
