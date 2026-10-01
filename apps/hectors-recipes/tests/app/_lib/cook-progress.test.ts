import { describe, expect, it } from "bun:test";
import {
  parseCookProgress,
  shouldRing,
  timeLeft,
} from "@/app/_lib/cook-progress";

describe("parseCookProgress", () => {
  it("reads what was saved", () => {
    expect(
      parseCookProgress(JSON.stringify({ used: [0, 3], step: 120 })),
    ).toEqual({ used: [0, 3], step: 120, timers: {} });
    expect(
      parseCookProgress(
        JSON.stringify({ used: [], step: 2, timers: { "2": 1_000_000 } }),
      ),
    ).toEqual({ used: [], step: 2, timers: { "2": 1_000_000 } });
    expect(parseCookProgress(JSON.stringify({ used: [], step: null }))).toEqual(
      { used: [], step: null, timers: {} },
    );
  });

  it("starts fresh from nothing, or anything unreadable", () => {
    const fresh = { used: [], step: null, timers: {} };
    expect(parseCookProgress(null)).toEqual(fresh);
    expect(parseCookProgress("not json")).toEqual(fresh);
    expect(parseCookProgress(JSON.stringify({ used: "0,3" }))).toEqual(fresh);
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
