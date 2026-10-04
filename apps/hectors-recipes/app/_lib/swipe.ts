export type Point = { x: number; y: number };
export type SwipeDirection = "next" | "previous";

// How far a finger must travel sideways, how much more sideways than up or down, and how far
// from the screen's sides it must start (Safari's back and forward start at the edges, D22).
const MIN_DISTANCE = 60;
const MIN_SIDEWAYS_RATIO = 1.5;
const EDGE = 24;

// Whether a touch from `start` to `end` was a sideways swipe (docs/ux-plan.md D51): to the
// left for what comes next, to the right for what came before.
export function swipeDirection(
  start: Point,
  end: Point,
  screenWidth: number,
): SwipeDirection | null {
  if (start.x < EDGE || start.x > screenWidth - EDGE) return null;
  const sideways = end.x - start.x;
  const vertical = Math.abs(end.y - start.y);
  if (
    Math.abs(sideways) < MIN_DISTANCE ||
    Math.abs(sideways) < vertical * MIN_SIDEWAYS_RATIO
  ) {
    return null;
  }
  return sideways < 0 ? "next" : "previous";
}
