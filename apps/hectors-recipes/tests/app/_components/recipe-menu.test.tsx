import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecipeMenu } from "@/app/_components/recipe-menu";
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
});
