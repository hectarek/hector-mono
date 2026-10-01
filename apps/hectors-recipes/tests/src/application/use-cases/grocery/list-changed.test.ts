import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import {
  GROCERY_LIST_CHANGED,
  planChannel,
  type RealtimeEvent,
} from "@/src/entities/realtime";
import {
  describeEachBackend,
  MONDAY,
  OWNER,
  PARTNER,
} from "@/tests/_support/app";
import { type GroceryFixture, groceryFixture } from "@/tests/_support/grocery";

// Every write that changes a plan's grocery list tells that plan's channel, once, after it
// has committed (ux-plan D21); a write that changes nothing, or is refused, tells no one.
describeEachBackend("grocery writes tell the plan's channel", () => {
  let g: GroceryFixture;
  // The one message a change sends: "this plan's list changed".
  let changed: { channel: string; event: RealtimeEvent }[];
  const told = () => g.app.realtime.published.splice(0);

  beforeEach(async () => {
    g = await groceryFixture();
    changed = [{ channel: planChannel(g.planId), event: GROCERY_LIST_CHANGED }];
  });

  it("adding, checking, editing, removing and clearing each publish once", async () => {
    await g.app.addGroceryItem(g.planId, "Milk", OWNER);
    expect(told()).toEqual(changed);
    const [milk] = await g.app.getGroceryList(g.planId, OWNER);
    const id = milk?.id ?? "";

    await g.app.setGroceryItemChecked(id, true, OWNER);
    expect(told()).toEqual(changed);
    await g.app.updateGroceryItem(id, "Oat milk", OWNER);
    expect(told()).toEqual(changed);
    await g.app.clearCheckedItems(g.planId, OWNER);
    expect(told()).toEqual(changed);

    await g.app.addGroceryItem(g.planId, "Eggs", OWNER);
    told();
    const [eggs] = await g.app.getGroceryList(g.planId, OWNER);
    await g.app.removeGroceryItem(eggs?.id ?? "", OWNER);
    expect(told()).toEqual(changed);
  });

  it("adding a recipe or planned meals publishes, unless nothing was added", async () => {
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    expect(told()).toEqual(changed);
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    expect(told()).toEqual([]);

    await g.app.planMeal(g.planId, MONDAY, { recipeId: g.tacosId });
    await g.app.addPlanToList(g.planId, OWNER, { today: MONDAY });
    expect(told()).toEqual(changed);
    await g.app.addPlanToList(g.planId, OWNER, { today: MONDAY });
    expect(told()).toEqual([]);
  });

  it("clearing when nothing is checked, or a refused write, publishes nothing", async () => {
    await g.app.clearCheckedItems(g.planId, OWNER);
    expect(told()).toEqual([]);

    await g.app.join(g.planId, PARTNER, "viewer");
    await expect(
      g.app.addGroceryItem(g.planId, "Milk", PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(told()).toEqual([]);
  });
});
