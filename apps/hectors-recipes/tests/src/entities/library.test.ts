import { describe, expect, it } from "bun:test";
import { buildLibraryView, searchRecipes } from "@/src/entities/library";
import type { ListedRecipe } from "@/src/entities/models/recipe.model";

const recipe = (
  title: string,
  tags: string[] = [],
  ingredientNames: string[] = [],
): ListedRecipe => ({
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
  ingredientNames,
});

const titles = (recipes: ListedRecipe[]) => recipes.map((r) => r.title);

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

  it("filters by search and tag, and keeps every tag while filtering", () => {
    const view = buildLibraryView(book, { search: "ta", tag: "dinner" });
    expect(titles(view.recipes)).toEqual(["Tacos", "Pasta"]);
    expect(view.tags).toHaveLength(4);
  });
});

// The library's search (D56), the same on the server and as you type (ux-plan P10.4).
describe("searchRecipes", () => {
  it("finds the words anywhere in the title, ignoring case and spaces around them", () => {
    const tacos = [recipe("Sweet Potato Tacos")];
    expect(titles(searchRecipes(tacos, " potato "))).toEqual([
      "Sweet Potato Tacos",
    ]);
    expect(titles(searchRecipes(tacos, "TACO"))).toEqual([
      "Sweet Potato Tacos",
    ]);
    expect(searchRecipes(tacos, "chili")).toEqual([]);
  });

  it("lets everything through with no search", () => {
    const book = [recipe("Chili"), recipe("Tacos")];
    expect(searchRecipes(book, "")).toEqual(book);
    expect(searchRecipes(book, "  ")).toEqual(book);
    expect(searchRecipes(book, undefined)).toEqual(book);
  });

  it("finds a word in an ingredient's name", () => {
    const book = [
      recipe("Kofta", [], ["ground beef", "ground cumin"]),
      recipe("Pancakes", [], ["flour", "milk"]),
    ];
    expect(titles(searchRecipes(book, "cumin"))).toEqual(["Kofta"]);
  });

  it("finds a tag", () => {
    const book = [
      recipe("Chili", ["dinner", "vegan"]),
      recipe("Stew", ["dinner"]),
    ];
    expect(titles(searchRecipes(book, "vegan"))).toEqual(["Chili"]);
  });

  it("needs every word, each matched anywhere", () => {
    const book = [
      recipe("Yellow Curry", ["dinner"], ["chicken thighs", "coconut milk"]),
      recipe("Green Curry", ["dinner"], ["tofu", "coconut milk"]),
      recipe("Roast Chicken", ["dinner"], ["chicken", "lemon"]),
    ];
    expect(titles(searchRecipes(book, "chicken curry"))).toEqual([
      "Yellow Curry",
    ]);
    expect(titles(searchRecipes(book, "coconut dinner tofu"))).toEqual([
      "Green Curry",
    ]);
  });

  it("puts recipes with more of the words in their title first, otherwise keeping the order", () => {
    const book = [
      recipe("Burrito Bowls", [], ["chicken thighs", "rice"]),
      recipe("Chicken and Rice", [], ["chicken", "rice"]),
      recipe("Chicken Soup", [], ["chicken", "rice"]),
      recipe("Fried Rice", [], ["chicken", "rice"]),
    ];
    expect(titles(searchRecipes(book, "chicken rice"))).toEqual([
      "Chicken and Rice",
      "Chicken Soup",
      "Fried Rice",
      "Burrito Bowls",
    ]);
  });

  it("ignores accents, typed or in the recipe", () => {
    const book = [recipe("Sablé Cookies"), recipe("Zucchini Saute")];
    expect(titles(searchRecipes(book, "sable"))).toEqual(["Sablé Cookies"]);
    expect(titles(searchRecipes(book, "sauté"))).toEqual(["Zucchini Saute"]);
  });
});
