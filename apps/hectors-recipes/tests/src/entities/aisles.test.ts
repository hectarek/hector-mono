import { describe, expect, it } from "bun:test";
import { groupByAisle } from "@/src/entities/aisles";

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
