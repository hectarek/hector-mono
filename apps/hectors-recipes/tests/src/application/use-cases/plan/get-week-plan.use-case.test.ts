import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  MONDAY,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("getWeekPlan", () => {
  let app: TestApp;
  let planId: string;

  beforeEach(async () => {
    app = makeApp();
    planId = await app.newSpace("meal-plan");
  });

  it("returns the meals cooked or eaten that Monday-to-Sunday week, in cook-day order", async () => {
    await app.planMeal(planId, "2026-09-27", { title: "Sunday" });
    await app.planMeal(planId, MONDAY, { title: "Monday" });
    await app.planMeal(planId, "2026-09-28", { title: "Next week" });
    await app.planMeal(planId, "2026-09-20", { title: "Last week" });
    // Cooked the Sunday before, eaten Monday and Tuesday (D38).
    await app.planMeal(planId, "2026-09-20", {
      title: "Sunday prep",
      eatDates: ["2026-09-21", "2026-09-22"],
    });
    // Cooked this Sunday, eaten next week only.
    await app.planMeal(planId, "2026-09-27", {
      title: "Cooked for next week",
      eatDates: ["2026-09-28"],
    });

    expect(
      (await app.getWeekPlan(planId, MONDAY, OWNER)).map((e) => e.title),
    ).toEqual(["Sunday prep", "Monday", "Sunday", "Cooked for next week"]);
    expect(
      (await app.getWeekPlan(planId, "2026-09-28", OWNER)).map((e) => e.title),
    ).toEqual(["Cooked for next week", "Next week"]);
  });

  // Lock-in (P14.12): a meal that only passes through the week isn't in it.
  it("leaves out a meal cooked before the week and eaten only after it", async () => {
    await app.planMeal(planId, "2026-09-20", {
      title: "Frozen for later",
      eatDates: ["2026-09-28"],
    });
    expect(await app.getWeekPlan(planId, MONDAY, OWNER)).toEqual([]);
  });

  it("viewers can see the week; strangers can't", async () => {
    await app.planMeal(planId, MONDAY);
    await expect(
      app.getWeekPlan(planId, MONDAY, PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await app.join(planId, PARTNER, "viewer");
    expect(await app.getWeekPlan(planId, MONDAY, PARTNER)).toHaveLength(1);
  });
});
