type Point = { x: number; y: number };

// How far a finger must travel sideways, how much more sideways than up or down, and how far
// from the screen's sides it must start: Safari's own back and forward swipes start at the
// edges. Recipes' rule (apps/hectors-recipes/app/_lib/swipe.ts), KTD11.
const MIN_DISTANCE = 60;
const MIN_SIDEWAYS_RATIO = 1.5;
const EDGE = 24;

// Whether a one-finger touch from `start` to `end` was a sideways swipe: to the left for the
// next step, to the right for the one before.
export function swipeDirection(
  start: Point,
  end: Point,
  screenWidth: number,
): "next" | "previous" | null {
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

type KeyPress = {
  key: string;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  // Whether the key went to a field, where the arrows move the cursor.
  inField: boolean;
};

// The arrow keys move between steps, unless they were pressed in a field or with a modifier:
// Alt with an arrow is the browser's own Back and Forward.
export function keyDirection(press: KeyPress): "next" | "previous" | null {
  if (press.inField) return null;
  if (press.altKey || press.ctrlKey || press.metaKey || press.shiftKey) {
    return null;
  }
  if (press.key === "ArrowRight") return "next";
  if (press.key === "ArrowLeft") return "previous";
  return null;
}
