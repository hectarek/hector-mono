import { describe, expect, it } from "bun:test";
import { swipeDirection } from "@/app/_lib/swipe";

const WIDTH = 375;
const from = { x: 200, y: 300 };

describe("swipeDirection", () => {
  it("reads a swipe to the left as next, and to the right as previous", () => {
    expect(swipeDirection(from, { x: 100, y: 320 }, WIDTH)).toBe("next");
    expect(swipeDirection(from, { x: 300, y: 280 }, WIDTH)).toBe("previous");
  });

  it("ignores a short move and a mostly vertical one (a scroll)", () => {
    expect(swipeDirection(from, { x: 160, y: 300 }, WIDTH)).toBeNull();
    expect(swipeDirection(from, { x: 120, y: 380 }, WIDTH)).toBeNull();
  });

  it("leaves a swipe from either side of the screen to the browser", () => {
    expect(
      swipeDirection({ x: 10, y: 300 }, { x: 200, y: 300 }, WIDTH),
    ).toBeNull();
    expect(
      swipeDirection({ x: 365, y: 300 }, { x: 150, y: 300 }, WIDTH),
    ).toBeNull();
  });
});
