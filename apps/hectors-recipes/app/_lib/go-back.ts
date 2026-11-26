// Whether the app has a page to go back to (docs/ux-plan.md D105). The Navigation API knows
// exactly, counting only this site's pages; without it, any earlier entry in the tab counts.
export function hasEarlierPage(
  navigation: unknown,
  historyLength: number,
): boolean {
  if (
    typeof navigation === "object" &&
    navigation !== null &&
    "canGoBack" in navigation &&
    typeof navigation.canGoBack === "boolean"
  ) {
    return navigation.canGoBack;
  }
  return historyLength > 1;
}

// Opened from the home screen: no browser around it, so no back swipe of its own.
export function isHomeScreenApp(): boolean {
  const standalone: unknown = Reflect.get(navigator, "standalone");
  return (
    standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}
