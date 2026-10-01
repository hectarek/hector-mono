import { describe, expect, it } from "bun:test";
import { buildLibraryView, matchesSearch } from "@/src/entities/library";
import type { Recipe } from "@/src/entities/models/recipe.model";

const recipe = (title: string, tags: string[]): Recipe => ({
  id: crypto.randomUUID(),
  spaceId: crypto.randomUUID(),
  createdBy: crypto.randomUUID(),
  title,
  description: null,
  timeMinutes: null,
  yieldServings: null,
  tags,
  sourceUrl: null,
  imageUrl: null,
  copiedFromRecipeId: null,
  externalRef: null,
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("buildLibraryView", () => {
  const book = [
    recipe("Chili", ["dinner", "mexican"]),
    recipe("Tacos", ["dinner", "mexican"]),
    recipe("Pasta", ["dinner", "italian"]),
    recipe("Brownies", ["dessert"]),
  ];

  // At 375 px only the first few chips show, so the tags you'd use most come first.
  it("lists tags by how many recipes use them, then alphabetically", () => {
    expect(buildLibraryView(book, {}).tags).toEqual([
      "dinner",
      "mexican",
      "dessert",
      "italian",
    ]);
  });

  it("filters by title and tag, and keeps every tag while filtering", () => {
    const view = buildLibraryView(book, { search: "ta", tag: "dinner" });
    expect(view.recipes.map((r) => r.title)).toEqual(["Tacos", "Pasta"]);
    expect(view.tags).toHaveLength(4);
  });
});

// The library's search, the same on the server and as you type (ux-plan P10.4).
describe("matchesSearch", () => {
  it("finds the words anywhere in the title, ignoring case and spaces around them", () => {
    expect(matchesSearch({ title: "Sweet Potato Tacos" }, " potato ")).toBe(
      true,
    );
    expect(matchesSearch({ title: "Sweet Potato Tacos" }, "TACO")).toBe(true);
    expect(matchesSearch({ title: "Sweet Potato Tacos" }, "chili")).toBe(false);
  });

  it("lets everything through with no search", () => {
    expect(matchesSearch({ title: "Chili" }, "")).toBe(true);
    expect(matchesSearch({ title: "Chili" }, undefined)).toBe(true);
  });
});
