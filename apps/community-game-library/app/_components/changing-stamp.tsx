"use client";

import { Stamp } from "@/app/_components/stamp";
import { useMoment } from "@/app/_lib/use-moment";
import type { CopyStamp } from "@/src/entities/loan";

// A stamp that can change while its page shows, as a copy's does when you ask to borrow it (none,
// then You asked): it presses when its word changes, arriving included, but not as the page
// first shows (U26's stamp press).
export function ChangingStamp({ stamp }: { stamp: CopyStamp | null }) {
  const moment = useMoment(stamp?.word ?? null);
  if (!stamp) return null;
  return (
    <Stamp key={moment.key} tone={stamp.tone} press={moment.playing}>
      {stamp.word}
    </Stamp>
  );
}
