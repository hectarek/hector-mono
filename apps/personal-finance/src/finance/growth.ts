import { formatDollars, formatPercent, formatYears } from "./format";
import type { FieldRule } from "./parse";

export type DepositFrequency = "monthly" | "yearly";

// The deposit field and the end of its fix message, shared by /compound-growth and the
// walkthrough's growth examples so the two ask for a deposit the same way.
export const DEPOSIT_RULE = {
  unit: "dollars",
  noun: "a deposit",
} as const satisfies FieldRule;
export const GROWTH_PURPOSE = "to see what it grows to";

export type GrowthInput = {
  start: number;
  deposit: number;
  frequency: DepositFrequency;
  years: number;
  // How many years the deposits go in for; null: every year.
  depositYears: number | null;
  // The yearly return, as a fraction (0.07 for 7%).
  rate: number;
  // A fraction: shows every amount in today's dollars. null: dollars as they'll be.
  inflation: number | null;
};

type GrowthYear = { year: number; putIn: number; total: number };

type Growth = {
  // The start (year 0), then the end of each year.
  byYear: GrowthYear[];
  putIn: number;
  total: number;
  // What it grew by. Below zero only in today's dollars, when inflation outran the return.
  earned: number;
};

// Growth compounds yearly, with the intro talk's deposit rule (KTD8, docs/finance-math.md): a
// yearly deposit goes in at the start of its year; a monthly one goes in at the end of its
// month and earns simple interest until the year ends, then the balance compounds. The loop
// never divides by the rate, so a 0% return needs no branch of its own. In today's dollars,
// each year's total is divided by (1 + inflation)^year, and each deposit by (1 + inflation)
// raised to the time it went in. The amounts stay unrounded.
export function growth(input: GrowthInput): Growth {
  const { start, deposit, frequency, years, rate, inflation } = input;
  const depositYears = Math.min(years, input.depositYears ?? years);
  const worth = (amount: number, time: number) =>
    inflation === null ? amount : amount / (1 + inflation) ** time;

  let balance = start;
  let putIn = start;
  const byYear: GrowthYear[] = [{ year: 0, putIn, total: start }];

  for (let year = 1; year <= years; year++) {
    const depositing = year <= depositYears;
    if (frequency === "yearly") {
      if (depositing) {
        balance += deposit;
        putIn += worth(deposit, year - 1);
      }
      balance *= 1 + rate;
    } else {
      balance *= 1 + rate;
      if (depositing) {
        for (let month = 1; month <= 12; month++) {
          balance += deposit * (1 + (rate * (12 - month)) / 12);
          putIn += worth(deposit, year - 1 + month / 12);
        }
      }
    }
    byYear.push({ year, putIn, total: worth(balance, year) });
  }

  const total = worth(balance, years);
  return { byYear, putIn, total, earned: total - putIn };
}

// The amounts the sentence and the parts both show. Put-in and total each round to the nearest
// dollar, as the year-by-year table rounds them, and what it earned is the difference, so the
// parts still add up to the total (R14) and match the table's last row.
export function roundedGrowth(result: Growth): {
  putIn: number;
  earned: number;
  total: number;
} {
  const putIn = Math.round(result.putIn);
  const total = Math.round(result.total);
  return { putIn, earned: total - putIn, total };
}

// The headline sentence (R14): the main inputs restated, then the rounded total. In today's
// dollars, when the total is below what went in, it names inflation as the reason (KTD8).
export function describeGrowth(input: GrowthInput, result: Growth): string {
  const { start, deposit, frequency, years, depositYears, inflation } = input;
  const { putIn, earned, total: rounded } = roundedGrowth(result);
  const each = `${formatDollars(deposit)} a ${frequency === "monthly" ? "month" : "year"}`;
  const lead =
    start > 0
      ? `Starting with ${formatDollars(start)} and putting in ${each}`
      : `Putting in ${each}`;
  const rate = `${formatPercent(input.rate * 100)} a year`;
  const span =
    depositYears !== null && depositYears < years
      ? `for ${formatYears(depositYears)}, then letting it grow until year ${years}, at ${rate}`
      : `for ${formatYears(years)} at ${rate}`;
  const total = formatDollars(rounded);

  if (inflation === null) return `${lead} ${span}, you'd have about ${total}.`;
  const today = `${total} in today's dollars, at ${formatPercent(inflation * 100)} inflation`;
  if (earned < 0) {
    return `${lead} ${span}, you'd have about ${today}: less than the ${formatDollars(putIn)} you put in, because inflation makes each dollar buy less.`;
  }
  return `${lead} ${span}, you'd have about ${today}.`;
}
