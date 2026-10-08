import { beforeEach, describe, expect, it } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BookmarkButton } from "@/app/_components/bookmark-button";
import { getInjection } from "@/di/container";
import { signInAsNewUser } from "@/tests/_support/next";

// P24.1, D77: the bookmark beside a recipe's name saves it for this person.
describe("BookmarkButton", () => {
  let userId: string;
  let recipeId: string;

  beforeEach(async () => {
    userId = signInAsNewUser();
    const book = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    recipeId = (
      await getInjection("ICreateRecipeController")(
        {
          spaceId: book.id,
          data: { title: "Chili", tags: [], ingredients: [{ raw: "1 onion" }] },
        },
        userId,
      )
    ).id;
  });

  const saved = () => getInjection("IGetBookmarksController")(userId);

  it("saves the recipe, and unsaves it", async () => {
    const user = userEvent.setup();
    const view = render(<BookmarkButton recipeId={recipeId} saved={false} />);
    const button = view.getByRole("button", { name: "Save recipe" });
    expect(button.getAttribute("aria-pressed")).toBe("false");

    await user.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("true");
    await waitFor(async () => expect(await saved()).toEqual([recipeId]));

    await user.click(button);
    expect(button.getAttribute("aria-pressed")).toBe("false");
    await waitFor(async () => expect(await saved()).toEqual([]));
  });
});
