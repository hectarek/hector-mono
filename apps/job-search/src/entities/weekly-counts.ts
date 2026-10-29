import type { JobStatus } from "./job-lifecycle";
import type { WeeklyCount } from "./models/settings.model";
import { addDays } from "./week";

// A week's counts (R10, KTD9), each against Hector's target for it (R12): messages sent,
// conversations held (an interview round is never one), applications (accepted jobs whose
// applied-on falls in the week), practice sessions (reviews aren't sessions), and moves into
// screen or beyond. A week runs Monday to Sunday in Eastern time, and each count reads the day a
// thing happened, never when it was logged.
export type WeeklyCounts = Record<WeeklyCount, number>;

// The statuses a move into counts toward screensReached: screen and each stage after it, an
// offer's outcome included.
export const SCREEN_OR_BEYOND: readonly JobStatus[] = [
  "screen",
  "onsite",
  "offer",
  "offer-accepted",
  "offer-declined",
];

// The week's first and last days, both counted.
export function weekRange(monday: string): { from: string; to: string } {
  return { from: monday, to: addDays(monday, 6) };
}
