import { describe, expect, it } from "bun:test";
import { GROWTH_EXAMPLE } from "@/src/finance/assumptions";
import { describeGrowth, type GrowthInput, growth } from "@/src/finance/growth";

// To the cent, as docs/finance-math.md states them: never a looser tolerance.
const cents = (amount: number) => Math.round(amount * 100) / 100;

const nothing: GrowthInput = {
  start: 0,
  deposit: 0,
  frequency: "yearly",
  years: 0,
  depositYears: null,
  rate: 0,
  inflation: null,
};

describe("growth: the worked examples", () => {
  it("example 1: $1,000 a year for 30 years at 8%, from nothing, comes to $122,345.87", () => {
    const result = growth({
      ...nothing,
      deposit: 1000,
      years: 30,
      rate: 0.08,
    });
    expect(cents(result.total)).toBe(122_345.87);
    expect(result.putIn).toBe(30_000);
  });

  it("example 2: $1,000 a year for 10 years at 8%, then no deposits until year 40, comes to $157,435.17", () => {
    const result = growth({
      ...nothing,
      deposit: 1000,
      years: 40,
      depositYears: 10,
      rate: 0.08,
    });
    expect(cents(result.total)).toBe(157_435.17);
    expect(result.putIn).toBe(10_000);
  });

  it("example 3: $200 a month for 40 years at 11% comes to $1,466,783.51", () => {
    const result = growth({
      ...nothing,
      deposit: 200,
      frequency: "monthly",
      years: 40,
      rate: 0.11,
    });
    expect(cents(result.total)).toBe(1_466_783.51);
    expect(result.putIn).toBe(96_000);
  });

  it("example 4: at 0%, $100 a month for 10 years comes to exactly $12,000, with no NaN", () => {
    const result = growth({
      ...nothing,
      deposit: 100,
      frequency: "monthly",
      years: 10,
    });
    expect(result.total).toBe(12_000);
    expect(result.earned).toBe(0);
    for (const year of result.byYear) {
      expect(Number.isFinite(year.total)).toBe(true);
      expect(Number.isFinite(year.putIn)).toBe(true);
    }
  });

  it("example 5: 0 years returns the starting amount", () => {
    const result = growth({
      ...nothing,
      start: 5000,
      deposit: 200,
      frequency: "monthly",
      rate: 0.07,
    });
    expect(result.total).toBe(5000);
    expect(result.putIn).toBe(5000);
    expect(result.byYear).toEqual([{ year: 0, putIn: 5000, total: 5000 }]);
  });

  it("example 6: the page's example comes to $233,979.37 from $72,000", () => {
    const input = exampleInput(null);
    const result = growth(input);
    expect(cents(result.total)).toBe(233_979.37);
    expect(result.putIn).toBe(72_000);
    const today = growth(exampleInput(0.03));
    expect(Math.round(today.total)).toBe(96_396);
    expect(Math.round(today.putIn)).toBe(47_684);
  });
});

describe("growth: the year-by-year series", () => {
  it("has a row for the start and each year, ending at the totals", () => {
    const result = growth({
      ...nothing,
      start: 1000,
      deposit: 1000,
      years: 3,
      rate: 0.1,
    });
    expect(result.byYear.map((row) => row.year)).toEqual([0, 1, 2, 3]);
    expect(result.byYear[0]).toEqual({ year: 0, putIn: 1000, total: 1000 });
    // Start of year 1: 1,000 + 1,000, grown 10% = 2,200.
    expect(cents(result.byYear[1]?.total ?? 0)).toBe(2200);
    expect(result.byYear.at(-1)).toEqual({
      year: 3,
      putIn: result.putIn,
      total: result.total,
    });
  });
});

describe("growth in today's dollars", () => {
  it("example 7: $1,000 a year for 30 years, at the start of each year, with 3% inflation shows about $20,188 put in", () => {
    const input: GrowthInput = {
      ...nothing,
      deposit: 1000,
      years: 30,
      rate: 0.08,
    };
    const result = growth({ ...input, inflation: 0.03 });
    expect(cents(result.putIn)).toBe(20_188.45);
    // Each year's total is example 1's, divided by (1 + inflation)^year.
    const asTheyllBe = growth(input);
    result.byYear.forEach((row, year) => {
      expect(row.total).toBe(
        (asTheyllBe.byYear[year]?.total ?? Number.NaN) / 1.03 ** year,
      );
    });
  });

  it("example 8: at a 0% return and 3% inflation, the total is below what was put in, and the sentence names inflation", () => {
    const input: GrowthInput = {
      ...nothing,
      deposit: 100,
      frequency: "monthly",
      years: 10,
      inflation: 0.03,
    };
    const result = growth(input);
    expect(cents(result.total)).toBe(8929.13);
    expect(cents(result.putIn)).toBe(10_376.24);
    expect(result.total).toBeLessThan(result.putIn);
    expect(describeGrowth(input, result)).toBe(
      "Putting in $100 a month for 10 years at 0% a year, you'd have about $8,929 in today's dollars, at 3% inflation: less than the $10,376 you put in, because inflation makes each dollar buy less.",
    );
  });
});

describe("describeGrowth", () => {
  it("restates the main inputs and the rounded total in one sentence", () => {
    const input = exampleInput(null);
    expect(describeGrowth(input, growth(input))).toBe(
      "Putting in $200 a month for 30 years at 7% a year, you'd have about $233,979.",
    );
  });

  it("names a starting amount and deposits that stop early", () => {
    const input: GrowthInput = {
      ...nothing,
      start: 5000,
      deposit: 1000,
      years: 40,
      depositYears: 10,
      rate: 0.08,
    };
    expect(describeGrowth(input, growth(input))).toBe(
      "Starting with $5,000 and putting in $1,000 a year for 10 years, then letting it grow until year 40, at 8% a year, you'd have about $266,058.",
    );
  });

  it("says when it's in today's dollars", () => {
    const input = exampleInput(0.03);
    expect(describeGrowth(input, growth(input))).toBe(
      "Putting in $200 a month for 30 years at 7% a year, you'd have about $96,396 in today's dollars, at 3% inflation.",
    );
  });
});

function exampleInput(inflation: number | null): GrowthInput {
  return {
    start: GROWTH_EXAMPLE.start.value,
    deposit: GROWTH_EXAMPLE.deposit.value,
    frequency: GROWTH_EXAMPLE.frequency,
    years: GROWTH_EXAMPLE.years.value,
    depositYears: null,
    rate: GROWTH_EXAMPLE.rate.value / 100,
    inflation,
  };
}
