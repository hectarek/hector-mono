import { beforeEach, describe, expect, it } from "bun:test";
import { loadNewRecipe } from "@/app/_lib/new-recipe";
import { getInjection } from "@/di/container";
import { signInAsNewUser } from "@/tests/_support/next";

// P24.4, D78: the form's tag chips start from the catalog, so a new account has some to pick.
describe("loadNewRecipe's tags", () => {
  let userId: string;

  beforeEach(() => {
    userId = signInAsNewUser();
  });

  it("offers a new account the catalog's tags, in their groups", async () => {
    const { form } = await loadNewRecipe(undefined);
    expect(form.suggestedTags).toContain("breakfast");
    expect(form.suggestedTags).toContain("meal prep");
    expect(form.suggestedTags).toContain("vegan");
    expect(form.tagGroups["meal prep"]).toBe("meal");
  });

  it("puts their own tags first, and each tag once", async () => {
    const book = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    await getInjection("ICreateRecipeController")(
      {
        spaceId: book.id,
        data: {
          title: "Chili",
          tags: ["weeknight", "dinner"],
          ingredients: [{ raw: "1 onion" }],
        },
      },
      userId,
    );

    const { form } = await loadNewRecipe(undefined);
    expect(form.suggestedTags.slice(0, 2)).toEqual(["dinner", "weeknight"]);
    expect(form.suggestedTags.filter((tag) => tag === "dinner")).toHaveLength(
      1,
    );
  });
});
