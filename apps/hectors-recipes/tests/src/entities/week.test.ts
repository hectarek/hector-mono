import { describe, expect, it } from "bun:test";
import {
  addDays,
  daysBetween,
  formatDay,
  formatWeekRange,
  isIsoDate,
  mondayOf,
  shortDay,
  todayIn,
  upcomingDays,
  weekDates,
} from "@/src/entities/week";

describe("week helpers", () => {
  it("finds the Monday of any day, including Sunday", () => {
    expect(mondayOf("2026-09-22")).toBe("2026-09-21"); // Tuesday
    expect(mondayOf("2026-09-21")).toBe("2026-09-21"); // Monday
    expect(mondayOf("2026-09-27")).toBe("2026-09-21"); // Sunday
  });

  it("counts the days between two dates, either way and across a year", () => {
    expect(daysBetween("2026-09-21", "2026-09-23")).toBe(2);
    expect(daysBetween("2026-09-21", "2026-09-20")).toBe(-1);
    expect(daysBetween("2026-12-30", "2027-01-02")).toBe(3);
    // The day the clocks go back (1 November) is still one day.
    expect(daysBetween("2026-10-31", "2026-11-01")).toBe(1);
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

  it("labels a day without shifting it into another time zone", () => {
    expect(formatDay("2026-09-21")).toEqual({
      weekday: "Mon",
      label: "Sep 21",
    });
    expect(formatDay("2026-01-01")).toEqual({ weekday: "Thu", label: "Jan 1" });
  });

  it("formats a week range", () => {
    expect(formatWeekRange("2026-09-21")).toBe("Sep 21 – 27");
    expect(formatWeekRange("2026-09-28")).toBe("Sep 28 – Oct 4");
  });
});

describe("upcomingDays", () => {
  // Adding a meal is almost always for the coming week, so these are one tap each.
  it("the next seven days from today, today first, labelled for buttons", () => {
    expect(upcomingDays("2026-09-25")).toEqual([
      { date: "2026-09-25", label: "Today" },
      { date: "2026-09-26", label: "Sat 26" },
      { date: "2026-09-27", label: "Sun 27" },
      { date: "2026-09-28", label: "Mon 28" },
      { date: "2026-09-29", label: "Tue 29" },
      { date: "2026-09-30", label: "Wed 30" },
      { date: "2026-10-01", label: "Thu 1" },
    ]);
  });
});

// D47: within a week of today, the weekday and date; further, the month too.
describe("shortDay", () => {
  it.each([
    ["2026-10-01", "Today"],
    ["2026-10-07", "Wed 7"],
    ["2026-10-08", "Thu Oct 8"],
    ["2026-12-03", "Thu Dec 3"],
    ["2026-09-25", "Fri 25"],
    ["2026-09-24", "Thu Sep 24"],
  ])("%p from Thursday 1 October is %p", (date, label) => {
    expect(shortDay(date, "2026-10-01")).toBe(label);
  });
});
