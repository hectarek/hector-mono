import { expect, it } from "bun:test";
import {
  ingredientInputs,
  rowsFromLines,
  stepInputs,
  stepRowsFrom,
} from "@/src/entities/editor-rows";
import type { RecipeWithIngredients } from "@/src/entities/models/recipe.model";
import { describeEachBackend, makeApp, OWNER } from "@/tests/_support/app";

// Lock-in (P14.12): opening a saved recipe in the editor and saving it without a change gives
// back the same recipe, so editing one thing never quietly changes another.
describeEachBackend("the recipe editor's round trip", () => {
  const saved = (recipe: RecipeWithIngredients) => ({
    ingredients: recipe.ingredients.map(
      ({
        position,
        raw,
        section,
        name,
        quantity,
        unit,
        note,
        optional,
        ingredientId,
      }) => ({
        position,
        raw,
        section,
        name,
        quantity,
        unit,
        note,
        optional,
        ingredientId,
      }),
    ),
    steps: recipe.steps.map(({ position, text, timerMinutes, section }) => ({
      position,
      text,
      timerMinutes,
      section,
    })),
  });

  it("keeps sections (one, none, another), timers, notes, optional lines and catalog links", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const { id } = await app.newRecipe(bookId, {
      ingredients: [
        { name: "pasta", quantity: 1, unit: "lb", section: "Mac" },
        { name: "salt", note: "to taste", optional: true },
        { name: "butter", quantity: 2, unit: "tbsp", section: "Sauce" },
      ],
      steps: [
        { text: "Boil.", timerMinutes: 10, section: "Mac" },
        { text: "Rest.", timerMinutes: null },
        { text: "Melt.", timerMinutes: 2, section: "Sauce" },
      ],
    });
    const before = (await app.getRecipe(id, OWNER)).recipe;
    // Each line is linked to the catalog, so keeping the links is tested, not assumed.
    expect(before.ingredients.every((line) => line.ingredientId !== null)).toBe(
      true,
    );

    const lines = ingredientInputs(rowsFromLines(before.ingredients));
    const steps = stepInputs(stepRowsFrom(before.steps));
    if (lines.problem !== null || steps.problem !== null) {
      throw new Error("The editor found a problem in a saved recipe");
    }
    await app.updateRecipe(
      id,
      { ingredients: lines.lines, steps: steps.steps },
      OWNER,
    );

    const after = (await app.getRecipe(id, OWNER)).recipe;
    expect(saved(after)).toEqual(saved(before));
    expect(after.steps.map((step) => step.section)).toEqual([
      "Mac",
      null,
      "Sauce",
    ]);
  });
});
