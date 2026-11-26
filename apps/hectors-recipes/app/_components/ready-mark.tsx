"use client";

import { useEffect } from "react";

// Marks when React has taken over the page (docs/ux-plan.md D104). Every page renders one
// inside its own content, which marks the page ready to tap: `data-ready` on <html>, which
// hides `PageWait`, and a `page-ready` performance mark. It has to be the page's own: React
// takes over the root layout before the page's sections, and a tap on a section it hasn't
// reached, whose code hasn't loaded, is dropped (react-dom's dispatchEvent stops it). The
// root layout's (`of="shell"`) only marks `shell-ready`, so the gap between the two can be
// timed (P32.1).
export function ReadyMark({ of = "page" }: { of?: "shell" | "page" }) {
  useEffect(() => {
    if (of === "page") document.documentElement.setAttribute("data-ready", "");
    performance.mark(`${of}-ready`);
  }, [of]);
  return null;
}
