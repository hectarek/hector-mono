import { addDays, daysBetween, shortDay } from "./week";

// A meal's days (docs/ux-plan.md D38): the one day it's cooked, and the days it's eaten.
export type MealDays = { cookDate: string; eatDates: string[] };

// Moving the cook day moves the eat days with it, so "cooked Sunday, eaten through Tuesday"
// keeps that shape.
export function moveCookDay(days: MealDays, cookDate: string): MealDays {
  const shift = daysBetween(days.cookDate, cookDate);
  return {
    cookDate,
    eatDates: days.eatDates.map((date) => addDays(date, shift)),
  };
}

export function toggleEatDay(days: MealDays, date: string): MealDays {
  return {
    ...days,
    eatDates: days.eatDates.includes(date)
      ? days.eatDates.filter((eat) => eat !== date)
      : [...days.eatDates, date].sort(),
  };
}

// Whether a day can come off a meal on its own (D43): one it's only eaten on (leftovers), and
// never its only eat day.
export function canTakeDayOff(days: MealDays, date: string): boolean {
  return (
    date !== days.cookDate &&
    days.eatDates.includes(date) &&
    days.eatDates.length > 1
  );
}

// "Cook Today · eat Today, Mon 28 and Tue 29", for saying what was planned.
export function mealDaysText(days: MealDays, today: string): string {
  const eat = days.eatDates.map((date) => shortDay(date, today));
  const list =
    eat.length > 1
      ? `${eat.slice(0, -1).join(", ")} and ${eat.at(-1)}`
      : eat[0];
  return `Cook ${shortDay(days.cookDate, today)} · eat ${list}`;
}

// Which of its days the week shows a meal on (docs/ux-plan.md D93): all of them (the default),
// only the day it's cooked (the prep schedule), or only the days it's eaten (the menu).
export type MealShow = "all" | "cook" | "eat";

// `?show=` read back; anything else shows every meal.
export function mealShowFrom(value: string | null | undefined): MealShow {
  return value === "cook" || value === "eat" ? value : "all";
}

// What a day on the plan shows (D38, D39): each meal cooked or eaten that day, once, and
// which of the two it is there; with `show`, only the meals cooked, or only those eaten.
export type DayMeal<T extends MealDays> = {
  meal: T;
  cooks: boolean;
  eats: boolean;
};

export function mealsOnDay<T extends MealDays>(
  meals: T[],
  date: string,
  show: MealShow = "all",
): DayMeal<T>[] {
  return meals.flatMap((meal) => {
    const cooks = meal.cookDate === date;
    const eats = meal.eatDates.includes(date);
    const shown =
      show === "cook" ? cooks : show === "eat" ? eats : cooks || eats;
    return shown ? [{ meal, cooks, eats }] : [];
  });
}
