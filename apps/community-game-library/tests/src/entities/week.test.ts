import { describe, expect, it } from "bun:test";
import {
  addDays,
  atTimeIn,
  clockIn,
  daysBetween,
  formatClock,
  formatDate,
  formatMonth,
  formatTimes,
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

// A night's times (KTD9): entered and shown on New York's clock, whatever the server's.
describe("a night's times", () => {
  it("finds the moment a time on a day is in New York, in winter and in summer", () => {
    expect(atTimeIn("2026-11-20", "19:00", PLAN_TIME_ZONE)).toEqual(
      new Date("2026-11-21T00:00:00Z"),
    );
    expect(atTimeIn("2026-07-04", "19:00", PLAN_TIME_ZONE)).toEqual(
      new Date("2026-07-04T23:00:00Z"),
    );
    // The morning after the clocks go back on Nov 1.
    expect(atTimeIn("2026-11-01", "09:30", PLAN_TIME_ZONE)).toEqual(
      new Date("2026-11-01T14:30:00Z"),
    );
  });

  it("reads a moment back as a time field holds it", () => {
    expect(clockIn(new Date("2026-11-21T03:30:00Z"), PLAN_TIME_ZONE)).toBe(
      "22:30",
    );
    expect(clockIn(new Date("2026-07-04T23:05:00Z"), PLAN_TIME_ZONE)).toBe(
      "19:05",
    );
  });

  it("writes a night's time as its card does, without the minutes on the hour", () => {
    expect(formatClock(new Date("2026-11-21T00:00:00Z"))).toBe("7 PM");
    expect(formatClock(new Date("2026-11-21T03:30:00Z"))).toBe("10:30 PM");
  });

  it("writes a night's times as its page does, naming AM or PM once when they match", () => {
    const seven = new Date("2026-11-21T00:00:00Z");
    expect(formatTimes(seven, new Date("2026-11-21T03:30:00Z"))).toBe(
      "7 to 10:30 PM",
    );
    expect(
      formatTimes(
        new Date("2026-11-21T16:00:00Z"),
        new Date("2026-11-21T19:00:00Z"),
      ),
    ).toBe("11 AM to 2 PM");
    expect(formatTimes(seven, null)).toBe("7 PM");
  });
});
