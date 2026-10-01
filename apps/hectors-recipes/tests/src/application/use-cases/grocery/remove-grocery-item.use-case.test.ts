import { expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { describeEachBackend, OWNER } from "@/tests/_support/app";
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
});
