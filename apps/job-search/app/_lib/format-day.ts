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
