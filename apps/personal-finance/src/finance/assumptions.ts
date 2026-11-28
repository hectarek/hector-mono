// Every calculator's example values, each with where it comes from and the day it was
// checked (KTD15, R15). The dates are constants, so a prerender reads no clock. A value marked
// `judgment` has no primary source: it's a starting guess to change.
export type Example = {
  value: number;
  judgment: boolean;
  // What the value is measured against, in plain words, or null.
  note: string | null;
  source: { name: string; url: string } | null;
  checked: string;
};

const CHECKED = "2026-11-28";

const guess = (value: number): Example => ({
  value,
  judgment: true,
  note: null,
  source: null,
  checked: CHECKED,
});

// Growth over time: $200 a month for 30 years from $0 at 7%, and 3% inflation for today's
// dollars. The deposit, years and starting amount aren't in the plan's table: they're judgment.
export const GROWTH_EXAMPLE = {
  start: guess(0),
  deposit: guess(200),
  frequency: "monthly",
  years: guess(30),
  rate: {
    value: 7,
    judgment: true,
    note: "below the S&P 500's average of 10.02% a year from 1928 to 2025",
    source: {
      name: "Damodaran, NYU Stern",
      url: "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html",
    },
    checked: CHECKED,
  },
  inflation: guess(3),
} as const satisfies Record<string, Example | "monthly">;

// The yearly returns offered as quick picks, before inflation (R11).
export const QUICK_RETURNS = [4, 7, 10] as const;
