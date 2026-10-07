import type { Locator, Page } from "@playwright/test";

// A one-finger swipe across the middle of an element, as touch events from the screen
// (Chromium's DevTools protocol): Playwright's own touchscreen only taps.
export async function swipe(
  page: Page,
  on: Locator,
  direction: "left" | "right",
) {
  const box = await on.boundingBox();
  if (!box) throw new Error("Nothing to swipe on");
  const y = box.y + box.height / 2;
  const middle = box.x + box.width / 2;
  const [from, to] =
    direction === "left"
      ? [middle + 75, middle - 75]
      : [middle - 75, middle + 75];
  const screen = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", x?: number) =>
    screen.send("Input.dispatchTouchEvent", {
      type,
      touchPoints: x === undefined ? [] : [{ x, y }],
    });
  await touch("touchStart", from);
  for (let step = 1; step <= 5; step++) {
    await touch("touchMove", from + ((to - from) * step) / 5);
  }
  await touch("touchEnd");
  await screen.detach();
}
