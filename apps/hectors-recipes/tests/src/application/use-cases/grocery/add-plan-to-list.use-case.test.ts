import { beforeEach, describe, expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import type { GroceryRange } from "@/src/entities/models/grocery-item.model";
import {
  describeEachBackend,
  MONDAY,
  OWNER,
  PARTNER,
  postgresRepositories,
} from "@/tests/_support/app";
import { resetDatabase } from "@/tests/_support/database";
import { type GroceryFixture, groceryFixture } from "@/tests/_support/grocery";

// The plan's grocery button (docs/ux-plan.md D41, D44, D45). Today is MONDAY.
describeEachBackend("addPlanToList", () => {
  let g: GroceryFixture;
  let planId: string;

  beforeEach(async () => {
    g = await groceryFixture();
    planId = g.planId;
  });

  const plan = (
    cookDate: string,
    recipeId: string,
    eatDates: string[] = [cookDate],
  ) =>
    g.app.addPlanEntry(
      { spaceId: planId, recipeId, cookDate, eatDates },
      OWNER,
    );
  const add = (
    options: {
      entryId?: string;
      range?: GroceryRange;
      again?: boolean;
      today?: string;
    } = {},
  ) => g.app.addPlanToList(planId, OWNER, { today: MONDAY, ...options });
  const toAdd = () => g.app.listMealsToAdd(planId, OWNER, MONDAY);
  const addedAt = async (id: string) =>
    (await g.app.repos.planEntries.getById(id))?.addedToListAt;

  it("adds the meals cooking in the range from today, a recipe planned twice twice", async () => {
    await plan(MONDAY, g.chiliId);
    await plan("2026-09-25", g.chiliId);
    await plan("2026-10-01", g.tacosId);
    // Before today, and cooked: never.
    const yesterday = await plan("2026-09-20", g.tacosId);
    const cooked = await plan("2026-09-23", g.tacosId);
    await g.app.setEntryCooked(cooked.id, true, OWNER);

    expect(await toAdd()).toEqual([MONDAY, "2026-09-25", "2026-10-01"]);
    await add({ range: "next-7-days" });
    expect(await g.texts()).toEqual([
      ["4 cloves garlic", "Chili"],
      ["2 lb ground turkey", "Chili"],
      ["Salt", "Chili"],
    ]);
    expect(await toAdd()).toEqual(["2026-10-01"]);

    await add({ range: "next-14-days" });
    expect(await g.texts()).toEqual([
      ["8 cloves garlic", "Chili, Tacos"],
      ["2 lb ground turkey", "Chili"],
      ["Salt", "Chili, Tacos"],
    ]);
    expect(await toAdd()).toEqual([]);
    expect(await addedAt(yesterday.id)).toBeNull();
    expect(await addedAt(cooked.id)).toBeNull();
  });

  it("goes three days out, and all the way with all upcoming", async () => {
    await plan("2026-09-23", g.chiliId);
    await plan("2026-09-24", g.tacosId);

    expect(await add({ range: "next-3-days" })).toMatchObject({ added: 3 });
    expect(await toAdd()).toEqual(["2026-09-24"]);
    await plan("2026-12-24", g.chiliId);
    await add({ range: "all-upcoming" });
    expect(await toAdd()).toEqual([]);
  });

  // Chili on Monday went on the list; Chili planned again for Friday is a second batch.
  it("adds a second cooking of a recipe whose first is already on the list", async () => {
    await plan(MONDAY, g.chiliId);
    await add();
    await plan("2026-09-25", g.chiliId);

    expect(await add()).toMatchObject({
      added: 0,
      merged: 2,
      skipped: 1,
      alreadyAdded: 0,
    });
    expect(await g.texts()).toEqual([
      ["4 cloves garlic", "Chili"],
      ["2 lb ground turkey", "Chili"],
      ["Salt", "Chili"],
    ]);
  });

  it("counts a recipe on the list from its own page as one planned meal of it, the earliest", async () => {
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    const friday = await plan("2026-09-25", g.chiliId);
    const monday = await plan(MONDAY, g.chiliId);

    expect(await add()).toMatchObject({ alreadyAdded: 1 });
    expect(await g.texts()).toContainEqual(["2 lb ground turkey", "Chili"]);
    // One batch for the two meals; both are marked.
    expect(await addedAt(monday.id)).toBeInstanceOf(Date);
    expect(await addedAt(friday.id)).toBeInstanceOf(Date);
    expect(await toAdd()).toEqual([]);
  });

  it("holds a meal's first add from its sheet to the same rule, and adds again when asked", async () => {
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    const chili = await plan(MONDAY, g.chiliId);

    expect(await add({ entryId: chili.id })).toMatchObject({
      added: 0,
      merged: 0,
      alreadyAdded: 1,
    });
    expect(await g.texts()).toContainEqual(["1 lb ground turkey", "Chili"]);
    expect(await addedAt(chili.id)).toBeInstanceOf(Date);

    // "Add to list again": a second batch, whatever is on the list.
    await add({ entryId: chili.id, again: true });
    expect(await g.texts()).toContainEqual(["2 lb ground turkey", "Chili"]);
  });

  // The sheet says what was pressed: a sheet loaded before someone else's press still says
  // "Add to grocery list", and that mustn't add a second batch.
  it("treats a first add from a sheet that's out of date as already on the list", async () => {
    const chili = await plan(MONDAY, g.chiliId);
    await add();
    expect(await add({ entryId: chili.id })).toMatchObject({
      added: 0,
      merged: 0,
      alreadyAdded: 1,
    });
    expect(await g.texts()).toContainEqual(["1 lb ground turkey", "Chili"]);
  });

  // A meal added weeks ago, bought and cleared, says nothing about what's on the list now.
  it("lets a recipe from its page cover the next meal when its earlier meals are past", async () => {
    const old = await plan("2026-09-07", g.chiliId);
    await add({ entryId: old.id, today: "2026-09-07" });
    for (const item of await g.app.getGroceryList(planId, OWNER)) {
      await g.app.setGroceryItemChecked(item.id, true, OWNER);
    }
    await g.app.clearCheckedItems(planId, OWNER);

    await g.app.addRecipesToList(planId, [{ recipeId: g.chiliId }], OWNER);
    await plan("2026-09-25", g.chiliId);
    expect(await add()).toMatchObject({ added: 0, alreadyAdded: 1 });
    expect(await g.texts()).toContainEqual(["1 lb ground turkey", "Chili"]);
  });

  it("stops the next 7 days at today and the six after", async () => {
    await plan("2026-09-27", g.chiliId);
    await plan("2026-09-28", g.tacosId);
    await add({ range: "next-7-days" });
    expect(await toAdd()).toEqual(["2026-09-28"]);
  });

  it("adds one meal from its sheet whatever its day", async () => {
    const lastWeek = await plan("2026-09-14", g.chiliId);
    expect(await add({ entryId: lastWeek.id })).toMatchObject({ added: 3 });
  });

  // Pressing it twice, or both people pressing it once, used to double every amount.
  it("adds only what's new each time, and nothing when everything is on the list", async () => {
    await plan(MONDAY, g.chiliId);
    await add();
    await plan("2026-09-22", g.tacosId);

    // Tacos' garlic joins Chili's; its salt is already there.
    expect(await add()).toMatchObject({
      added: 0,
      merged: 1,
      skipped: 1,
      alreadyAdded: 0,
    });
    expect(await add()).toMatchObject({
      added: 0,
      merged: 0,
      skipped: 0,
      alreadyAdded: 0,
    });
    expect(await g.texts()).toEqual([
      ["6 cloves garlic", "Chili, Tacos"],
      ["1 lb ground turkey", "Chili"],
      ["Salt", "Chili, Tacos"],
    ]);
  });

  // The list is the plan's own, so only someone who can edit the plan adds to it.
  it("needs edit rights on the plan, marks the meals it adds, and won't take another plan's meal", async () => {
    const entry = await plan(MONDAY, g.chiliId);
    await g.app.join(planId, PARTNER, "viewer");

    await expect(
      g.app.addPlanToList(planId, PARTNER, { today: MONDAY }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await addedAt(entry.id)).toBeNull();

    await add();
    expect(await addedAt(entry.id)).toBeInstanceOf(Date);

    const otherPlan = await g.app.newSpace("meal-plan");
    await expect(
      g.app.addPlanToList(otherPlan, OWNER, {
        entryId: entry.id,
        today: MONDAY,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

// Real transactions: two first adds from the sheet at once take turns on the list's lock,
// and the second finds the meal already added (D45). The mocks have no lock to test.
describe("addPlanToList at once [postgres]", () => {
  beforeEach(resetDatabase);

  it("adds one batch for two first adds of the same meal", async () => {
    const g = await groceryFixture(postgresRepositories());
    const chili = await g.app.addPlanEntry(
      {
        spaceId: g.planId,
        recipeId: g.chiliId,
        cookDate: MONDAY,
        eatDates: [MONDAY],
      },
      OWNER,
    );
    const first = () =>
      g.app.addPlanToList(g.planId, OWNER, {
        entryId: chili.id,
        today: MONDAY,
      });
    await Promise.all([first(), first()]);
    expect(await g.texts()).toContainEqual(["1 lb ground turkey", "Chili"]);
  });
});
