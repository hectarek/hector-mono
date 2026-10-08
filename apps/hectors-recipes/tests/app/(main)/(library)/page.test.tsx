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
        tags: ["lunch", "dinner"],
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
      { title: "Stock", tags: [], ingredients: [{ raw: "8 cups water" }] },
    ];
    for (const data of recipes) {
      await getInjection("ICreateRecipeController")(
        { spaceId: book.id, data },
        userId,
      );
    }
  });

  const page = async () => LibraryPage({ searchParams: Promise.resolve({}) });
  const cards = (list: HTMLElement) =>
    within(list)
      .getAllByRole("link")
      .map((card) => card.textContent);

  // P23.1: the main action says what it adds.
  it("offers Add recipe, which opens the ways to add one", async () => {
    const view = render(await page());
    const add = view.getByRole("button", { name: "Add recipe" });
    expect(add.closest("a")?.getAttribute("href")).toStartWith("/recipes/new");
  });

  it("finds recipes by ingredient and tag as you type, title matches first", async () => {
    const user = userEvent.setup();
    const view = render(await page());
    const shown = () => cards(view.getByRole("list"));
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

  // D57: grouped by meal, a recipe is under each of its meals, those without one under Other.
  it("groups by meal under headings, with search and the address kept", async () => {
    const user = userEvent.setup();
    const view = render(await page());
    const groupBy = view.getByRole("combobox", { name: "Group by" });
    const groups = () =>
      view
        .getAllByRole("region")
        .map((section) => [section.getAttribute("aria-label"), cards(section)]);

    await user.selectOptions(groupBy, "By meal");
    expect(groups()).toEqual([
      ["lunch", [expect.stringContaining("Burrito Bowls")]],
      [
        "dinner",
        [
          expect.stringContaining("Burrito Bowls"),
          expect.stringContaining("Chicken and Rice"),
        ],
      ],
      ["dessert", [expect.stringContaining("Banana Bread")]],
      ["Other", [expect.stringContaining("Stock")]],
    ]);
    expect(window.location.search).toBe("?group=meal");
    // A tag chip keeps the grouping.
    expect(view.getByRole("link", { name: "vegan" }).getAttribute("href")).toBe(
      "/?tag=vegan&group=meal",
    );

    await user.type(
      view.getByRole("searchbox", { name: "Search recipes" }),
      "rice",
    );
    expect(groups()).toEqual([
      ["lunch", [expect.stringContaining("Burrito Bowls")]],
      [
        "dinner",
        [
          expect.stringContaining("Chicken and Rice"),
          expect.stringContaining("Burrito Bowls"),
        ],
      ],
    ]);
    expect(window.location.search).toBe("?q=rice&group=meal");

    await user.selectOptions(groupBy, "Not grouped");
    expect(view.queryAllByRole("region")).toEqual([]);
    expect(cards(view.getByRole("list"))).toHaveLength(2);
    expect(window.location.search).toBe("?q=rice");
  });
});
