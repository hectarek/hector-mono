"use client";

import { cn } from "@repo/ui/lib/utils";
import { useRouter } from "next/navigation";
import { type ReactNode, type TouchEvent, useEffect, useRef } from "react";
import { type Point, swipeDirection } from "@/app/_lib/swipe";

// The week Plan last showed. Kept outside the component because the loading screen between
// weeks unmounts it, and a new week slides in from the side it came from (D54).
let shownWeek: string | undefined;

// The week, swipeable on a phone (docs/ux-plan.md D51): left for the next week, right for the
// one before, as the arrows do. Up-and-down scrolling and pinch zoom stay the browser's. A new
// week slides in briefly from its side, whether swiped or chosen with an arrow (D54).
export function WeekSwipe({
  week,
  previousHref,
  nextHref,
  children,
}: {
  // The week shown, as its Monday ("YYYY-MM-DD", so later weeks sort after earlier ones).
  week: string;
  previousHref: string;
  nextHref: string;
  children: ReactNode;
}) {
  const router = useRouter();
  // Where the one finger on the week went down; null once a second one joins (a pinch).
  const start = useRef<Point | null>(null);
  const slideFrom =
    shownWeek === undefined || shownWeek === week
      ? null
      : week > shownWeek
        ? "right"
        : "left";
  useEffect(() => {
    shownWeek = week;
  }, [week]);

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
      className="touch-pan-y touch-pinch-zoom"
      onTouchStart={begin}
      onTouchEnd={end}
      onTouchCancel={() => {
        start.current = null;
      }}
    >
      {/* Keyed by week, so the slide plays even when the page isn't remounted. */}
      <div
        key={week}
        className={cn(
          "flex flex-col gap-4",
          slideFrom &&
            "animate-in fade-in duration-200 motion-reduce:animate-none",
          slideFrom === "right" && "slide-in-from-right-6",
          slideFrom === "left" && "slide-in-from-left-6",
        )}
      >
        {children}
      </div>
    </div>
  );
}
