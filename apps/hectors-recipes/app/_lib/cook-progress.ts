import { z } from "zod";

// Cook mode's screens, one at a time (docs/ux-plan.md D63): Gather, then each step by its
// position. The last step finishes (D95); progress saved on the Done screen before that
// reads as unreadable, so it starts fresh.
const cookScreenSchema = z.union([z.literal("gather"), z.number().int()]);
export type CookScreen = z.infer<typeof cookScreenSchema>;

// Where you are in a recipe while cooking: the ingredients crossed off (by line position),
// the screen you're on, and each running step timer's end, as a time. Kept for the browser
// session, so a phone reloading the page after you switch apps doesn't lose it.
const cookProgressSchema = z.object({
  used: z.array(z.number().int()),
  at: cookScreenSchema.default("gather"),
  timers: z.record(z.string(), z.number()).default({}),
});
export type CookProgress = z.infer<typeof cookProgressSchema>;

export const NO_PROGRESS: CookProgress = { used: [], at: "gather", timers: {} };

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

// The screen `by` away (1 for Next, -1 for Back), stopping at Gather and the last step. A
// step that's no longer in the recipe (edited since) counts as Gather.
export function moveScreen(
  at: CookScreen,
  by: 1 | -1,
  steps: { position: number }[],
): CookScreen {
  const screens: CookScreen[] = [
    "gather",
    ...steps.map((step) => step.position),
  ];
  const index = Math.max(0, screens.indexOf(at));
  return screens[Math.min(screens.length - 1, Math.max(0, index + by))] ?? at;
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
const RING_WINDOW_MS = 5000;
export function shouldRing(endsAt: number, now: number): boolean {
  return endsAt <= now && now - endsAt < RING_WINDOW_MS;
}
