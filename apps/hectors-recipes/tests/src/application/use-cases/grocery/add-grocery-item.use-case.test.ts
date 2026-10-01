import { expect, it } from "bun:test";
import { UnauthorizedError } from "@/src/entities/errors/common";
import { describeEachBackend, OWNER, PARTNER } from "@/tests/_support/app";
import { groceryFixture } from "@/tests/_support/grocery";

describeEachBackend("addGroceryItem", () => {
  it("adds free text; viewers can't", async () => {
    const g = await groceryFixture();
    await g.app.addGroceryItem(g.planId, "Paper towels", OWNER);
    expect(await g.texts()).toEqual([["Paper towels", null]]);

    await g.app.join(g.planId, PARTNER, "viewer");
    await expect(
      g.app.addGroceryItem(g.planId, "Eggs", PARTNER),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
