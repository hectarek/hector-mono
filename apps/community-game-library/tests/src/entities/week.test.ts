import { describe, expect, it } from "bun:test";
import {
  addDays,
  daysBetween,
  formatDate,
  formatMonth,
  isIsoDate,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";

describe("date helpers", () => {
  it("counts the days between two dates, either way and across a year", () => {
    expect(daysBetween("2026-09-21", "2026-09-23")).toBe(2);
    expect(daysBetween("2026-09-21", "2026-09-20")).toBe(-1);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    // The day the clocks go back (1 November) is still one day.
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    // A loan's month is 30 days (docs/build-plan.md KTD6).
    expect(addDays("2026-11-21", 30)).toBe("2026-12-21");
  });

  // KTD9: one time zone, New York's, whatever the server's.
  it("uses the app's time zone for today, not the server's", () => {
    // 02:30 UTC on the 23rd is still the evening of the 22nd in New York.
    const lateEvening = new Date("2026-09-23T02:30:00Z");
    expect(todayIn(PLAN_TIME_ZONE, lateEvening)).toBe("2026-09-22");
    expect(todayIn("UTC", lateEvening)).toBe("2026-09-23");
  });

  it("validates real calendar dates", () => {
    expect(isIsoDate("2026-02-28")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("2026-9-1")).toBe(false);
    expect(isIsoDate("garbage")).toBe(false);
  });
});

// KTD9 and screens.md's limits: a date shows its weekday, and its year once that isn't this year.
describe("formatDate", () => {
  it("writes a date with its weekday, as the screens do", () => {
    expect(formatDate("2026-11-20", "2026-11-10")).toBe("Fri, Nov 20");
    expect(formatDate("2026-11-06", "2026-11-21")).toBe("Fri, Nov 6");
  });

  it("adds the year once it isn't this year", () => {
    expect(formatDate("2027-01-07", "2026-12-28")).toBe("Thu, Jan 7, 2027");
    expect(formatDate("2025-12-30", "2026-01-02")).toBe("Tue, Dec 30, 2025");
  });

  it("names a month by its name and year", () => {
    expect(formatMonth("2026-11")).toBe("November 2026");
    expect(formatMonth("2027-01")).toBe("January 2027");
  });
});
