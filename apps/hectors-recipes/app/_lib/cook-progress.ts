import { z } from "zod";

// Where you are in a recipe while cooking: the ingredients crossed off (by line position),
// the step you're on (by its position), and each running step timer's end, as a time.
// Kept for the browser session, so a phone reloading the page after you switch apps
// doesn't lose it.
const cookProgressSchema = z.object({
  used: z.array(z.number().int()),
  step: z.number().int().nullable(),
  timers: z.record(z.string(), z.number()).default({}),
});
export type CookProgress = z.infer<typeof cookProgressSchema>;

export const NO_PROGRESS: CookProgress = { used: [], step: null, timers: {} };

export const cookProgressKey = (recipeId: string) =>
  `cook-progress:${recipeId}`;

// Anything unreadable starts fresh rather than breaking cook mode.
export function parseCookProgress(raw: string | null): CookProgress {
  try {
    const parsed = cookProgressSchema.safeParse(JSON.parse(raw ?? "null"));
    return parsed.success ? parsed.data : NO_PROGRESS;
  } catch {
    return NO_PROGRESS;
  }
}

// Time left on a timer, as the step shows it: "9:05", or "1:02:30" past an hour.
export function timeLeft(endsAt: number, now: number): string {
  const seconds = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = String(seconds % 60).padStart(2, "0");
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}`
    : `${minutes}:${rest}`;
}

// A timer rings when it ends while cook mode is open, not when the page opens on one that
// ended a while ago.
export const RING_WINDOW_MS = 5000;
export function shouldRing(endsAt: number, now: number): boolean {
  return endsAt <= now && now - endsAt < RING_WINDOW_MS;
}
