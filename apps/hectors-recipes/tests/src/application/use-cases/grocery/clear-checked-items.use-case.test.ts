import { expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { describeEachBackend, OWNER, PARTNER } from "@/tests/_support/app";
import { groceryFixture } from "@/tests/_support/grocery";

describeEachBackend("clearCheckedItems", () => {
  it("removes only checked items and says how many", async () => {
    const g = await groceryFixture();
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    const [garlic] = await g.app.getGroceryList(g.planId, OWNER);
    await g.app.setGroceryItemChecked(garlic?.id ?? "", true, OWNER);

    expect(await g.app.clearCheckedItems(g.planId, OWNER)).toBe(1);
    const left = await g.app.getGroceryList(g.planId, OWNER);
    expect(left).toHaveLength(2);
    expect(left.some((item) => item.checked)).toBe(false);
  });

  it("viewers can't clear", async () => {
    const g = await groceryFixture();
    await g.app.addGroceryItem(g.planId, "Milk", OWNER);
    const [milk] = await g.app.getGroceryList(g.planId, OWNER);
    await g.app.setGroceryItemChecked(milk?.id ?? "", true, OWNER);

    await g.app.join(g.planId, PARTNER, "viewer");
    await expect(
      g.app.clearCheckedItems(g.planId, PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await g.app.getGroceryList(g.planId, OWNER)).toHaveLength(1);
  });
});
