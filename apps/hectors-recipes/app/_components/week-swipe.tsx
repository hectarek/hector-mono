"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, type TouchEvent, useRef } from "react";
import { type Point, swipeDirection } from "@/app/_lib/swipe";

// The week, swipeable on a phone (docs/ux-plan.md D51): left for the next week, right for the
// one before, as the arrows do. Up-and-down scrolling and pinch zoom stay the browser's.
export function WeekSwipe({
  previousHref,
  nextHref,
  children,
}: {
  previousHref: string;
  nextHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  // Where the one finger on the week went down; null once a second one joins (a pinch).
  const start = useRef<Point | null>(null);

  function begin(event: TouchEvent) {
    const touch = event.touches[0];
    start.current =
      event.touches.length === 1 && touch
        ? { x: touch.clientX, y: touch.clientY }
        : null;
  }

  function end(event: TouchEvent) {
    const from = start.current;
    const touch = event.changedTouches[0];
    start.current = null;
    if (!from || !touch) return;
    const direction = swipeDirection(
      from,
      { x: touch.clientX, y: touch.clientY },
      window.innerWidth,
    );
    if (direction) router.push(direction === "next" ? nextHref : previousHref);
  }

  return (
    <div
      className="flex touch-pan-y touch-pinch-zoom flex-col gap-4"
      onTouchStart={begin}
      onTouchEnd={end}
      onTouchCancel={() => {
        start.current = null;
      }}
    >
      {children}
    </div>
  );
}
