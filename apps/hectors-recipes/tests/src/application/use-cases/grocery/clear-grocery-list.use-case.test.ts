import { expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  describeEachBackend,
  MONDAY,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";
import { type GroceryFixture, groceryFixture } from "@/tests/_support/grocery";

// Starting a plan's list over (docs/ux-plan.md D52). Today is MONDAY.
describeEachBackend("clearGroceryList", () => {
  const planChiliAndAdd = async (g: GroceryFixture, planId = g.planId) => {
    await g.app.addPlanEntry(
      {
        spaceId: planId,
        recipeId: g.chiliId,
        cookDate: MONDAY,
        eatDates: [MONDAY],
      },
      OWNER,
    );
    await g.app.addPlanToList(planId, OWNER, { today: MONDAY });
  };

  it("removes every item, checked or not, and Plan can add its meals again", async () => {
    const g = await groceryFixture();
    await planChiliAndAdd(g);
    await g.app.addGroceryItem(g.planId, "Paper towels", OWNER);
    const [garlic] = await g.app.getGroceryList(g.planId, OWNER);
    await g.app.setGroceryItemChecked(garlic?.id ?? "", true, OWNER);
    expect(await g.app.listMealsToAdd(g.planId, OWNER, MONDAY)).toEqual([]);
    const published = g.app.realtime.published.length;

    expect(await g.app.clearGroceryList(g.planId, OWNER)).toBe(4);
    expect(await g.app.getGroceryList(g.planId, OWNER)).toEqual([]);
    expect(g.app.realtime.published.length).toBe(published + 1);

    expect(await g.app.listMealsToAdd(g.planId, OWNER, MONDAY)).toEqual([
      MONDAY,
    ]);
    await g.app.addPlanToList(g.planId, OWNER, { today: MONDAY });
    expect(await g.texts()).toEqual([
      ["2 cloves garlic", "Chili"],
      ["1 lb ground turkey", "Chili"],
      ["Salt", "Chili"],
    ]);
  });

  it("viewers can't clear", async () => {
    const g = await groceryFixture();
    await g.app.addGroceryItem(g.planId, "Milk", OWNER);
    await g.app.join(g.planId, PARTNER, "viewer");

    await expect(
      g.app.clearGroceryList(g.planId, PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await g.app.getGroceryList(g.planId, OWNER)).toHaveLength(1);
  });

  it("leaves another plan's list and meals alone", async () => {
    const g = await groceryFixture();
    const other = await g.app.newSpace("meal-plan", OWNER, "Other");
    await planChiliAndAdd(g, other);
    await g.app.addGroceryItem(g.planId, "Milk", OWNER);

    await g.app.clearGroceryList(g.planId, OWNER);
    expect(await g.app.getGroceryList(other, OWNER)).toHaveLength(3);
    expect(await g.app.listMealsToAdd(other, OWNER, MONDAY)).toEqual([]);
  });
});
