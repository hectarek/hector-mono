import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RecipeForm } from "@/app/_components/recipe-form";
import { getInjection } from "@/di/container";
import type { TagGroups } from "@/src/entities/models/tag.model";
import { focused } from "@/tests/_support/focus";
import { signInAsNewUser } from "@/tests/_support/next";

// The new-recipe form (Add manually), with the real actions behind it.
describe("RecipeForm", () => {
  let bookId: string;

  beforeEach(async () => {
    const userId = signInAsNewUser();
    bookId = (
      await getInjection("IEnsurePersonalSpaceController")(
        "recipe-book",
        userId,
      )
    ).id;
  });

  const newRecipe = ({
    suggestedTags = [],
    tagGroups = {},
  }: {
    suggestedTags?: string[];
    tagGroups?: TagGroups;
  } = {}) =>
    render(
      <RecipeForm
        mode="create"
        heading="New recipe"
        suggestedTags={suggestedTags}
        tagGroups={tagGroups}
        spaceId={bookId}
        books={[{ id: bookId, name: "Soups" }]}
        cancelHref="/"
      />,
    );
  // A pasted block, as the browser hands it to the field.
  const paste = (field: HTMLElement, text: string) =>
    fireEvent.paste(field, { clipboardData: { getData: () => text } });
  // The ingredient rows top to bottom: a section's name as "# Name", a line by its name.
  const ingredientRows = (view: ReturnType<typeof render>) =>
    view
      .getAllByRole("textbox", { name: /^(Section \d+ name|Ingredient \d+)$/ })
      .map((field) => {
        const value = (field as HTMLInputElement).value;
        return field.getAttribute("aria-label")?.startsWith("Section")
          ? `# ${value}`
          : value;
      });

  // P14.7: Save is the form's submit button, so Return in a one-line field would save a
  // recipe mid-edit. Its default is stopped; a step's Return is a new line, and the Return
  // that confirms an IME's text is left alone.
  it("keeps Return in a one-line field from sending the form", () => {
    const view = newRecipe();
    const title = view.getByRole("textbox", { name: "Title" });

    expect(fireEvent.keyDown(title, { key: "Enter" })).toBe(false);
    expect(fireEvent.keyDown(title, { key: "Enter", keyCode: 229 })).toBe(true);
    expect(
      fireEvent.keyDown(view.getByRole("textbox", { name: "Step 1" }), {
        key: "Enter",
      }),
    ).toBe(true);
  });

  it("adds a New tag on Return, and puts the cursor back on New tag", async () => {
    const user = userEvent.setup();
    const view = newRecipe();

    await user.click(view.getByRole("button", { name: "New tag" }));
    await user.keyboard("weeknight{Enter}");
    expect(
      view
        .getByRole("button", { name: "weeknight" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(focused()).toBe("New tag");
  });

  // D55: the chips sit under their groups, and a tag made here goes under the group picked.
  // Saving it with the recipe is in the action's test and the browser flow: a save redirects,
  // which a screen test can't follow.
  it("shows the tags under their groups, and a new tag under the group picked for it", async () => {
    const user = userEvent.setup();
    const view = newRecipe({
      suggestedTags: ["dinner", "quick", "italian"],
      tagGroups: { dinner: "meal", italian: "cuisine" },
    });
    const chips = (group: string) =>
      within(view.getByRole("group", { name: group }))
        .getAllByRole("button")
        .map((chip) => chip.textContent);
    expect(chips("Meal")).toEqual(["dinner"]);
    expect(chips("Cuisine")).toEqual(["italian"]);
    expect(chips("Other")).toEqual(["quick"]);

    await user.click(view.getByRole("button", { name: "New tag" }));
    await user.keyboard("Brunch");
    await user.selectOptions(
      view.getByRole("combobox", { name: "New tag's group" }),
      "Meal",
    );
    await user.click(view.getByRole("button", { name: "Add" }));
    expect(chips("Meal")).toEqual(["dinner", "brunch"]);
    expect(focused()).toBe("New tag");

    // With no group picked, it's under Other.
    await user.click(view.getByRole("button", { name: "New tag" }));
    await user.keyboard("sheet pan{Enter}");
    expect(chips("Other")).toEqual(["quick", "sheet pan"]);
  });

  // P14.7: a paste that brings its own sections puts the rows after it back in theirs.
  it("splits a pasted list into rows, keeping the rows after it in their section", () => {
    const view = newRecipe();
    paste(
      view.getByRole("textbox", { name: "Ingredient 1" }),
      "Pasta:\n1 lb pasta\n2 tbsp olive oil",
    );
    paste(
      view.getByRole("textbox", { name: "Ingredient 1" }),
      "Sauce:\n2 tbsp butter\n1 cup milk",
    );

    expect(ingredientRows(view)).toEqual([
      "# Pasta",
      "pasta",
      "# Sauce",
      "butter",
      "milk",
      "# Pasta",
      "olive oil",
    ]);
    // Each section's lines are a list of their own, so a screen reader counts only lines
    // (then the method's one step).
    expect(
      view
        .getAllByRole("list")
        .map((list) => within(list).getAllByRole("listitem").length),
    ).toEqual([1, 2, 1, 1]);
  });

  // P14.7: a named section with nothing under it would vanish on save.
  it("stops Save at a named section with nothing under it", async () => {
    const user = userEvent.setup();
    const view = newRecipe();
    await user.type(view.getByRole("textbox", { name: "Title" }), "Pasta");
    paste(
      view.getByRole("textbox", { name: "Ingredient 1" }),
      "Pasta:\n1 lb pasta",
    );
    await user.click(
      view.getAllByRole("button", { name: "Add section" })[0] as HTMLElement,
    );
    await user.keyboard("Sauce");

    await user.click(view.getByRole("button", { name: "Save" }));
    await view.findByText(
      'Section "Sauce" has no ingredients under it. Add one, or remove it.',
    );
    expect(focused()).toBe("Section 2 name");
  });

  // P14.11 and the review: Remove takes the row's ⋯ with it, so the cursor goes to the ⋯ of
  // the row before, not to a text field (which would bring up the phone's keyboard).
  it("puts the cursor on the row before's ⋯ after Remove", async () => {
    const user = userEvent.setup();
    const view = newRecipe();
    paste(
      view.getByRole("textbox", { name: "Ingredient 1" }),
      "1 lb pasta\n2 tbsp butter",
    );

    await user.click(
      view.getByRole("button", {
        name: "Note, optional, move or remove ingredient 2",
      }),
    );
    await user.click(await view.findByRole("button", { name: "Remove" }));
    await waitFor(() =>
      expect(focused()).toBe("Note, optional, move or remove ingredient 1"),
    );
    expect(ingredientRows(view)).toEqual(["pasta"]);
  });
});
