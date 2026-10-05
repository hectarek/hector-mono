import { beforeEach, describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LibraryPage from "@/app/(main)/(library)/page";
import { getInjection } from "@/di/container";
import { signInAsNewUser } from "@/tests/_support/next";

// The Recipes page as the server renders it, searched as you type (D56).
describe("Recipes", () => {
  beforeEach(async () => {
    const userId = signInAsNewUser();
    const book = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    const recipes = [
      {
        title: "Burrito Bowls",
        tags: ["lunch"],
        ingredients: [{ raw: "1 lb chicken thighs" }, { raw: "1 cup rice" }],
      },
      {
        title: "Chicken and Rice",
        tags: ["dinner"],
        ingredients: [{ raw: "2 chicken breasts" }, { raw: "1 cup rice" }],
      },
      {
        title: "Banana Bread",
        tags: ["dessert", "vegan"],
        ingredients: [{ raw: "3 bananas" }, { raw: "2 cups flour" }],
      },
    ];
    for (const data of recipes) {
      await getInjection("ICreateRecipeController")(
        { spaceId: book.id, data },
        userId,
      );
    }
  });

  const page = async () => LibraryPage({ searchParams: Promise.resolve({}) });

  it("finds recipes by ingredient and tag as you type, title matches first", async () => {
    const user = userEvent.setup();
    const view = render(await page());
    const shown = () =>
      within(view.getByRole("list"))
        .getAllByRole("link")
        .map((card) => card.textContent);
    const search = view.getByRole("searchbox", { name: "Search recipes" });

    await user.type(search, "rice chicken");
    expect(shown()).toEqual([
      expect.stringContaining("Chicken and Rice"),
      expect.stringContaining("Burrito Bowls"),
    ]);

    await user.clear(search);
    await user.type(search, "vegan");
    expect(shown()).toEqual([expect.stringContaining("Banana Bread")]);

    await user.clear(search);
    await user.type(search, "bananas rice");
    view.getByText("No recipes match");
  });
});
