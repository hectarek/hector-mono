import { describe, expect, it } from "bun:test";
import {
  buildLibraryView,
  groupRecipes,
  orderRecipes,
  recipeCountText,
  searchRecipes,
} from "@/src/entities/library";
import type { ListedRecipe } from "@/src/entities/models/recipe.model";
import type { TagGroups } from "@/src/entities/models/tag.model";

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
  videoUrl: null,
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

  it("filters by search and tag, and keeps every tag and the book's count while filtering", () => {
    const view = buildLibraryView(book, { search: "ta", tag: "dinner" });
    expect(titles(view.recipes)).toEqual(["Tacos", "Pasta"]);
    expect(view.tags).toHaveLength(4);
    expect(view.total).toBe(4);
  });
});

// P23.2: a book's count, and how many of them a search or tag leaves.
describe("recipeCountText", () => {
  it("counts a book, and what's left of it while narrowed", () => {
    expect(recipeCountText(24)).toBe("24 recipes");
    expect(recipeCountText(1)).toBe("1 recipe");
    expect(recipeCountText(0)).toBe("0 recipes");
    expect(recipeCountText(3, 24)).toBe("3 of 24 recipes");
    expect(recipeCountText(1, 1)).toBe("1 recipe");
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

// Grouping the library (D57), with the catalog's groups as the library gets them.
describe("groupRecipes", () => {
  const tagGroups: TagGroups = {
    breakfast: "meal",
    lunch: "meal",
    dinner: "meal",
    dessert: "meal",
    italian: "cuisine",
    british: "cuisine",
    mexican: "cuisine",
    vegetarian: "diet",
    vegan: "diet",
    "gluten-free": "diet",
    keto: "diet",
  };
  const headings = (groups: ReturnType<typeof groupRecipes>) =>
    groups.map((group) => [group.tag, titles(group.recipes)]);

  it("puts a recipe under each of its meals, in the order of a day, and the rest under Other last", () => {
    const book = [
      recipe("Brownies", ["dessert", "vegan"]),
      recipe("Frittata", ["dinner", "breakfast"]),
      recipe("Salad", ["lunch", "dinner"]),
      recipe("Stock", ["weeknight"]),
      recipe("Toum"),
    ];
    expect(headings(groupRecipes(book, "meal", tagGroups))).toEqual([
      ["breakfast", ["Frittata"]],
      ["lunch", ["Salad"]],
      ["dinner", ["Frittata", "Salad"]],
      ["dessert", ["Brownies"]],
      [null, ["Stock", "Toum"]],
    ]);
  });

  it("orders cuisines A to Z, a newer one among them", () => {
    const book = [
      recipe("Tacos", ["mexican"]),
      recipe("Pie", ["british"]),
      recipe("Pasta", ["italian"]),
    ];
    expect(headings(groupRecipes(book, "cuisine", tagGroups))).toEqual([
      ["british", ["Pie"]],
      ["italian", ["Pasta"]],
      ["mexican", ["Tacos"]],
    ]);
  });

  it("orders diets as D58 lists them, a newer one after", () => {
    const book = [
      recipe("Eggs", ["keto", "gluten-free", "vegetarian"]),
      recipe("Lentils", ["vegan", "vegetarian"]),
    ];
    expect(headings(groupRecipes(book, "diet", tagGroups))).toEqual([
      ["vegetarian", ["Eggs", "Lentils"]],
      ["vegan", ["Lentils"]],
      ["gluten-free", ["Eggs"]],
      ["keto", ["Eggs"]],
    ]);
  });

  it("keeps the order it's given within a heading, as search ranked it", () => {
    const ranked = [
      recipe("Zucchini Pasta", ["dinner"]),
      recipe("Apple Pie", ["dinner"]),
    ];
    expect(headings(groupRecipes(ranked, "meal", tagGroups))).toEqual([
      ["dinner", ["Zucchini Pasta", "Apple Pie"]],
    ]);
    expect(groupRecipes([], "meal", tagGroups)).toEqual([]);
  });
});

// D80: the library's order, before search and grouping.
describe("orderRecipes", () => {
  const [apple, bread, chili, dal] = ["Apple Pie", "Bread", "Chili", "Dal"].map(
    (title) => recipe(title),
  );
  const list = [apple, bread, chili, dal] as ListedRecipe[];
  const none = { saved: [], viewedAt: {} };

  it("puts saved recipes first, each part A to Z", () => {
    expect(
      titles(
        orderRecipes(list, "saved", {
          saved: [dal?.id ?? "", bread?.id ?? ""],
          viewedAt: {},
        }),
      ),
    ).toEqual(["Bread", "Dal", "Apple Pie", "Chili"]);
    expect(titles(orderRecipes(list, "saved", none))).toEqual(titles(list));
  });

  it("puts the last opened first, the rest A to Z", () => {
    const viewedAt = { [chili?.id ?? ""]: 100, [apple?.id ?? ""]: 300 };
    expect(
      titles(orderRecipes(list, "recent", { saved: [], viewedAt })),
    ).toEqual(["Apple Pie", "Chili", "Bread", "Dal"]);
  });

  it("leaves A to Z as it comes", () => {
    expect(
      titles(
        orderRecipes(list, "az", { saved: [dal?.id ?? ""], viewedAt: {} }),
      ),
    ).toEqual(titles(list));
  });
});
