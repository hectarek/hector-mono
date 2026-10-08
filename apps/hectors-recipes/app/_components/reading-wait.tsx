"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { ProduceArt } from "@/app/_components/produce-art";
import type { Produce } from "@/app/_components/produce-tile";

const ROW: Produce[] = ["tomato", "carrot", "lemon", "basil", "plum"];

// One hop, then a rest: a wave runs along the row every WAVE_MS, each drawing STAGGER_MS after
// the one before it.
const WAVE_MS = 1600;
const STAGGER_MS = 140;
const HOP = [
  { transform: "translateY(0) rotate(0deg)", offset: 0 },
  { transform: "translateY(-0.75rem) rotate(-8deg)", offset: 0.18 },
  { transform: "translateY(0) rotate(0deg)", offset: 0.36 },
  { transform: "translateY(0) rotate(0deg)", offset: 1 },
];

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// The wait while the recipe reader works (ux-plan D75): the welcome screen's produce row,
// hopping in a wave, over the same plain words. Still with reduced motion. Not a bold moment
// (D75): a little play for up to a minute of waiting.
export function ReadingWait({ children }: { children: ReactNode }) {
  const row = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const hops = Array.from(row.current?.children ?? []).map(
      (drawing, index) => {
        const hop = drawing.animate(HOP, {
          duration: WAVE_MS,
          delay: index * STAGGER_MS,
          iterations: Number.POSITIVE_INFINITY,
          easing: "ease-in-out",
        });
        // Cancelling rejects `finished`, and nothing waits on a hop that never ends.
        hop.finished.catch(() => {});
        return hop;
      },
    );
    return () => {
      for (const hop of hops) hop.cancel();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-6" aria-live="polite">
      <div ref={row} className="flex items-end gap-3" aria-hidden>
        {ROW.map((produce) => (
          <ProduceArt key={produce} produce={produce} className="size-10" />
        ))}
      </div>
      <p className="text-muted-foreground text-center text-sm">{children}</p>
    </div>
  );
}
