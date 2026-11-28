import { describe, expect, it } from "bun:test";
import {
  allocateRounded,
  formatCompactDollars,
  formatDate,
  formatDollars,
  formatPercent,
  formatYears,
} from "@/src/finance/format";

describe("formatDollars", () => {
  it.each([
    [233_979.37, "$233,979"],
    [1_466_783.51, "$1,466,784"],
    [0, "$0"],
    [-1447, "-$1,447"],
  ])("shows %p as %p, in whole dollars", (amount, shown) => {
    expect(formatDollars(amount)).toBe(shown);
  });
});

describe("formatPercent", () => {
  it.each([
    [7, "7%"],
    [6.5, "6.5%"],
    [0, "0%"],
  ])("shows %p as %p", (value, shown) => {
    expect(formatPercent(value)).toBe(shown);
  });
});

describe("formatCompactDollars", () => {
  it.each([
    [250_000, "$250K"],
    [1_500_000, "$1.5M"],
    [0, "$0"],
  ])("shows %p as %p, for a chart's axis", (amount, shown) => {
    expect(formatCompactDollars(amount)).toBe(shown);
  });
});

describe("formatYears", () => {
  it("says year for one and years for more", () => {
    expect(formatYears(1)).toBe("1 year");
    expect(formatYears(30)).toBe("30 years");
    expect(formatYears(0)).toBe("0 years");
  });
});

describe("formatDate", () => {
  it("shows a constant date in words, on the day it says", () => {
    expect(formatDate("2026-11-28")).toBe("November 28, 2026");
  });
});

// docs/finance-math.md, "Showing numbers".
describe("format never prints NaN, infinity or -$0", () => {
  const formatters = [
    formatDollars,
    formatPercent,
    formatCompactDollars,
  ] as const;

  it.each([
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -0,
    -0.4,
  ])("for %p", (value) => {
    for (const format of formatters) {
      const shown = format(value);
      expect(shown).not.toContain("NaN");
      expect(shown).not.toContain("∞");
      expect(shown.toLowerCase()).not.toContain("infinity");
      expect(shown).not.toMatch(/^-\$?0%?$/);
    }
  });
});

describe("allocateRounded", () => {
  it("rounds the parts so they add up to the rounded total (example 9)", () => {
    const parts = allocateRounded([1210.45, 300.4, 99.3]);
    expect(parts).toEqual([1211, 300, 99]);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(1610);
    // Rounding each part on its own is a dollar short of the rounded total.
    expect(Math.round(1210.45) + Math.round(300.4) + Math.round(99.3)).toBe(
      1609,
    );
  });

  it("adds up with a part below zero, as in today's dollars at a 0% return", () => {
    const parts = allocateRounded([10_376.2406, -1447.1136]);
    expect(parts).toEqual([10_376, -1447]);
    expect(parts.reduce((sum, part) => sum + part, 0)).toBe(8929);
  });

  it("leaves whole parts as they are", () => {
    expect(allocateRounded([72_000, 161_979.37])).toEqual([72_000, 161_979]);
  });
});
