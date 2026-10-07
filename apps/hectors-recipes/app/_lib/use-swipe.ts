"use client";

import { type TouchEvent, useRef } from "react";
import { type Point, swipeDirection } from "@/app/_lib/swipe";

// Touch handlers for a sideways swipe (docs/ux-plan.md D51): `onSwipe(1)` for a swipe left, to
// what comes next, and `onSwipe(-1)` for a swipe right, to what came before. Spread them on an
// element that's `touch-pan-y touch-pinch-zoom`, so up-and-down scrolling and pinch zoom stay
// the browser's.
export function useSwipe(onSwipe: (by: 1 | -1) => void) {
  // Where the one finger went down; null once a second one joins (a pinch).
  const start = useRef<Point | null>(null);
  return {
    onTouchStart: (event: TouchEvent) => {
      const touch = event.touches[0];
      start.current =
        event.touches.length === 1 && touch
          ? { x: touch.clientX, y: touch.clientY }
          : null;
    },
    onTouchEnd: (event: TouchEvent) => {
      const from = start.current;
      const touch = event.changedTouches[0];
      start.current = null;
      if (!from || !touch) return;
      const direction = swipeDirection(
        from,
        { x: touch.clientX, y: touch.clientY },
        window.innerWidth,
      );
      if (direction) onSwipe(direction === "next" ? 1 : -1);
    },
    onTouchCancel: () => {
      start.current = null;
    },
  };
}
