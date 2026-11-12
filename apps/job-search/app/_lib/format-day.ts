import { PLAN_TIME_ZONE } from "@/src/entities/week";

// A date ("YYYY-MM-DD", Eastern; docs/build-plan.md KTD18) as the screens show it: "Oct 26, 2026".
// Read as UTC, so no time zone moves it to another day.
const DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDay(day: string): string {
  return DAY.format(new Date(`${day}T00:00:00Z`));
}

const MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

// A date with no year, "Nov 13", where the year goes without saying: the season's track.
export function formatMonthDay(day: string): string {
  return MONTH_DAY.format(new Date(`${day}T00:00:00Z`));
}

const WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
});
const SHORT_WEEKDAY = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

// A date's day of the week, "Saturday", or "Sat" when `short`.
export function formatWeekday(day: string, short = false): string {
  return (short ? SHORT_WEEKDAY : WEEKDAY).format(new Date(`${day}T00:00:00Z`));
}

// A moment as the screens show it, in Eastern time: "Oct 28, 2:00 PM". The day and the time are
// formatted apart and joined here, since ICU builds join them differently: Bun on macOS says
// "Oct 28 at 2:00 PM", Bun on CI's Linux runner and Chrome "Oct 28, 2:00 PM" (2026-10-29).
const MOMENT_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: PLAN_TIME_ZONE,
});
const MOMENT_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: PLAN_TIME_ZONE,
});

export function formatMoment(at: Date): string {
  return `${MOMENT_DAY.format(at)}, ${MOMENT_TIME.format(at)}`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

// When a step is due, as a row or a record's page says it: so many days late, today, a weekday
// within the week ahead, or the date further out (the UX plan's UX4 and UX8).
export function dueLabel(due: string, today: string): string {
  if (due === today) return "Today";
  const days = Math.round((Date.parse(due) - Date.parse(today)) / DAY_MS);
  if (days < 0) return `${-days} ${days === -1 ? "day" : "days"} late`;
  return days < 7 ? formatWeekday(due, true) : formatDay(due);
}

// A moment's time of day, in Eastern time: "9:30 AM".
export function formatTime(at: Date): string {
  return MOMENT_TIME.format(at);
}
