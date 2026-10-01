import { beforeEach, expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { describeEachBackend, OWNER, PARTNER } from "@/tests/_support/app";
import { type GroceryFixture, groceryFixture } from "@/tests/_support/grocery";

describeEachBackend("setGroceryItemChecked", () => {
  let g: GroceryFixture;
  let itemId: string;

  beforeEach(async () => {
    g = await groceryFixture();
    await g.app.addGroceryItem(g.planId, "Milk", OWNER);
    itemId = (await g.app.getGroceryList(g.planId, OWNER))[0]?.id ?? "";
  });

  it("checks an item off and back on", async () => {
    await g.app.setGroceryItemChecked(itemId, true, OWNER);
    expect((await g.app.getGroceryList(g.planId, OWNER))[0]?.checked).toBe(
      true,
    );
    await g.app.setGroceryItemChecked(itemId, false, OWNER);
    expect((await g.app.getGroceryList(g.planId, OWNER))[0]?.checked).toBe(
      false,
    );
  });

  it("viewers see the list but can't check things off", async () => {
    await g.app.join(g.planId, PARTNER, "viewer");
    expect(await g.app.getGroceryList(g.planId, PARTNER)).toHaveLength(1);
    await expect(
      g.app.setGroceryItemChecked(itemId, true, PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
