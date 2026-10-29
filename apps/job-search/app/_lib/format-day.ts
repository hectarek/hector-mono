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
