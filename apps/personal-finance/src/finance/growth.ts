import {
  allocateRounded,
  formatDollars,
  formatPercent,
  formatYears,
} from "./format";

export type DepositFrequency = "monthly" | "yearly";

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

// The headline sentence (R14): the main inputs restated, then the rounded total. In today's
// dollars, when the total is below what went in, it names inflation as the reason (KTD8).
export function describeGrowth(input: GrowthInput, result: Growth): string {
  const { start, deposit, frequency, years, depositYears, inflation } = input;
  const [putIn = 0, earned = 0] = allocateRounded([
    result.putIn,
    result.earned,
  ]);
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
  const total = formatDollars(putIn + earned);

  if (inflation === null) return `${lead} ${span}, you'd have about ${total}.`;
  const today = `${total} in today's dollars, at ${formatPercent(inflation * 100)} inflation`;
  if (earned < 0) {
    return `${lead} ${span}, you'd have about ${today}: less than the ${formatDollars(putIn)} you put in, because inflation makes each dollar buy less.`;
  }
  return `${lead} ${span}, you'd have about ${today}.`;
}
