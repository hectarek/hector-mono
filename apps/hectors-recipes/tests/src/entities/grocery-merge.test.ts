import { describe, expect, it } from "bun:test";
import {
  type ExistingGroceryItem,
  formatGroceryText,
  type GroceryLine,
  type GroceryListItem,
  groceryText,
  planGroceryAdd,
  planGroceryBatch,
  singularName,
} from "@/src/entities/grocery-merge";
import { parseIngredientLine } from "@/src/entities/ingredient-line";

const flourCups: ExistingGroceryItem = {
  id: "item-1",
  checked: false,
  quantity: 1,
  unit: "cup",
  ingredientId: "flour",
};

describe("planGroceryAdd", () => {
  it("merges same ingredient and same unit", () => {
    expect(
      planGroceryAdd({ quantity: 0.5, unit: "cup", ingredientId: "flour" }, [
        flourCups,
      ]),
    ).toEqual({ kind: "merge", itemId: "item-1", quantity: 1.5 });
  });

  it("keeps different units as separate lines", () => {
    expect(
      planGroceryAdd({ quantity: 200, unit: "g", ingredientId: "flour" }, [
        flourCups,
      ]),
    ).toEqual({ kind: "insert" });
  });

  it("doesn't merge into an item already checked off", () => {
    expect(
      planGroceryAdd({ quantity: 1, unit: "cup", ingredientId: "flour" }, [
        { ...flourCups, checked: true },
      ]),
    ).toEqual({ kind: "insert" });
  });

  it("skips an amount-less line for something already on the list", () => {
    expect(
      planGroceryAdd({ quantity: null, unit: null, ingredientId: "salt" }, [
        { ...flourCups, ingredientId: "salt", unit: null },
      ]),
    ).toEqual({ kind: "skip", itemId: "item-1" });
    expect(
      planGroceryAdd({ quantity: null, unit: null, ingredientId: "salt" }, [
        { ...flourCups, ingredientId: "salt", unit: null, checked: true },
      ]),
    ).toEqual({ kind: "insert" });
  });

  it("inserts when the line has no parsed ingredient", () => {
    expect(
      planGroceryAdd({ quantity: 1, unit: "cup", ingredientId: null }, [
        flourCups,
      ]),
    ).toEqual({ kind: "insert" });
  });

  it("merges unitless counts (eggs + eggs)", () => {
    expect(
      planGroceryAdd({ quantity: 2, unit: null, ingredientId: "egg" }, [
        { ...flourCups, ingredientId: "egg", unit: null, quantity: 3 },
      ]),
    ).toEqual({ kind: "merge", itemId: "item-1", quantity: 5 });
  });
});

describe("formatGroceryText", () => {
  it.each([
    [{ quantity: 1.5, unit: "cup" as const, name: "flour" }, "1½ cups flour"],
    [{ quantity: 1, unit: "cup" as const, name: "flour" }, "1 cup flour"],
    [
      { quantity: 3, unit: "clove" as const, name: "garlic" },
      "3 cloves garlic",
    ],
    [
      { quantity: 2, unit: "tbsp" as const, name: "olive oil" },
      "2 tbsp olive oil",
    ],
    [{ quantity: 3, unit: null, name: "onion" }, "3 onions"],
    [{ quantity: 2, unit: null, name: "sweet potato" }, "2 sweet potatoes"],
    [{ quantity: 2, unit: null, name: "bay leaf" }, "2 bay leaves"],
    [{ quantity: 4, unit: null, name: "berry" }, "4 berries"],
    [{ quantity: 1, unit: null, name: "egg" }, "1 egg"],
  ])("%o → %p", (item, expected) => {
    expect(formatGroceryText(item)).toBe(expected);
  });
});

// A recipe line as the add-to-list use case builds it: parsed, with the catalog id
// standing in for the ingredient name.
function line(raw: string, source: string): GroceryLine {
  const parsed = parseIngredientLine(raw);
  return {
    text: raw,
    quantity: parsed.quantity,
    unit: parsed.unit,
    name: parsed.name,
    ingredientId: parsed.name,
    source,
  };
}

