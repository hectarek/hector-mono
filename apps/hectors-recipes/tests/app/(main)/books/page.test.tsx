import { beforeEach, describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import BooksPage from "@/app/(main)/books/page";
import { getInjection } from "@/di/container";
import { nextState, signInAsNewUser } from "@/tests/_support/next";

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

  // P25.1, fix 5: the members page has one name, Members, for owners too.
  it("calls each book's members page Members", async () => {
    const view = render(await BooksPage());
    const members = view.getAllByRole("button", { name: "Members" });
    expect(members).toHaveLength(2);
    expect(view.queryByRole("button", { name: "Share" })).toBe(null);
  });

  // P23.4: a pasted invite link opens its Join page, which asks before joining.
  it("opens a pasted invite link's Join page, and says when it isn't one", async () => {
    const user = userEvent.setup();
    const view = render(await BooksPage());
    const link = view.getByRole("textbox", { name: "Invite link" });
    const join = view.getByRole("button", { name: "Join" });

    await user.type(link, "https://example.test/books");
    await user.click(join);
    view.getByText("That isn't an invite link. Copy the whole link they sent.");
    expect(nextState.pushed).toEqual([]);

    await user.clear(link);
    await user.type(
      link,
      "https://recipes.hectorfgonzalez.com/join/Xk3p_9aQ-2LmZr7tW4yBn1cD",
    );
    await user.click(join);
    expect(nextState.pushed).toEqual(["/join/Xk3p_9aQ-2LmZr7tW4yBn1cD"]);
  });
});
