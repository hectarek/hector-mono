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

const DAY_NAME = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
});
const WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});
const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const MONTH_SHORT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  year: "numeric",
  timeZone: PLAN_TIME_ZONE,
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

// A day by its whole name, as a line says it: "You have it until Friday" (F1).
export function formatDayName(date: string): string {
  return DAY_NAME.format(toUtc(date));
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

const HOUR = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hourCycle: "h23",
  timeZone: PLAN_TIME_ZONE,
});

// When something happened, as a line after a verb says it ("You asked this morning", B13), in
// the app's time zone: this morning, afternoon or evening, yesterday, a weekday by its whole name
// within the week ("asked Sunday", C7 and C18), then its date ("on Nov 2").
export function formatWhen(at: Date, now: Date): string {
  const day = todayIn(PLAN_TIME_ZONE, at);
  const today = todayIn(PLAN_TIME_ZONE, now);
  const daysAgo = daysBetween(day, today);
  if (daysAgo <= 0) {
    const hour = Number(HOUR.format(at));
    return hour < 12
      ? "this morning"
      : hour < 17
        ? "this afternoon"
        : "this evening";
  }
  if (daysAgo === 1) {
    return "yesterday";
  }
  return daysAgo < 7 ? formatDayName(day) : `on ${formatDate(day, today)}`;
}

// A month, given as "YYYY-MM", by its name and year: "November 2026".
export function formatMonth(month: string): string {
  return MONTH_YEAR.format(toUtc(`${month}-01`));
}

// The month two people became friends, short (E3): "Friends since Jul 2026".
export function formatSince(at: Date): string {
  return MONTH_SHORT.format(at);
}

// A day on a list's line: "today", "yesterday", then "Nov 2" (G1, G7, My library's suggestions).
export function formatDay(at: Date, now: Date): string {
  const day = todayIn(PLAN_TIME_ZONE, at);
  const daysAgo = daysBetween(day, todayIn(PLAN_TIME_ZONE, now));
  return daysAgo <= 0
    ? "today"
    : daysAgo === 1
      ? "yesterday"
      : formatMonthDay(day);
}

const CLOCK = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: PLAN_TIME_ZONE,
});

// A time of day, as G2 gives when a suggestion came: "9:12 AM".
export const formatTime = (at: Date): string => CLOCK.format(at);

// A clock's parts in the app's time zone, joined here with a plain space, since ICU builds put
// different spaces before AM and PM (formatDate's note).
function clockParts(at: Date): { short: string; period: string } {
  const parts = CLOCK.formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((one) => one.type === type)?.value ?? "";
  const hour = part("hour");
  const minute = part("minute");
  return {
    short: minute === "00" ? hour : `${hour}:${minute}`,
    period: part("dayPeriod").toUpperCase(),
  };
}

// A night's time as its card and page write it (D1, D2, D7): "7 PM", "10:30 PM".
export function formatClock(at: Date): string {
  const { short, period } = clockParts(at);
  return `${short} ${period}`;
}

// A night's times (D2, D7): "7 to 10:30 PM", "11 AM to 2 PM", or "7 PM" with no end.
export function formatTimes(startsAt: Date, endsAt: Date | null): string {
  if (endsAt === null) {
    return formatClock(startsAt);
  }
  const start = clockParts(startsAt);
  const end = clockParts(endsAt);
  return start.period === end.period
    ? `${start.short} to ${end.short} ${end.period}`
    : `${start.short} ${start.period} to ${end.short} ${end.period}`;
}

const WALL_CLOCKS = new Map<string, Intl.DateTimeFormat>();

// How far a time zone's clocks are ahead of UTC at a moment, in milliseconds.
function offsetAt(at: Date, timeZone: string): number {
  let wall = WALL_CLOCKS.get(timeZone);
  if (!wall) {
    wall = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    });
    WALL_CLOCKS.set(timeZone, wall);
  }
  const parts = wall.formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((one) => one.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    part("year"),
    part("month") - 1,
    part("day"),
    part("hour"),
    part("minute"),
    part("second"),
  );
  return asUtc - (at.getTime() - at.getUTCMilliseconds());
}

// The moment a time on a day's clock is in a time zone, as a night's start is entered (D5):
// "19:00" on "2026-11-20" in New York is midnight UTC on Nov 21. The zone's offset is read at the
// clock's time, then again at the answer, in case the clocks change between the two.
export function atTimeIn(date: string, time: string, timeZone: string): Date {
  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const [hours = 0, minutes = 0] = time.split(":").map(Number);
  const wall = Date.UTC(year, month - 1, day, hours, minutes);
  const first = wall - offsetAt(new Date(wall), timeZone);
  return new Date(wall - offsetAt(new Date(first), timeZone));
}

// A moment's time on a time zone's clock, as a time field holds it: "19:00".
export function clockIn(at: Date, timeZone: string): string {
  const shifted = new Date(at.getTime() + offsetAt(at, timeZone));
  return shifted.toISOString().slice(11, 16);
}

// When a notice arrived, as F1's right-hand column says it: minutes ago within the hour, the time
// today, Yesterday, a weekday within the week, then its month and day.
export function formatNoticeTime(at: Date, now: Date): string {
  const minutes = Math.floor((now.getTime() - at.getTime()) / 60_000);
  const day = todayIn(PLAN_TIME_ZONE, at);
  const daysAgo = daysBetween(day, todayIn(PLAN_TIME_ZONE, now));
  if (daysAgo <= 0) {
    return minutes < 60 ? `${Math.max(minutes, 1)} min ago` : formatTime(at);
  }
  if (daysAgo === 1) {
    return "Yesterday";
  }
  return daysAgo < 7 ? formatWeekday(day) : formatMonthDay(day);
}
