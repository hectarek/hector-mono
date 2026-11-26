"use client";

import { useEffect } from "react";

// Marks the page ready to tap (`data-ready` on <html>), which hides `PageWait` (docs/ux-plan.md
// D104). It runs once React has taken the page over: from then on a tap works, since React
// takes over any part it hasn't reached yet at once when it's tapped, then lets the tap
// through. The `page-ready` performance mark times the gap against the first paint (P32.1).
export function ReadyMark() {
  useEffect(() => {
    document.documentElement.setAttribute("data-ready", "");
    performance.mark("page-ready");
  }, []);
  return null;
}