// Real lines from the Obsidian vault. The grocery list keeps the recipe's own words and
// drops only the note on preparing or serving it.
describe("groceryText", () => {
  it.each([
    ["1 red bell pepper, cut into chunks", "1 red bell pepper"],
    ["1/2 cup fresh parsley, chopped", "1/2 cup fresh parsley"],
    [
      "1 (15 oz) can black beans, drained and rinsed",
      "1 (15 oz) can black beans",
    ],
    ["2 pounds beef chuck, cut into 1½-inch pieces", "2 pounds beef chuck"],
    ["4 cups chopped kale, tough stems removed", "4 cups chopped kale"],
    [
      "1/4 cup (56 ml) almond milk, use only if needed",
      "1/4 cup (56 ml) almond milk",
    ],
    [
      "Royal icing and cinnamon candies, for decorating, optional.",
      "Royal icing and cinnamon candies",
    ],
    ["Salt, to taste", "Salt"],
    ["2 cups whole milk, plus more as needed", "2 cups whole milk"],
    ["Fresh parsley, chopped, for garnish", "Fresh parsley"],
    ["1/2 teaspoon salt, or to taste", "1/2 teaspoon salt"],
    // A bracket in the dropped note stays when it's the amount to buy, or says optional.
    ["Sharp white cheddar, shredded (8 oz)", "Sharp white cheddar (8 oz)"],
    [
      "1/4 cup feta cheese, crumbled (optional)",
      "1/4 cup feta cheese (optional)",
    ],
    ["Fresh basil, for garnish (optional)", "Fresh basil (optional)"],
    [
      "8 ounces store-bought or homemade cornbread, cut into ½-inch dice (about 3 cups)",
      "8 ounces store-bought or homemade cornbread",
    ],
    ["Salt and pepper to taste", "Salt and pepper"],
    ["Ground cinnamon for garnish", "Ground cinnamon"],
    [
      "8 chicken thighs - (skinless and boneless)",
      "8 chicken thighs (skinless and boneless)",
    ],
    ["2 tbsp cornflour - (cornstarch)", "2 tbsp cornflour (cornstarch)"],
  ])("%p → %p", (line, expected) => {
    expect(groceryText(line)).toBe(expected);
  });

  // Sizes, alternatives and anything after a comma that isn't a preparation note stay:
  // they can be what you're buying.
  it.each([
    "1 can (14 ounces) crushed tomatoes",
    "110 g (⅓ cup) honey",
    "1 cup cooked black beans (or 1 can, drained and rinsed)",
    "Cayenne pepper (optional)",
    "1 lb chicken thighs, boneless and skinless",
    "3packets rapid-rise, bread-machine or other instant yeast",
    "1 box dry pasta (16 oz)",
    // "plus" + an amount is more to buy, not a note.
    "3envelopes/2 tablespoons, plus 1½ teaspoons powdered unflavored gelatin",
    "10 fresh sage leaves, plus ⅓ cup coarsely chopped sage (¾ ounce)",
  ])("keeps %p", (line) => {
    expect(groceryText(line)).toBe(line);
  });

  it("never empties a line", () => {
    expect(groceryText("to taste")).toBe("to taste");
  });
});

describe("planGroceryBatch", () => {
  it("merges within the batch and keeps where each line came from", () => {
    const changes = planGroceryBatch(
      [
        line("2 cloves garlic, minced", "Chili"),
        line("1 onion, diced", "Chili"),
        line("4 garlic cloves", "Tacos"),
        line("Salt and pepper, to taste", "Chili"),
        line("Salt and pepper, to taste", "Tacos"),
      ],
      [],
    );

    expect(changes.updates).toEqual([]);
    expect(changes.skipped).toBe(1);
    expect(
      changes.inserts.map((item) => [
        item.text,
        item.quantity,
        item.sourceNote,
      ]),
    ).toEqual([
      ["6 cloves garlic", 6, "Chili, Tacos"],
      ["1 onion, diced", 1, "Chili"],
      ["Salt and pepper, to taste", null, "Chili, Tacos"],
    ]);
  });

  it("merges into unchecked items already on the list, not checked ones", () => {
    const existing: GroceryListItem[] = [
      {
        id: "garlic-item",
        checked: false,
        text: "2 cloves garlic",
        quantity: 2,
        unit: "clove",
        ingredientId: "garlic",
        sourceNote: "Pesto",
      },
      {
        id: "old-onion",
        checked: true,
        text: "1 onion",
        quantity: 1,
        unit: null,
        ingredientId: "onion",
        sourceNote: null,
      },
    ];

    const changes = planGroceryBatch(
      [line("1 clove garlic", "Chili"), line("2 onions", "Chili")],
      existing,
    );

    expect(changes.updates).toEqual([
      {
        id: "garlic-item",
        text: "3 cloves garlic",
        quantity: 3,
        sourceNote: "Pesto, Chili",
      },
    ]);
    expect(changes.inserts.map((item) => item.text)).toEqual(["2 onions"]);
  });

  it("keeps different units as separate lines", () => {
    const changes = planGroceryBatch(
      [line("1 cup flour", "Bread"), line("200 g flour", "Cake")],
      [],
    );
    expect(changes.inserts.map((item) => item.text)).toEqual([
      "1 cup flour",
      "200 g flour",
    ]);
  });
});

describe("singularName", () => {
  it.each([
    ["large eggs", "large egg"],
    ["onion", "onion"],
    ["Bay Leaves", "Bay leaf"],
    ["crushed tomatoes (28-ounce)", "crushed tomatoes (28-ounce)"],
  ])("%p → %p", (name, expected) => {
    expect(singularName(name)).toBe(expected);
  });
});
