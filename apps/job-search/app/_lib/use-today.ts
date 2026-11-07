"use client";

import { useState } from "react";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// Today in Eastern time (KTD18), as a date field's default. A page can stay open past midnight,
// so it's read again with `refresh` when a sheet opens or a move starts. The clock is read in
// state and events, never while rendering: rendering must be pure, which the React Compiler
// relies on. A field left at the default sends no date, so the server dates the write itself.
// Given "" (not yet read), it reads the clock only on `refresh`: a component in the shell is
// prerendered, where reading the clock fails `next build` (Cache Components), so it reads it when
// its sheet opens (the quick log).
export function useToday(initial?: string) {
  const [today, setToday] = useState(() => initial ?? todayIn(PLAN_TIME_ZONE));
  return { today, refresh: () => setToday(todayIn(PLAN_TIME_ZONE)) };
}
