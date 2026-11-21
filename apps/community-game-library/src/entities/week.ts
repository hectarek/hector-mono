// Calendar-date helpers on "YYYY-MM-DD" strings, from recipes. All arithmetic is done in UTC on
// the date alone, so no local time zone can shift a due date onto the wrong day. The app keeps
// one time zone, America/New_York (docs/build-plan.md KTD9).

export const PLAN_TIME_ZONE = "America/New_York";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
}

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Today's calendar date in the app's time zone (the server runs in UTC).
export function todayIn(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: string, days: number): string {
  const result = toUtc(date);
  result.setUTCDate(result.getUTCDate() + days);
  return toIso(result);
}

// Whole days from one date to another: 2 from Monday to Wednesday, -1 back to Sunday.
export function daysBetween(from: string, to: string): number {
  return Math.round((toUtc(to).getTime() - toUtc(from).getTime()) / 86_400_000);
}

const WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});
const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const MONTH_YEAR = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

// A date's weekday, "Fri", and its month and day, "Nov 20": the parts formatDate joins, and a
// stamp's short words ("Due Fri", "Out to Nov 20").
export function formatWeekday(date: string): string {
  return WEEKDAY.format(toUtc(date));
}

export function formatMonthDay(date: string): string {
  return MONTH_DAY.format(toUtc(date));
}

// A date as every screen writes it (KTD9; screens.md, Limits to build for): its weekday, month
// and day, "Fri, Nov 20", and the year once it isn't this year, "Fri, Jan 7, 2028". The parts
// are formatted apart and joined here, since ICU builds join them differently (job-search's
// format-day.ts found Bun on macOS and on Linux disagreeing).
export function formatDate(date: string, today: string): string {
  const day = `${formatWeekday(date)}, ${formatMonthDay(date)}`;
  const year = date.slice(0, 4);
  return year === today.slice(0, 4) ? day : `${day}, ${year}`;
}

// A month, given as "YYYY-MM", by its name and year: "November 2026".
export function formatMonth(month: string): string {
  return MONTH_YEAR.format(toUtc(`${month}-01`));
}
