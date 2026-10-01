import { expect, it } from "bun:test";
import { describeEachBackend, makeApp, OWNER } from "@/tests/_support/app";

describeEachBackend("updateRecipe", () => {
  it("new steps replace the steps; other edits leave them alone", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const created = await app.newRecipe(bookId, {
      steps: [{ text: "Chop." }, { text: "Fry." }, { text: "Serve." }],
    });
    const steps = async () =>
      (await app.getRecipe(created.id, OWNER)).recipe.steps.map(
        (step) => step.text,
      );

    await app.updateRecipe(created.id, { title: "Renamed" }, OWNER);
    expect(await steps()).toEqual(["Chop.", "Fry.", "Serve."]);

    await app.updateRecipe(
      created.id,
      { steps: [{ text: "Roast it.", timerMinutes: 40 }] },
      OWNER,
    );
    expect(await steps()).toEqual(["Roast it."]);
  });

  it("keeps an untouched row's line and catalog link, and rewrites a changed row", async () => {
    const app = makeApp();
    const bookId = await app.newSpace("recipe-book");
    const created = await app.newRecipe(bookId);
    // As the re-read stored it: "fresh parsley" is bought as parsley.
    await app.repos.recipes.update(created.id, {
      ingredients: [
        {
          raw: "2 tbsp chopped fresh parsley",
          quantity: 2,
          unit: "tbsp",
          name: "fresh parsley",
          note: "chopped",
          optional: false,
          catalogName: "parsley",
        },
        {
          raw: "1 lb beans",
          quantity: 1,
          unit: "lb",
          name: "beans",
          note: null,
          optional: false,
          catalogName: "bean",
        },
      ],
    });
    const before = (await app.getRecipe(created.id, OWNER)).recipe.ingredients;

    await app.updateRecipe(
      created.id,
      {
        ingredients: [
          // Untouched: the editor sends its original line back.
          {
            raw: "2 tbsp chopped fresh parsley",
            name: "fresh parsley",
            quantity: 2,
            unit: "tbsp",
            note: "chopped",
          },
          // Changed: no original line, so it's written out from the fields.
          { name: "black beans", quantity: 2, unit: "can", note: "drained" },
        ],
        steps: [{ text: "Simmer.", timerMinutes: 20 }],
      },
      OWNER,
    );

    const { recipe } = await app.getRecipe(created.id, OWNER);
    const [parsley, beans] = recipe.ingredients;
    expect(parsley).toMatchObject({
      raw: "2 tbsp chopped fresh parsley",
      ingredientId: before[0]?.ingredientId,
    });
    expect(beans).toMatchObject({
      raw: "2 cans black beans, drained",
      name: "black beans",
    });
    expect(beans?.ingredientId).not.toBe(before[1]?.ingredientId);
    expect(
      recipe.steps.map(({ text, timerMinutes }) => [text, timerMinutes]),
    ).toEqual([["Simmer.", 20]]);
  });
});
