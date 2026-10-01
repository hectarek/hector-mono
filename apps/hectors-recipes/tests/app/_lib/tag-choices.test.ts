import { describe, expect, it } from "bun:test";
import { addTags, tagChoices, toggleTag } from "@/app/_lib/tag-choices";

describe("tag choices", () => {
  it("offers the book's tags in their order, then the recipe's own", () => {
    expect(tagChoices(["dinner", "vegan"], ["lunch", "vegan"])).toEqual([
      "dinner",
      "vegan",
      "lunch",
    ]);
  });

  it("toggles a chip", () => {
    expect(toggleTag(["dinner"], "vegan")).toEqual(["dinner", "vegan"]);
    expect(toggleTag(["dinner", "vegan"], "dinner")).toEqual(["vegan"]);
  });

  it("adds a typed tag tidied, and picks the one already there instead of a copy", () => {
    expect(addTags(["dinner"], "  Side   Dish ")).toEqual([
      "dinner",
      "side dish",
    ]);
    expect(addTags(["dinner"], "DINNER")).toEqual(["dinner"]);
    expect(addTags([], "Quick, quick, vegan")).toEqual(["quick", "vegan"]);
    expect(addTags(["dinner"], " , ")).toEqual(["dinner"]);
  });
});
