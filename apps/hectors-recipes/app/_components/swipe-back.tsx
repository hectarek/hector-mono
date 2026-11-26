"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { hasEarlierPage, isHomeScreenApp } from "@/app/_lib/go-back";
import { type Point, swipeDirection } from "@/app/_lib/swipe";

// A swipe right anywhere on the page goes back to the previous page, as the browser's Back
// does (docs/ux-plan.md D105), by the same rule as the week's and cook mode's swipes. With no
// earlier page in the app, it goes where the back link goes, sliding back. Back itself plays
// no slide: `router.back()` takes no transition type, and React gives a type only to the
// transition it's added in, which a Back's arrives after. A swipe that starts in an open sheet
// is the sheet's.
export function SwipeBack({ href }: { href: string }) {
  const router = useRouter();

  useEffect(() => {
    // Where the one finger went down; null once a second one joins (a pinch).
    let start: Point | null = null;

    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      const inSheet =
        event.target instanceof Element &&
        event.target.closest('[role="dialog"]') !== null;
      start =
        event.touches.length === 1 && touch && !inSheet
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    };
    const onEnd = (event: TouchEvent) => {
      const from = start;
      const touch = event.changedTouches[0];
      start = null;
      if (!from || !touch) return;
      const direction = swipeDirection(
        from,
        { x: touch.clientX, y: touch.clientY },
        window.innerWidth,
        { fromEdges: isHomeScreenApp() },
      );
      if (direction !== "previous") return;
      if (hasEarlierPage(Reflect.get(window, "navigation"), history.length)) {
        router.back();
      } else {
        router.push(href, { transitionTypes: ["go-back"] });
      }
    };
    const onCancel = () => {
      start = null;
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd);
    document.addEventListener("touchcancel", onCancel);
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
      document.removeEventListener("touchcancel", onCancel);
    };
  }, [router, href]);

  return null;
}
