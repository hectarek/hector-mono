"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// How often a refresh that waited checks whether it can go ahead.
const CATCH_UP_MS = 2_000;

// Whether a refresh now would get in the way: a sheet or a dialog is open, or a field has focus.
function inTheWay(): boolean {
  if (document.querySelector('[role="dialog"], [role="alertdialog"]')) {
    return true;
  }
  const focused = document.activeElement;
  return (
    focused instanceof HTMLInputElement ||
    focused instanceof HTMLTextAreaElement ||
    focused instanceof HTMLSelectElement ||
    (focused instanceof HTMLElement && focused.isContentEditable)
  );
}

// Re-fetches the page's server data every so often while it's on screen, and on coming back to
// it, so Claude's changes show while Hector watches (R22, docs/build-plan.md KTD15). Copied from
// recipes. It waits while a sheet is open or a field has focus, so a refresh never closes a sheet
// or moves a row under a finger, and catches up once they're done (R22 as revised 2026-11-07, the
// UX plan's Q10).
export function AutoRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    let waiting = false;
    // With no signal a refresh can't load, and Next.js answers a failed one with a full page
    // load, so it waits, and the "online" event refreshes as soon as the signal is back.
    const refreshIfVisible = () => {
      if (document.visibilityState !== "visible" || !navigator.onLine) {
        return;
      }
      if (inTheWay()) {
        waiting = true;
        return;
      }
      waiting = false;
      router.refresh();
    };
    const catchUp = () => {
      if (waiting) refreshIfVisible();
    };
    const timer = setInterval(refreshIfVisible, intervalMs);
    const catchUpTimer = setInterval(catchUp, CATCH_UP_MS);
    document.addEventListener("visibilitychange", refreshIfVisible);
    window.addEventListener("online", refreshIfVisible);
    return () => {
      clearInterval(timer);
      clearInterval(catchUpTimer);
      document.removeEventListener("visibilitychange", refreshIfVisible);
      window.removeEventListener("online", refreshIfVisible);
    };
  }, [router, intervalMs]);

  return null;
}
