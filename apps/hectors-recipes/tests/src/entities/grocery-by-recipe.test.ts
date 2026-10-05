import { describe, expect, it } from "bun:test";
import { groupByRecipe, shareText } from "@/src/entities/grocery-by-recipe";
import type { ItemRecipe } from "@/src/entities/grocery-merge";

const item = (
  text: string,
  quantity: number | null,
  recipes: ItemRecipe[] = [],
) => ({ text, quantity, recipes });
const share = (title: string, quantity: number | null): ItemRecipe => ({
  recipeId: title,
  title,
  quantity,
});

// Texts as the list writes them (formatGroceryText), read back at one recipe's share.
describe("shareText", () => {
  it.each([
    ["6 cloves garlic", 6, 2, "2 cloves garlic"],
    ["3 onions", 3, 1, "1 onion"],
    ["1½ cups flour", 1.5, 0.5, "½ cup flour"],
    ["4 large eggs", 4, 2, "2 large eggs"],
    [
      "2 cans crushed tomatoes (14 ounces)",
      2,
      1,
      "1 can crushed tomatoes (14 ounces)",
    ],
  ])("%s at a share of %d of %d is %s", (text, quantity, part, expected) => {
    expect(shareText(item(text, quantity), part)).toBe(expected);
  });

  it("keeps the item's text when the share is all of it, or has no amount", () => {
    expect(shareText(item("2 cloves garlic", 2), 2)).toBe("2 cloves garlic");
    expect(shareText(item("Salt", null), null)).toBe("Salt");
    // Edited into plain text: the share's amount no longer matches what it says.
    expect(shareText(item("1 head garlic", null), 2)).toBe("1 head garlic");
  });
});

// D60: what's left to buy, under each recipe it's for.
describe("groupByRecipe", () => {
  it("puts an item under each of its recipes at that recipe's share, recipes in the order added, by hand last", () => {
    const groups = groupByRecipe([
      item("Milk", null),
      item("6 cloves garlic", 6, [share("Chili", 2), share("Tacos", 4)]),
      item("1 lb ground turkey", 1, [share("Chili", 1)]),
      item("Salt", null, [share("Chili", null), share("Tacos", null)]),
      item("Paper towels", null),
    ]);
    expect(
      groups.map((group) => [group.label, group.rows.map((row) => row.text)]),
    ).toEqual([
      ["Chili", ["2 cloves garlic", "1 lb ground turkey", "Salt"]],
      ["Tacos", ["4 cloves garlic", "Salt"]],
      ["Added by hand", ["Milk", "Paper towels"]],
    ]);
  });

  it("has no Added by hand when everything came from a recipe", () => {
    expect(
      groupByRecipe([item("1 onion", 1, [share("Soup", 1)])]).map(
        (group) => group.label,
      ),
    ).toEqual(["Soup"]);
    expect(groupByRecipe([])).toEqual([]);
  });
});
