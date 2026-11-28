// How numbers are shown: money in whole dollars (R24), never NaN, infinity or -$0 (R16).
// The math stays unrounded; rounding happens only here (docs/finance-math.md).

const NO_FIGURE = "—";

const dollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const compactDollars = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const percent = new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 });

// An amount that rounds to zero shows as 0, so -0.4 never prints as "-$0".
function shown(value: number, fractionDigits: number): number {
  const scale = 10 ** fractionDigits;
  return Math.round(value * scale) === 0 ? 0 : value;
}

export function formatDollars(amount: number): string {
  if (!Number.isFinite(amount)) return NO_FIGURE;
  return dollars.format(shown(amount, 0));
}

// For a chart's axis: "$250K", "$1.5M".
export function formatCompactDollars(amount: number): string {
  if (!Number.isFinite(amount)) return NO_FIGURE;
  return compactDollars.format(shown(amount, 0));
}

// 7 as "7%", 6.5 as "6.5%".
export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return NO_FIGURE;
  return `${percent.format(shown(value, 2))}%`;
}

export function formatYears(years: number): string {
  return `${years} ${years === 1 ? "year" : "years"}`;
}

// "2026-11-28" as "November 28, 2026". The date is a constant, so a prerender reads no clock.
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "long",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

// Rounds a total's parts to whole dollars so they add up to the rounded total (R14), by the
// largest remainder: every part rounds down, then the dollars left go to the parts with the
// largest remainders. Rounding each part on its own can miss the total by a dollar or more.
export function allocateRounded(parts: readonly number[]): number[] {
  const total = Math.round(parts.reduce((sum, part) => sum + part, 0));
  const floors = parts.map((part) => Math.floor(part));
  const left = total - floors.reduce((sum, part) => sum + part, 0);
  const byRemainder = parts
    .map((part, index) => ({ index, remainder: part - Math.floor(part) }))
    .sort((a, b) => b.remainder - a.remainder);
  for (const { index } of byRemainder.slice(0, left)) {
    floors[index] = (floors[index] ?? 0) + 1;
  }
  return floors.map((part) => (part === 0 ? 0 : part));
}
