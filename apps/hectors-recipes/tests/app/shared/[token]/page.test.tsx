import { beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SharedRecipePage from "@/app/shared/[token]/page";
import { getInjection } from "@/di/container";
import {
  NotFoundPage,
  nextState,
  Redirected,
  signInAsNewUser,
} from "@/tests/_support/next";

// D98, D99: a recipe's view-only public link, opened by someone who isn't signed in.
describe("a shared recipe", () => {
  let recipeId: string;
  let token: string;

  beforeEach(async () => {
    const userId = signInAsNewUser();
    const book = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    recipeId = (
      await getInjection("ICreateRecipeController")(
        {
          spaceId: book.id,
          data: {
            title: "Chili",
            yieldServings: 4,
            tags: ["dinner"],
            ingredients: [{ raw: "2 cups beans" }],
            steps: [{ text: "Simmer the beans." }],
          },
        },
        userId,
      )
    ).id;
    token =
      (await getInjection("ISetRecipeLinkController")(
        { recipeId, shared: true },
        userId,
      )) ?? "";
    nextState.userId = undefined;
  });

  const open = async (link = token, servings?: string) =>
    SharedRecipePage({
      params: Promise.resolve({ token: link }),
      searchParams: Promise.resolve({ servings }),
    });

  it("shows the recipe to read and scale, with no action but Create account and Sign in", async () => {
    const user = userEvent.setup();
    const view = render(await open());

    view.getByRole("heading", { level: 1, name: "Chili" });
    view.getByText("Simmer the beans.");
    expect(view.queryByText("dinner")).toBeNull();
    await user.click(view.getByRole("button", { name: "More servings" }));
    await view.findByText("2½ cups beans");

    // Every button there is, by the name a screen reader gives it.
    const buttons = view
      .getAllByRole("button")
      .map(
        (element) => element.getAttribute("aria-label") || element.textContent,
      );
    expect(buttons).toEqual([
      "Fewer servings",
      "More servings",
      "Create account",
      "Sign in",
    ]);
    const back = encodeURIComponent(`/shared/${token}`);
    expect(
      view
        .getByRole("button", { name: "Create account" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe(`/auth/sign-up?redirectTo=${back}`);
  });

  it("sends someone signed in to the recipe's own page, at the servings in the link", async () => {
    nextState.userId = crypto.randomUUID();
    const sent = await open(token, "6").catch((err) => err);
    expect(sent).toBeInstanceOf(Redirected);
    expect((sent as Redirected).url).toBe(`/recipes/${recipeId}?servings=6`);
  });

  it("is Not found once the link is off, or for a link that isn't one", async () => {
    await expect(open("not-a-link")).rejects.toBeInstanceOf(NotFoundPage);
    await expect(open("aaaaaaaaaaaaaaaaaaaaaaaa")).rejects.toBeInstanceOf(
      NotFoundPage,
    );
  });
});
