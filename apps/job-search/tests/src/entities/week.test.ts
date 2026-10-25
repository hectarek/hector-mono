import { describe, expect, it } from "bun:test";
import {
  addDays,
  formatWeekRange,
  isIsoDate,
  mondayOf,
  todayIn,
  weekDates,
} from "@/src/entities/week";

describe("week helpers", () => {
  it("finds the Monday of any day, including Sunday", () => {
    expect(mondayOf("2026-09-22")).toBe("2026-09-21"); // Tuesday
    expect(mondayOf("2026-09-21")).toBe("2026-09-21"); // Monday
    expect(mondayOf("2026-09-27")).toBe("2026-09-21"); // Sunday
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(mondayOf("2027-01-03")).toBe("2026-12-28");
    expect(weekDates("2026-09-28").at(-1)).toBe("2026-10-04");
  });

  it("uses the plan's time zone for today, not the server's", () => {
    // 02:30 UTC on the 23rd is still the evening of the 22nd in New York.
    const lateEvening = new Date("2026-09-23T02:30:00Z");
    expect(todayIn("America/New_York", lateEvening)).toBe("2026-09-22");
    expect(todayIn("UTC", lateEvening)).toBe("2026-09-23");
  });

  it("validates real calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-9-1")).toBe(false);
    expect(isIsoDate("garbage")).toBe(false);
  });

  it("formats a week range", () => {
    expect(formatWeekRange("2026-09-21")).toBe("Sep 21 – 27");
    expect(formatWeekRange("2026-09-28")).toBe("Sep 28 – Oct 4");
  });
});
