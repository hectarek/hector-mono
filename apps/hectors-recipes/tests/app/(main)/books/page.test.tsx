import { beforeEach, describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import BooksPage from "@/app/(main)/books/page";
import { getInjection } from "@/di/container";
import { signInAsNewUser } from "@/tests/_support/next";

// P23.2: each book on Books says how many recipes it holds.
describe("Books", () => {
  beforeEach(async () => {
    const userId = signInAsNewUser();
    const home = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    for (const title of ["Chili", "Tacos"]) {
      await getInjection("ICreateRecipeController")(
        {
          spaceId: home.id,
          data: { title, tags: [], ingredients: [{ raw: "1 onion" }] },
        },
        userId,
      );
    }
    await getInjection("ICreateSpaceController")(
      { type: "recipe-book", name: "Baking" },
      userId,
    );
  });

  it("counts each book's recipes", async () => {
    const view = render(await BooksPage());
    const row = (name: string) =>
      view.getByText(name, { selector: "span" }).closest("li") as HTMLElement;

    within(row("Baking")).getByText("0 recipes");
    expect(view.getAllByText("2 recipes")).toHaveLength(1);
  });
});
