// Calendar-date helpers on "YYYY-MM-DD" strings. All arithmetic is done in UTC on the
// date alone, so no local time zone can shift a meal onto the wrong day.

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

// Today's calendar date in the plan's time zone (the server runs in UTC).
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

// Weeks start on Monday.
export function mondayOf(date: string): string {
  const day = toUtc(date).getUTCDay();
  return addDays(date, day === 0 ? -6 : 1 - day);
}

export function weekDates(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

export function formatDay(date: string): { weekday: string; label: string } {
  const value = toUtc(date);
  return {
    weekday: value.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "UTC",
    }),
    label: value.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  };
}

// Whether a day is a week or more from today, so it's written with its month (D47).
export function showsMonth(date: string, today: string): boolean {
  return Math.abs(daysBetween(today, date)) >= 7;
}

// A day on a button: "Today", or its weekday and date ("Sat 26"), with the month once it's a
// week or more from today ("Thu Oct 8", no comma, as lists of days use commas; D47).
export function shortDay(date: string, today: string): string {
  if (date === today) return "Today";
  const { weekday, label } = formatDay(date);
  return showsMonth(date, today)
    ? `${weekday} ${label}`
    : `${weekday} ${toUtc(date).getUTCDate()}`;
}

// The days to offer when adding a meal: today and the six after it ("Today", "Sat 26", …).
// From today rather than Monday, so a Sunday add still has a week of choices.
export function upcomingDays(today: string): { date: string; label: string }[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(today, index);
    return { date, label: shortDay(date, today) };
  });
}

export function formatWeekRange(monday: string): string {
  const start = toUtc(monday);
  const end = toUtc(addDays(monday, 6));
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    ...(sameMonth ? {} : { month: "short" }),
    day: "numeric",
    timeZone: "UTC",
  });
  return `${startLabel} – ${endLabel}`;
}
