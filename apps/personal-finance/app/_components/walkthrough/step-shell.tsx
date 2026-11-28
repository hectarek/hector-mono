"use client";

import { useRouter } from "next/navigation";
import {
  type ReactNode,
  type TouchEvent,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { keyDirection, swipeDirection } from "@/src/lib/swipe";

// Set after the first step a reader sees, so arriving cold from a texted link leaves focus where
// the browser puts it, and every step after that takes focus to its heading.
let arrived = false;

// Where a swipe must not start: anything a finger uses for itself (KTD11).
const OWN_GESTURES =
  "input, textarea, select, button, [role='slider'], [data-swipe-ignore], .overflow-x-auto";

// A walkthrough step's gestures: a sideways swipe or the arrow keys move a step, and each step
// change moves focus to the new heading, since the step's title is the only thing that changed
// for a screen reader (R23). Next keeps visited steps mounted but hidden, and hides their effects
// with them, so only the step on screen listens for keys.
export function StepShell({
  previous,
  next,
  children,
}: {
  previous: string | null;
  next: string | null;
  children: ReactNode;
}) {
  const router = useRouter();
  const shell = useRef<HTMLDivElement>(null);
  const start = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback(
    (direction: "next" | "previous" | null) => {
      const to = direction === null ? null : { next, previous }[direction];
      if (to) router.push(to);
    },
    [next, previous, router],
  );

  useEffect(() => {
    if (arrived) {
      shell.current?.querySelector<HTMLElement>("[data-step-heading]")?.focus();
    }
    arrived = true;
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target instanceof Element ? event.target : null;
      const direction = keyDirection({
        key: event.key,
        altKey: event.altKey,
        ctrlKey: event.ctrlKey,
        metaKey: event.metaKey,
        shiftKey: event.shiftKey,
        inField: Boolean(
          target?.closest("input, textarea, select, [contenteditable]"),
        ),
      });
      go(direction);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [go]);

  function onTouchStart(event: TouchEvent) {
    const touch = event.touches[0];
    const zoomed = (window.visualViewport?.scale ?? 1) > 1;
    const onOwnGesture =
      event.target instanceof Element && event.target.closest(OWN_GESTURES);
    start.current =
      event.touches.length === 1 && touch && !zoomed && !onOwnGesture
        ? { x: touch.clientX, y: touch.clientY }
        : null;
  }

  function onTouchEnd(event: TouchEvent) {
    const from = start.current;
    const touch = event.changedTouches[0];
    start.current = null;
    if (!from || !touch) return;
    const direction = swipeDirection(
      from,
      { x: touch.clientX, y: touch.clientY },
      window.innerWidth,
    );
    go(direction);
  }

  return (
    <div
      ref={shell}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        start.current = null;
      }}
      className="touch-pan-y touch-pinch-zoom"
    >
      {children}
    </div>
  );
}
