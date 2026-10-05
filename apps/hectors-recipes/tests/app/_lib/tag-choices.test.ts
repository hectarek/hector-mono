import { describe, expect, it } from "bun:test";
import {
  addTags,
  groupTagChoices,
  tagChoices,
  toggleTag,
  withNewTag,
} from "@/app/_lib/tag-choices";

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

  // D55: the picker's groups, in the catalog's order, then Other.
  it("puts the chips under Meal, Cuisine, Diet and Other, keeping their order and leaving out empty groups", () => {
    expect(
      groupTagChoices(["quick", "vegan", "dinner", "lunch"], {
        dinner: "meal",
        lunch: "meal",
        vegan: "diet",
      }),
    ).toEqual([
      { category: "meal", tags: ["dinner", "lunch"] },
      { category: "diet", tags: ["vegan"] },
      { category: null, tags: ["quick"] },
    ]);
  });

  it("gives New tag's tags its group, but not one a tag already has", () => {
    const groups = { dinner: "meal" } as const;
    expect(
      withNewTag(["lunch"], groups, { text: "Brunch, dinner", group: "diet" }),
    ).toEqual({
      chosen: ["lunch", "brunch", "dinner"],
      groups: { brunch: "diet", dinner: "meal" },
    });
    expect(
      withNewTag(["lunch"], groups, { text: "brunch", group: undefined }),
    ).toEqual({ chosen: ["lunch", "brunch"], groups });
    expect(withNewTag(["lunch"], groups, null)).toEqual({
      chosen: ["lunch"],
      groups,
    });
  });
});
