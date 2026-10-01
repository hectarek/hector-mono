import { expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import { describeEachBackend, OWNER, PARTNER } from "@/tests/_support/app";
import { groceryFixture } from "@/tests/_support/grocery";

describeEachBackend("updateGroceryItem", () => {
  it("replaces the text and keeps where it came from", async () => {
    const g = await groceryFixture();
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    const [garlic] = await g.app.getGroceryList(g.planId, OWNER);

    await g.app.updateGroceryItem(garlic?.id ?? "", "1 head garlic", OWNER);

    const [edited] = await g.app.getGroceryList(g.planId, OWNER);
    expect(edited).toMatchObject({
      id: garlic?.id,
      text: "1 head garlic",
      sourceNote: "Chili",
    });
  });

  // An edited line is like one typed in: it has no parsed amount, so a later recipe
  // can't sum into a number the text no longer says.
  it("drops the parsed amount, so later adds don't merge into it", async () => {
    const g = await groceryFixture();
    await g.app.addRecipesToList(g.planId, [{ recipeId: g.chiliId }], OWNER);
    const [garlic] = await g.app.getGroceryList(g.planId, OWNER);
    await g.app.updateGroceryItem(garlic?.id ?? "", "1 head garlic", OWNER);

    const [edited] = await g.app.getGroceryList(g.planId, OWNER);
    expect(edited).toMatchObject({
      quantity: null,
      unit: null,
      ingredientId: null,
    });

    await g.app.addRecipesToList(g.planId, [{ recipeId: g.tacosId }], OWNER);
    expect((await g.texts()).map(([text]) => text)).toContain("1 head garlic");
  });

  it("viewers can't edit, and a removed item isn't found", async () => {
    const g = await groceryFixture();
    await g.app.addGroceryItem(g.planId, "Milk", OWNER);
    const [milk] = await g.app.getGroceryList(g.planId, OWNER);

    await g.app.join(g.planId, PARTNER, "viewer");
    await expect(
      g.app.updateGroceryItem(milk?.id ?? "", "Oat milk", PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);

    await g.app.removeGroceryItem(milk?.id ?? "", OWNER);
    await expect(
      g.app.updateGroceryItem(milk?.id ?? "", "Oat milk", OWNER),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
