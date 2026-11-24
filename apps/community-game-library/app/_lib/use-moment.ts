"use client";

import { useEffect, useState } from "react";

// A little over the longest moment, the dice tumble's 400ms.
const MOMENT_MS = 450;

// A moment of motion (U26, the design system's Motion): it plays when `value` changes while its
// page is showing, never as the page first shows, and only for a change `passes` allows (a
// piece hops only a space forward). `playing` holds for the moment's length and then goes, as a
// moment plays once: a class left on would play again when a page Next.js kept is shown again,
// since CSS restarts an animation when its element reappears. `key` changes each time it plays,
// so an element keyed on it starts the moment over.
export function useMoment<T>(
  value: T,
  passes: (before: T, now: T) => boolean = () => true,
): { key: number; playing: boolean } {
  const [last, setLast] = useState(value);
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  if (!Object.is(last, value)) {
    setLast(value);
    if (passes(last, value)) {
      setPlays(plays + 1);
      setPlaying(true);
    }
  }
  // Each play starts its own count, so a change during a moment holds it for a full moment.
  useEffect(() => {
    if (plays === 0) return;
    const done = setTimeout(() => setPlaying(false), MOMENT_MS);
    return () => clearTimeout(done);
  }, [plays]);
  return { key: plays, playing };
}
