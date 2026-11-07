import { PLAN_TIME_ZONE } from "@/src/entities/week";

// A time field's value (`datetime-local`, "2026-11-09T09:30") is a wall time in Eastern time
// (docs/build-plan.md KTD18), whatever the browser's zone. So a form the server renders first
// shows the times the browser then does, and a time means the same wherever Hector is.

const WALL = new Intl.DateTimeFormat("en-CA", {
  timeZone: PLAN_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

// A moment as a field's value: its wall time in Eastern time.
export function localOf(at: Date): string {
  const parts = WALL.formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((each) => each.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

// How far Eastern time is from UTC at a moment, in milliseconds: −4 or −5 hours.
function offsetAt(at: number): number {
  return Date.parse(`${localOf(new Date(at))}:00Z`) - at;
}

// A field's value as the moment it names. The offset is read twice, the second time at the first
// guess, so a time on either side of a change to or from daylight saving lands right.
export function momentOf(local: string): string {
  const wall = Date.parse(`${local}:00Z`);
  const guess = wall - offsetAt(wall);
  return new Date(wall - offsetAt(guess)).toISOString();
}

// A field's value some minutes later, on the wall clock.
export function minutesAfter(local: string, minutes: number): string {
  return new Date(Date.parse(`${local}:00Z`) + minutes * 60_000)
    .toISOString()
    .slice(0, 16);
}
