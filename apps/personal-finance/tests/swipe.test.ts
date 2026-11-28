import { describe, expect, it } from "bun:test";
import { swipeDirection } from "@/src/lib/swipe";

const WIDTH = 375;

describe("swipeDirection", () => {
  it("reads a long sideways swipe to the left as next, and to the right as previous", () => {
    expect(swipeDirection({ x: 300, y: 400 }, { x: 150, y: 410 }, WIDTH)).toBe(
      "next",
    );
    expect(swipeDirection({ x: 80, y: 400 }, { x: 230, y: 395 }, WIDTH)).toBe(
      "previous",
    );
  });

  it("ignores a swipe that starts within 24px of either edge, where Safari's own back swipe lives", () => {
    expect(
      swipeDirection({ x: 10, y: 400 }, { x: 200, y: 400 }, WIDTH),
    ).toBeNull();
    expect(
      swipeDirection({ x: 365, y: 400 }, { x: 150, y: 400 }, WIDTH),
    ).toBeNull();
  });

  it("ignores a swipe shorter than 60px", () => {
    expect(
      swipeDirection({ x: 200, y: 400 }, { x: 145, y: 400 }, WIDTH),
    ).toBeNull();
  });

  it("ignores a move that isn't at least 1.5 times as sideways as it is up or down", () => {
    expect(
      swipeDirection({ x: 300, y: 300 }, { x: 200, y: 380 }, WIDTH),
    ).toBeNull();
  });
});

describe("keyDirection", () => {
  const plain = {
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    inField: false,
  };

  it("moves to the next step on the right arrow and back on the left", async () => {
    const { keyDirection } = await import("@/src/lib/swipe");
    expect(keyDirection({ ...plain, key: "ArrowRight" })).toBe("next");
    expect(keyDirection({ ...plain, key: "ArrowLeft" })).toBe("previous");
    expect(keyDirection({ ...plain, key: "ArrowDown" })).toBeNull();
  });

  it("ignores an arrow pressed inside a field, or with a modifier such as Alt (the browser's own Back)", async () => {
    const { keyDirection } = await import("@/src/lib/swipe");
    expect(
      keyDirection({ ...plain, key: "ArrowRight", inField: true }),
    ).toBeNull();
    expect(
      keyDirection({ ...plain, key: "ArrowLeft", altKey: true }),
    ).toBeNull();
    expect(
      keyDirection({ ...plain, key: "ArrowRight", metaKey: true }),
    ).toBeNull();
  });
});
