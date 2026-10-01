import { expect, it } from "bun:test";
import { NotFoundError, UnauthorizedError } from "@/src/entities/errors/common";
import { describeEachBackend, OWNER, PARTNER } from "@/tests/_support/app";
import { groceryFixture } from "@/tests/_support/grocery";

describeEachBackend("removeGroceryItem", () => {
  it("removes it; removing again is not found", async () => {
    const g = await groceryFixture();
    await g.app.addGroceryItem(g.planId, "Paper towels", OWNER);
    const [item] = await g.app.getGroceryList(g.planId, OWNER);

    await g.app.removeGroceryItem(item?.id ?? "", OWNER);
    expect(await g.app.getGroceryList(g.planId, OWNER)).toEqual([]);
    await expect(
      g.app.removeGroceryItem(item?.id ?? "", OWNER),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("viewers can't remove", async () => {
    const g = await groceryFixture();
    await g.app.addGroceryItem(g.planId, "Milk", OWNER);
    const [milk] = await g.app.getGroceryList(g.planId, OWNER);

    await g.app.join(g.planId, PARTNER, "viewer");
    await expect(
      g.app.removeGroceryItem(milk?.id ?? "", PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await g.texts()).toEqual([["Milk", null]]);
  });
});
