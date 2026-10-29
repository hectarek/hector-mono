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

// A moment as the screens show it, in Eastern time: "Oct 28, 2:00 PM".
const MOMENT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  timeZone: PLAN_TIME_ZONE,
});

export function formatMoment(at: Date): string {
  return MOMENT.format(at);
}
