import { makeApp, OWNER, type Repositories } from "@/tests/_support/app";

// A plan (whose grocery list the tests fill) plus two recipes that share garlic (in different
// spellings) and salt, which is what the merge rules need to show anything interesting.
export async function groceryFixture(repos?: Repositories) {
  const app = makeApp(repos);
  const planId = await app.newSpace("meal-plan", OWNER, "My Plan");
  const bookId = await app.newSpace("recipe-book");
  const chiliId = (
    await app.newRecipe(bookId, {
      title: "Chili",
      yieldServings: 4,
      ingredients: [
        { raw: "2 cloves garlic, minced" },
        { raw: "1 lb ground turkey" },
        { raw: "Salt, to taste" },
      ],
    })
  ).id;
  const tacosId = (
    await app.newRecipe(bookId, {
      title: "Tacos",
      ingredients: [{ raw: "4 garlic cloves" }, { raw: "Salt, to taste" }],
    })
  ).id;

  return {
    app,
    planId,
    bookId,
    chiliId,
    tacosId,
    // The list as [text, "from" note] pairs, in list order.
    texts: async () =>
      (await app.getGroceryList(planId, OWNER)).map((item) => [
        item.text,
        item.sourceNote,
      ]),
  };
}

export type GroceryFixture = Awaited<ReturnType<typeof groceryFixture>>;
