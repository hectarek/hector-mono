import { describe, expect, it } from "bun:test";
import {
  canTakeDayOff,
  mealDaysText,
  mealsOnDay,
  moveCookDay,
  toggleEatDay,
} from "@/src/entities/meal-days";

// Sunday 27 September 2026, cooked for Sunday to Tuesday.
const chili = {
  cookDate: "2026-09-27",
  eatDates: ["2026-09-27", "2026-09-28", "2026-09-29"],
};

describe("meal days", () => {
  it("moves the eat days with the cook day, across a week", () => {
    expect(moveCookDay(chili, "2026-09-25")).toEqual({
      cookDate: "2026-09-25",
      eatDates: ["2026-09-25", "2026-09-26", "2026-09-27"],
    });
  });

  it("adds an eat day in order, and takes one away", () => {
    expect(toggleEatDay(chili, "2026-10-01").eatDates).toEqual([
      "2026-09-27",
      "2026-09-28",
      "2026-09-29",
      "2026-10-01",
    ]);
    expect(toggleEatDay(chili, "2026-09-28").eatDates).toEqual([
      "2026-09-27",
      "2026-09-29",
    ]);
  });

  it("says when it's cooked and eaten", () => {
    expect(mealDaysText(chili, "2026-09-27")).toBe(
      "Cook Today · eat Today, Mon 28 and Tue 29",
    );
    expect(
      mealDaysText(
        { cookDate: "2026-09-27", eatDates: ["2026-09-28"] },
        "2026-09-25",
      ),
    ).toBe("Cook Sun 27 · eat Mon 28");
  });

  it("puts a meal on its cook day and each eat day, saying which", () => {
    // Sunday prep eaten on weekdays, not on Sunday.
    const prep = { cookDate: "2026-09-27", eatDates: ["2026-09-28"] };
    const meals = [chili, prep];

    expect(mealsOnDay(meals, "2026-09-27")).toEqual([
      { meal: chili, cooks: true, eats: true },
      { meal: prep, cooks: true, eats: false },
    ]);
    expect(mealsOnDay(meals, "2026-09-28")).toEqual([
      { meal: chili, cooks: false, eats: true },
      { meal: prep, cooks: false, eats: true },
    ]);
    expect(mealsOnDay(meals, "2026-09-30")).toEqual([]);
  });
});

// D43: a leftovers day can come off a meal, but never its only eat day or its cook day.
describe("canTakeDayOff", () => {
  const meal = {
    cookDate: "2026-09-27",
    eatDates: ["2026-09-28", "2026-09-29"],
  };
  it.each([
    ["2026-09-28", true],
    ["2026-09-29", true],
    ["2026-09-27", false],
    ["2026-09-30", false],
  ])("%p: %p", (date, can) => {
    expect(canTakeDayOff(meal, date)).toBe(can);
  });

  it("not the only eat day", () => {
    expect(
      canTakeDayOff(
        { cookDate: "2026-09-27", eatDates: ["2026-09-28"] },
        "2026-09-28",
      ),
    ).toBe(false);
  });
});
