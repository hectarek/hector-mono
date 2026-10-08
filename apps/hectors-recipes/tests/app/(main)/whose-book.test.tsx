import { beforeEach, describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import LibraryPage from "@/app/(main)/(library)/page";
import RecipePage from "@/app/(main)/recipes/[id]/page";
import { getInjection } from "@/di/container";
import { signInAsNewUser } from "@/tests/_support/next";

// P26.2, D82: whose book is whose. A tester's own book and the one shared with him had the
// same name, so the pills put your own first and mark the shared ones, and a recipe's way
// back names its book.
describe("whose book", () => {
  let userId: string;
  let sharedRecipe: string;
  let sharedBook: string;

  beforeEach(async () => {
    userId = signInAsNewUser();
    const own = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    await getInjection("ICreateRecipeController")(
      {
        spaceId: own.id,
        data: { title: "Stock", tags: [], ingredients: [{ raw: "water" }] },
      },
      userId,
    );

    const partner = crypto.randomUUID();
    sharedBook = (
      await getInjection("ICreateSpaceController")(
        { type: "recipe-book", name: "Hector's Recipes" },
        partner,
      )
    ).id;
    sharedRecipe = (
      await getInjection("ICreateRecipeController")(
        {
          spaceId: sharedBook,
          data: { title: "Chili", tags: [], ingredients: [{ raw: "onion" }] },
        },
        partner,
      )
    ).id;
    const links = await getInjection("IEnsureInviteLinksController")(
      { spaceId: sharedBook },
      partner,
    );
    await getInjection("IAcceptInviteController")(
      { token: links.editor.token },
      userId,
    );
  });

  it("puts your own book first in the pills, and marks the one shared with you", async () => {
    const view = render(
      await LibraryPage({ searchParams: Promise.resolve({}) }),
    );
    const pills = within(
      view.getByRole("navigation", { name: "Recipe books" }),
    ).getAllByRole("link");
    expect(pills.map((pill) => pill.textContent)).toEqual([
      "All recipes",
      "My Recipes",
      "Hector's Recipes, shared with you",
    ]);
    expect(pills[1]?.querySelector("svg")).toBe(null);
    expect(pills[2]?.querySelector("svg")).not.toBe(null);
  });

  it("names the recipe's book on its way back, in two or more books", async () => {
    const view = render(
      await RecipePage({
        params: Promise.resolve({ id: sharedRecipe }),
        searchParams: Promise.resolve({}),
      }),
    );
    const back = view.getByRole("button", { name: "Hector's Recipes" });
    expect(back.closest("a")?.getAttribute("href")).toBe(
      `/?book=${sharedBook}`,
    );
  });

  it("says Recipes on the way back with one book", async () => {
    const loner = signInAsNewUser();
    const book = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      loner,
    );
    const recipe = await getInjection("ICreateRecipeController")(
      {
        spaceId: book.id,
        data: { title: "Toast", tags: [], ingredients: [{ raw: "bread" }] },
      },
      loner,
    );
    const view = render(
      await RecipePage({
        params: Promise.resolve({ id: recipe.id }),
        searchParams: Promise.resolve({}),
      }),
    );
    view.getByRole("button", { name: "Recipes" });
  });
});
