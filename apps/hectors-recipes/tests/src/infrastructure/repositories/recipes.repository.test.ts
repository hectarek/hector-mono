import { beforeEach, describe, expect, it } from "bun:test";
import type { Aisle } from "@/src/entities/aisles";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import { itemizeLine } from "@/src/entities/ingredient-item";
import { toLineWrites } from "@/src/entities/models/recipe-ingredient.model";
import {
  MONDAY,
  makeApp,
  OWNER,
  postgresRepositories,
  type TestApp,
} from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

describe("RecipesRepository (Postgres)", () => {
  let app: TestApp;
  let bookId: string;

  beforeEach(async () => {
    await resetDatabase();
    app = makeApp(postgresRepositories());
    bookId = await app.newSpace("recipe-book");
  });

  const record = (title: string, lines: string[]) => ({
    title,
    ingredients: toLineWrites(lines.map((raw) => ({ raw }))),
    steps: [{ text: `Make ${title}.`, timerMinutes: null, section: null }],
  });

  it("recipes can only live in a recipe book", async () => {
    const planId = await app.newSpace("meal-plan");
    await expect(
      app.repos.recipes.create(record("x", ["1 egg"]), planId, OWNER),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });

  it("createMany keeps each recipe's lines with that recipe, in order", async () => {
    const recipes = Array.from({ length: 12 }, (_, i) =>
      record(`Recipe ${i}`, [`${i + 1} cups flour`, `${i + 1} eggs`, "salt"]),
    );
    expect(await app.repos.recipes.createMany(recipes, bookId, OWNER)).toBe(12);

    const listed = await app.repos.recipes.getBySpace(bookId);
    const loaded = await app.repos.recipes.getByIds(listed.map((r) => r.id));
    for (const recipe of loaded) {
      const i = Number(recipe.title.split(" ")[1]);
      expect(
        recipe.ingredients.map((line) => [line.position, line.raw]),
      ).toEqual([
        [0, `${i + 1} cups flour`],
        [1, `${i + 1} eggs`],
        [2, "salt"],
      ]);
      expect(recipe.steps.map((step) => step.text)).toEqual([
        `Make ${recipe.title}.`,
      ]);
    }
  });

  it("getByIds returns each found recipe once and skips missing ids", async () => {
    const { id } = await app.newRecipe(bookId);
    const found = await app.repos.recipes.getByIds([
      id,
      id,
      crypto.randomUUID(),
    ]);
    expect(found.map((recipe) => recipe.id)).toEqual([id]);
    expect(await app.repos.recipes.getByIds([])).toEqual([]);
  });

  it("the same ingredient in two recipes shares one catalog entry", async () => {
    const a = await app.newRecipe(bookId, {
      ingredients: [{ raw: "2 cloves garlic" }],
    });
    const b = await app.newRecipe(bookId, {
      ingredients: [{ raw: "4 garlic cloves" }],
    });
    const [first, second] = await app.repos.recipes.getByIds([a.id, b.id]);
    expect(first?.ingredients[0]?.ingredientId).toBeTruthy();
    expect(first?.ingredients[0]?.ingredientId).toBe(
      second?.ingredients[0]?.ingredientId,
    );
  });

  it("the database refuses a step timer that isn't a positive number of minutes", async () => {
    const bad = {
      ...record("x", ["1 egg"]),
      steps: [{ text: "Bake.", timerMinutes: 0, section: null }],
    };
    await expect(
      app.repos.recipes.create(bad, bookId, OWNER),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });

  it("an aisle fills a catalog ingredient that has none, and never overwrites one", async () => {
    const line = (raw: string, catalogName: string, aisle: Aisle | null) => ({
      raw,
      ...itemizeLine(raw),
      catalogName,
      aisle,
    });
    const aisles = () =>
      sql<{ name: string; aisle: string | null }>(
        "select name, aisle from ingredients order by name",
      );

    await app.repos.recipes.create(
      { title: "A", ingredients: [line("1 egg", "egg", null)], steps: [] },
      bookId,
      OWNER,
    );
    await app.repos.recipes.create(
      {
        title: "B",
        ingredients: [
          line("2 eggs", "egg", "dairy-and-eggs"),
          line("1 onion", "onion", "produce"),
        ],
        steps: [],
      },
      bookId,
      OWNER,
    );
    expect(await aisles()).toEqual([
      { name: "egg", aisle: "dairy-and-eggs" },
      { name: "onion", aisle: "produce" },
    ]);

    await app.repos.recipes.create(
      {
        title: "C",
        ingredients: [line("1 onion", "onion", "pantry")],
        steps: [],
      },
      bookId,
      OWNER,
    );
    expect(await aisles()).toContainEqual({ name: "onion", aisle: "produce" });
  });

  it("a partial update changes only what's given", async () => {
    const recipe = await app.newRecipe(bookId, {
      description: "Hearty.",
      yieldServings: 4,
    });
    const updated = await app.repos.recipes.update(recipe.id, {
      title: "Renamed",
    });
    expect(updated).toMatchObject({
      title: "Renamed",
      description: "Hearty.",
      yieldServings: 4,
    });
    expect(updated.ingredients).toHaveLength(1);
    expect(updated.updatedAt.getTime()).toBeGreaterThan(
      recipe.updatedAt.getTime(),
    );
  });

  it("deleting a recipe removes its lines, clears plan links, and orphans copies", async () => {
    const original = await app.newRecipe(bookId, { title: "Chili" });
    const planId = await app.newSpace("meal-plan");
    await app.planMeal(planId, MONDAY, { recipeId: original.id });
    const otherBook = await app.newSpace("recipe-book", OWNER, "Other");
    await app.adoptRecipes([original.id], otherBook, OWNER);

    await app.deleteRecipe(original.id, OWNER);

    for (const table of ["recipe_ingredients", "recipe_steps"]) {
      expect(
        await sql(`select 1 from ${table} where recipe_id = $1`, [original.id]),
      ).toEqual([]);
    }
    const [entry] = await app.getWeekPlan(planId, MONDAY, OWNER);
    expect(entry).toMatchObject({ title: "Chili", recipeId: null });
    const [copy] = (await app.getRecipes(otherBook, OWNER)).recipes;
    expect(copy?.copiedFromRecipeId).toBeNull();
  });
});
