import { describe, expect, it } from "bun:test";
import { groupByAisle, stackLikeItems } from "@/src/entities/aisles";

// D61: like items together, so you don't walk back for the garlic.
describe("stackLikeItems", () => {
  const item = (text: string, ingredientId: string | null) => ({
    text,
    ingredientId,
  });

  it("moves later items of an ingredient up under the first, keeping everything else in order", () => {
    const stacked = stackLikeItems([
      item("2 cloves garlic", "garlic"),
      item("1 onion", "onion"),
      item("Milk", null),
      item("1 tbsp garlic", "garlic"),
      item("2 onions, sliced", "onion"),
      item("Bread", null),
    ]);
    expect(stacked.map((entry) => entry.text)).toEqual([
      "2 cloves garlic",
      "1 tbsp garlic",
      "1 onion",
      "2 onions, sliced",
      "Milk",
      "Bread",
    ]);
  });

  it("leaves items with no ingredient where they are", () => {
    const stacked = stackLikeItems([
      item("Milk", null),
      item("1 onion", "onion"),
      item("Bread", null),
    ]);
    expect(stacked.map((entry) => entry.text)).toEqual([
      "Milk",
      "1 onion",
      "Bread",
    ]);
  });
});

describe("groupByAisle", () => {
  it("groups items in store-walk order, each aisle keeping its order, with no aisle last", () => {
    const items = [
      { text: "milk", aisle: "dairy-and-eggs" as const },
      { text: "paper towels", aisle: null },
      { text: "onions", aisle: "produce" as const },
      { text: "eggs", aisle: "dairy-and-eggs" as const },
      { text: "garlic", aisle: "produce" as const },
    ];
    expect(
      groupByAisle(items).map((group) => [
        group.label,
        group.items.map((item) => item.text),
      ]),
    ).toEqual([
      ["Produce", ["onions", "garlic"]],
      ["Dairy & eggs", ["milk", "eggs"]],
      ["Other", ["paper towels"]],
    ]);
  });
});
