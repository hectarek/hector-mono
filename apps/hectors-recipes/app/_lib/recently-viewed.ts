// When each recipe was last opened on this device (docs/ux-plan.md D76): kept in the browser,
// never the database, for the library's Recently viewed order. The newest MAX_KEPT are kept.
const KEY = "recently-viewed";
const MAX_KEPT = 200;

export function viewedAt(): Record<string, number> {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "{}");
    if (typeof stored !== "object" || stored === null) return {};
    return Object.fromEntries(
      Object.entries(stored).filter(
        (entry): entry is [string, number] => typeof entry[1] === "number",
      ),
    );
  } catch {
    // Storage can be off (a private window) or hold something else: start over.
    return {};
  }
}

export function rememberView(recipeId: string, at = Date.now()): void {
  const newest = Object.entries({ ...viewedAt(), [recipeId]: at })
    .sort(([, a], [, b]) => b - a)
    .slice(0, MAX_KEPT);
  try {
    localStorage.setItem(KEY, JSON.stringify(Object.fromEntries(newest)));
  } catch {
    // Full or off: the order just won't know this one.
  }
}
