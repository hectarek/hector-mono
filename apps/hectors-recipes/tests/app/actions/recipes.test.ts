import { beforeEach, describe, expect, it } from "bun:test";
import {
  createRecipe,
  deleteRecipe,
  updateRecipe,
} from "@/app/actions/recipes";
import { getInjection } from "@/di/container";
import { form } from "@/tests/_support/form";
import {
  nextState,
  Redirected,
  resetNextState,
  USER_ID,
} from "@/tests/_support/next";

const loadRecipe = async (id: string) =>
  (await getInjection("IGetRecipeController")({ recipeId: id }, USER_ID))
    .recipe;

// The editor's rows, as the form sends them.
const rows = (items: unknown[]) => JSON.stringify(items);

// Saves through the action and returns the new recipe's id (from the redirect).
async function create(fields: Record<string, string>): Promise<string> {
  const redirect = await createRecipe(null, form(fields)).catch((err) => err);
  expect(redirect).toBeInstanceOf(Redirected);
  return (redirect as Redirected).url.replace("/recipes/", "");
}

describe("recipe actions", () => {
  let bookId: string;

  beforeEach(async () => {
    resetNextState();
    bookId = (
      await getInjection("IEnsurePersonalSpaceController")(
        "recipe-book",
        USER_ID,
      )
    ).id;
  });

  it("creates a recipe from the form and opens it", async () => {
    const id = await create({
      spaceId: bookId,
      title: " Chili ",
      ingredients: rows([
        { raw: "1 lb beans", name: "beans", quantity: 1, unit: "lb" },
        { name: "sour cream", section: "To serve", optional: true },
      ]),
      steps: rows([{ text: "Cook.", timerMinutes: 30 }]),
      yieldServings: "4",
      timeMinutes: "",
      tags: "Dinner, quick,, ",
      sourceUrl: "",
    });

    const recipe = await loadRecipe(id);
    expect(recipe).toMatchObject({
      title: "Chili",
      yieldServings: 4,
      timeMinutes: null,
      tags: ["dinner", "quick"],
      sourceUrl: null,
    });
    expect(recipe.ingredients.map((line) => [line.raw, line.section])).toEqual([
      ["1 lb beans", null],
      ["sour cream (optional)", "To serve"],
    ]);
    expect(recipe.steps.map((step) => [step.text, step.timerMinutes])).toEqual([
      ["Cook.", 30],
    ]);
    expect(nextState.revalidated).toContain("/");
  });

  // `fields` puts each message under the field it's about; `error` is the one-line summary.
  it("explains what's wrong, field by field, instead of saving", async () => {
    const base = {
      spaceId: bookId,
      title: "x",
      ingredients: rows([{ name: "egg", quantity: 1 }]),
    };
    expect(await createRecipe(null, form({ ...base, title: " " }))).toEqual({
      error: "Title is required",
      fields: { title: "Title is required" },
    });
    expect(
      await createRecipe(null, form({ ...base, ingredients: "[]" })),
    ).toEqual({
      error: "Add at least one ingredient",
      fields: { ingredients: "Add at least one ingredient" },
    });
    expect(
      await createRecipe(null, form({ ...base, steps: "not json" })),
    ).toEqual({
      error: "Method: Couldn't read these rows. Try again.",
      fields: { steps: "Couldn't read these rows. Try again." },
    });
    expect(
      await createRecipe(null, form({ ...base, yieldServings: "0" })),
    ).toEqual({
      error: "Servings must be a whole number of at least 1",
      fields: {
        yieldServings: "Servings must be a whole number of at least 1",
      },
    });
    const badLink = await createRecipe(
      null,
      form({ ...base, sourceUrl: "nytimes" }),
    );
    expect(badLink?.error).toStartWith("Source link: ");
    expect(badLink?.fields?.sourceUrl).toBeString();
  });

  it("an edit replaces every field, so blanks clear values", async () => {
    const id = await create({
      spaceId: bookId,
      title: "Chili",
      ingredients: rows([{ raw: "1 lb beans" }]),
      yieldServings: "4",
      tags: "dinner",
    });

    await updateRecipe(
      null,
      form({
        recipeId: id,
        title: "Chili",
        ingredients: rows([{ name: "beans", quantity: 2, unit: "lb" }]),
        yieldServings: "",
        tags: "",
      }),
    ).catch((err) => expect(err).toBeInstanceOf(Redirected));

    expect(await loadRecipe(id)).toMatchObject({
      yieldServings: null,
      tags: [],
    });
    expect(nextState.revalidated).toContain(`/recipes/${id}`);
  });

  it("deleting goes back to the recipe's book; signed-out users are told to sign in", async () => {
    const id = await create({
      spaceId: bookId,
      title: "x",
      ingredients: rows([{ raw: "1 egg" }]),
    });

    nextState.userId = undefined;
    expect(await deleteRecipe(null, form({ recipeId: id }))).toEqual({
      error: "Your session expired. Sign in again.",
    });

    resetNextState();
    const redirect = await deleteRecipe(null, form({ recipeId: id })).catch(
      (err) => err,
    );
    expect((redirect as Redirected).url).toBe(`/?book=${bookId}`);
  });
});
