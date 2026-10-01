import { beforeEach, expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  MONDAY,
  makeApp,
  OWNER,
  PARTNER,
  type TestApp,
} from "@/tests/_support/app";

describeEachBackend("changeEntryDays", () => {
  let app: TestApp;
  let planId: string;
  let entryId: string;

  beforeEach(async () => {
    app = makeApp();
    planId = await app.newSpace("meal-plan");
    entryId = (await app.planMeal(planId, MONDAY, { title: "Tacos" })).id;
    await app.setEntryCooked(entryId, true, OWNER);
  });

  it("changes the cook day and eat days, keeping everything else", async () => {
    await app.changeEntryDays(
      entryId,
      { cookDate: "2026-09-24", eatDates: ["2026-09-24", "2026-09-26"] },
      OWNER,
    );

    const [changed] = await app.getWeekPlan(planId, MONDAY, OWNER);
    expect(changed).toMatchObject({
      id: entryId,
      cookDate: "2026-09-24",
      eatDates: ["2026-09-24", "2026-09-26"],
      title: "Tacos",
      cooked: true,
    });
  });

  // Lock-in (P14.12): moving a meal doesn't put it back on the grocery button's count.
  it("keeps the meal marked as on the grocery list", async () => {
    const added = new Date("2026-09-20T15:00:00Z");
    await app.repos.planEntries.markAddedToList([entryId], added);
    await app.changeEntryDays(
      entryId,
      { cookDate: "2026-09-25", eatDates: ["2026-09-25"] },
      OWNER,
    );
    expect(
      (await app.repos.planEntries.getById(entryId))?.addedToListAt,
    ).toEqual(added);
  });

  it("viewers can't, and a removed meal isn't found", async () => {
    const days = { cookDate: "2026-09-24", eatDates: ["2026-09-24"] };
    await app.join(planId, PARTNER, "viewer");
    await expect(
      app.changeEntryDays(entryId, days, PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    await app.removePlanEntry(entryId, OWNER);
    await expect(
      app.changeEntryDays(entryId, days, OWNER),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
