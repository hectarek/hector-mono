import { describe, expect, it } from "bun:test";
import {
  moveScreen,
  parseCookProgress,
  shouldRing,
  timeLeft,
} from "@/app/_lib/cook-progress";

describe("parseCookProgress", () => {
  it("reads what was saved", () => {
    expect(
      parseCookProgress(JSON.stringify({ used: [0, 3], at: 120 })),
    ).toEqual({ used: [0, 3], at: 120, timers: {} });
    expect(
      parseCookProgress(
        JSON.stringify({ used: [], at: 2, timers: { "2": 1_000_000 } }),
      ),
    ).toEqual({ used: [], at: 2, timers: { "2": 1_000_000 } });
    expect(parseCookProgress(JSON.stringify({ used: [], at: "done" }))).toEqual(
      { used: [], at: "done", timers: {} },
    );
  });

  // Saved before Phase 21, with the highlighted step: its ticks and timers still count.
  it("reads what was saved before screens, from Gather", () => {
    expect(
      parseCookProgress(JSON.stringify({ used: [1], step: 2, timers: {} })),
    ).toEqual({ used: [1], at: "gather", timers: {} });
  });

  it("starts fresh from nothing, or anything unreadable", () => {
    const fresh = { used: [], at: "gather" as const, timers: {} };
    expect(parseCookProgress(null)).toEqual(fresh);
    expect(parseCookProgress("not json")).toEqual(fresh);
    expect(parseCookProgress(JSON.stringify({ used: "0,3" }))).toEqual(fresh);
    expect(
      parseCookProgress(JSON.stringify({ used: [], at: "step 2" })),
    ).toEqual(fresh);
  });
});

// D63: Gather, each step, then Done.
describe("moveScreen", () => {
  const steps = [{ position: 4 }, { position: 7 }];

  it("goes through Gather, each step and Done, in order, stopping at the ends", () => {
    expect(moveScreen("gather", 1, steps)).toBe(4);
    expect(moveScreen(4, 1, steps)).toBe(7);
    expect(moveScreen(7, 1, steps)).toBe("done");
    expect(moveScreen("done", 1, steps)).toBe("done");
    expect(moveScreen("done", -1, steps)).toBe(7);
    expect(moveScreen(4, -1, steps)).toBe("gather");
    expect(moveScreen("gather", -1, steps)).toBe("gather");
  });

  it("counts a step that's gone as Gather", () => {
    expect(moveScreen(99, 1, steps)).toBe(4);
    expect(moveScreen("gather", 1, [])).toBe("done");
  });
});

describe("step timers", () => {
  it("shows the time left, rounding up to the second", () => {
    expect(timeLeft(600_000, 0)).toBe("10:00");
    expect(timeLeft(600_000, 55_500)).toBe("9:05");
    expect(timeLeft(5_400_000, 0)).toBe("1:30:00");
    expect(timeLeft(1000, 5000)).toBe("0:00");
  });

  it("rings when a timer ends while open, not for one that ended a while ago", () => {
    expect(shouldRing(10_000, 9_000)).toBe(false);
    expect(shouldRing(10_000, 11_000)).toBe(true);
    expect(shouldRing(10_000, 60_000)).toBe(false);
  });
});
