import { beforeEach, describe, expect, it, spyOn } from "bun:test";
import { OWNER, postgresRepositories } from "@/tests/_support/app";
import { resetDatabase } from "@/tests/_support/database";
import { groceryFixture } from "@/tests/_support/grocery";

describe("GroceryItemsRepository (Postgres)", () => {
  beforeEach(resetDatabase);

  it("a recipe's ingredients land on the list in recipe order", async () => {
    const g = await groceryFixture(postgresRepositories());
    const recipeId = (
      await g.app.newRecipe(g.bookId, {
        title: "Long",
        ingredients: Array.from({ length: 15 }, (_, i) => ({
          raw: `item${i}`,
        })),
      })
    ).id;

    await g.app.addRecipesToList(g.planId, [{ recipeId }], OWNER);
    expect((await g.texts()).map(([text]) => text)).toEqual(
      Array.from({ length: 15 }, (_, i) => `item${i}`),
    );
  });

  it("an item's aisle is its catalog ingredient's", async () => {
    const g = await groceryFixture(postgresRepositories());
    const recipeId = (await g.app.newRecipe(g.bookId, { title: "Soup" })).id;
    await g.app.repos.recipes.update(recipeId, {
      ingredients: [
        {
          raw: "1 onion",
          quantity: 1,
          unit: null,
          name: "onion",
          note: null,
          optional: false,
          catalogName: "onion",
          aisle: "produce",
        },
      ],
    });
    await g.app.addRecipesToList(g.planId, [{ recipeId }], OWNER);
    await g.app.addGroceryItem(g.planId, "paper towels", OWNER);

    expect(
      (await g.app.getGroceryList(g.planId, OWNER)).map((item) => [
        item.text,
        item.aisle,
      ]),
    ).toEqual([
      ["1 onion", "produce"],
      ["paper towels", null],
    ]);
  });

  // Each batch steps its timestamps from now(); a batch added before the previous one's
  // steps ran out (or with a clock behind the last write) must still sort after it.
  it("items added later always come after the ones already on the list", async () => {
    const g = await groceryFixture(postgresRepositories());
    const insert = (texts: string[]) => insertBatch(g, texts);
    const frozen = spyOn(Date, "now").mockReturnValue(
      Date.parse("2026-09-24T12:00:00Z"),
    );
    try {
      await insert(["garlic", "turkey", "salt"]);
      await insert(["cumin"]);
    } finally {
      frozen.mockRestore();
    }

    expect((await g.texts()).map(([text]) => text)).toEqual([
      "garlic",
      "turkey",
      "salt",
      "cumin",
    ]);
  });

  // A typed item stamps itself after the newest item too. With the database's own clock it
  // landed among a recipe's lines when they were stamped a moment ahead of it (seen once in a
  // full test run, 2026-09-30); a clock an hour ahead makes that certain.
  it("a typed item comes after the items already on the list", async () => {
    const g = await groceryFixture(postgresRepositories());
    const ahead = spyOn(Date, "now").mockReturnValue(Date.now() + 3_600_000);
    try {
      await insertBatch(g, ["garlic", "turkey"]);
    } finally {
      ahead.mockRestore();
    }
    await g.app.addGroceryItem(g.planId, "paper towels", OWNER);

    expect((await g.texts()).map(([text]) => text)).toEqual([
      "garlic",
      "turkey",
      "paper towels",
    ]);
  });

  it("merge updates never reach an item on another list", async () => {
    const g = await groceryFixture(postgresRepositories());
    const otherList = await g.app.newSpace("meal-plan", OWNER, "Other");
    await g.app.addGroceryItem(otherList, "Milk", OWNER);
    const [milk] = await g.app.getGroceryList(otherList, OWNER);

    await g.app.repos.transactions.startTransaction((tx) =>
      g.app.repos.groceryItems.applyChanges(
        g.planId,
        {
          inserts: [],
          updates: [
            {
              id: milk?.id ?? "",
              text: "hijacked",
              quantity: 9,
              sourceNote: null,
            },
          ],
          skipped: 0,
        },
        OWNER,
        tx,
      ),
    );

    expect((await g.app.getGroceryList(otherList, OWNER))[0]?.text).toBe(
      "Milk",
    );
  });
});

// A recipe's lines as the grocery use cases write them: one batch through applyChanges.
function insertBatch(
  g: Awaited<ReturnType<typeof groceryFixture>>,
  texts: string[],
): Promise<void> {
  return g.app.repos.transactions.startTransaction((tx) =>
    g.app.repos.groceryItems.applyChanges(
      g.planId,
      {
        inserts: texts.map((text) => ({
          text,
          quantity: null,
          unit: null,
          ingredientId: null,
          sourceNote: null,
        })),
        updates: [],
        skipped: 0,
      },
      OWNER,
      tx,
    ),
  );
}
