import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity } from "react";
import { RecipeMenu } from "@/app/_components/recipe-menu";
import { getInjection } from "@/di/container";
import { signInAsNewUser } from "@/tests/_support/next";

// P23.5, D72: a recipe's ⋯ holds what isn't cooking, planning or shopping for it.
describe("RecipeMenu", () => {
  let shared: { title?: string; url?: string }[];

  beforeEach(() => {
    signInAsNewUser();
    shared = [];
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: { title?: string; url?: string }) => {
        shared.push(data);
      },
    });
  });

  afterEach(() => {
    Reflect.deleteProperty(navigator, "share");
  });

  const open = async (
    props: Partial<Parameters<typeof RecipeMenu>[0]> = {},
  ) => {
    const user = userEvent.setup();
    const view = render(
      <RecipeMenu
        recipeId="recipe-1"
        title="Chili"
        canEdit={false}
        shareToken={null}
        copyTargets={[]}
        {...props}
      />,
    );
    await user.click(view.getByRole("button", { name: "More for Chili" }));
    await view.findByRole("button", { name: "Share recipe" });
    return { user, view };
  };

  it("lets anyone share the recipe's link", async () => {
    const { user, view } = await open();
    expect(view.queryByRole("button", { name: "Edit" })).toBe(null);
    expect(view.queryByRole("button", { name: "Copy to another book" })).toBe(
      null,
    );
    expect(view.queryByRole("button", { name: "View-only link" })).toBe(null);

    await user.click(view.getByRole("button", { name: "Share recipe" }));
    expect(shared).toEqual([
      { title: "Chili", url: "http://localhost:3000/recipes/recipe-1" },
    ]);
  });

  it("gives editors Edit, and Copy to another book its own step", async () => {
    const { user, view } = await open({
      canEdit: true,
      copyTargets: [{ id: "book-2", name: "Baking" }],
    });
    expect(
      view
        .getByRole("button", { name: "Edit" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/recipes/recipe-1/edit");

    await user.click(
      view.getByRole("button", { name: "Copy to another book" }),
    );
    await view.findByRole("option", { name: "Baking" });
    view.getByRole("button", { name: "Copy" });

    await user.click(view.getByRole("button", { name: "Back" }));
    await view.findByRole("button", { name: "Share recipe" });
  });

  // D98: editors turn on a link for people without an account, share it, and turn it off,
  // which asks first in the sheet. The page comes back with the link after each change,
  // which a rerender stands in for.
  it("gives editors a view-only link to turn on, share and turn off", async () => {
    const userId = signInAsNewUser();
    const book = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    const { id } = await getInjection("ICreateRecipeController")(
      {
        spaceId: book.id,
        data: { title: "Chili", tags: [], ingredients: [{ raw: "beans" }] },
      },
      userId,
    );
    const linkNow = async () =>
      (await getInjection("IGetRecipeController")({ recipeId: id }, userId))
        .shareToken;
    const menu = (shareToken: string | null) => (
      <RecipeMenu
        recipeId={id}
        title="Chili"
        canEdit
        shareToken={shareToken}
        copyTargets={[]}
      />
    );
    const { user, view } = await open({ recipeId: id, canEdit: true });

    await user.click(view.getByRole("button", { name: "View-only link" }));
    view.getByText(/Make a link anyone can open without an account/);
    await user.click(
      view.getByRole("button", { name: "Turn on view-only link" }),
    );
    await waitFor(async () => expect(await linkNow()).not.toBeNull());
    const token = await linkNow();

    view.rerender(menu(token));
    await user.click(
      await view.findByRole("button", { name: "Share view-only link" }),
    );
    expect(shared).toEqual([
      { title: "Chili", url: `http://localhost:3000/shared/${token}` },
    ]);

    await user.click(view.getByRole("button", { name: "Turn off link" }));
    view.getByRole("group", { name: "Turn off the view-only link?" });
    await user.click(view.getByRole("button", { name: "Turn off" }));
    await waitFor(async () => expect(await linkNow()).toBeNull());
  });

  // D88: Next.js keeps the page you leave alive but hidden, so its ⋯ must not still be open
  // when you come back to it.
  it("is closed when you come back to the page", async () => {
    const user = userEvent.setup();
    const page = (mode: "visible" | "hidden") => (
      <Activity mode={mode}>
        <RecipeMenu
          recipeId="recipe-1"
          title="Chili"
          canEdit={false}
          shareToken={null}
          copyTargets={[]}
        />
      </Activity>
    );
    const view = render(page("visible"));
    await user.click(view.getByRole("button", { name: "More for Chili" }));
    await view.findByRole("button", { name: "Share recipe" });

    view.rerender(page("hidden"));
    view.rerender(page("visible"));
    await waitFor(() =>
      expect(view.queryByRole("button", { name: "Share recipe" })).toBe(null),
    );
  });
});
