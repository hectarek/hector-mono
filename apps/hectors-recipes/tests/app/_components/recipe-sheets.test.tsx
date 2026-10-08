import { describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddToListButton } from "@/app/_components/add-to-list-button";
import { AddToPlanButton } from "@/app/_components/add-to-plan-button";
import { RecipeServings } from "@/app/_components/recipe-servings";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { planScreenFixture } from "@/tests/_support/plan-screens";

// P25.1, fix 1 (docs/ux-map.md): the recipe page's Add to plan and Add to list are bottom sheets,
// the design system's pattern for adding to the plan, with the main action first.
describe("the recipe page's sheets", () => {
  it("adds to the plan from a sheet, then opens the plan", async () => {
    const fixture = await planScreenFixture();
    const today = todayIn(PLAN_TIME_ZONE);
    const user = userEvent.setup();
    const view = render(
      <AddToPlanButton
        recipeId={fixture.recipeId}
        title="Chili"
        today={today}
        plans={[{ id: fixture.planId, name: "My Plan" }]}
      />,
    );

    await user.click(view.getByRole("button", { name: "Add to meal plan" }));
    const sheet = within(
      view.getByRole("dialog", { name: "Add to meal plan" }),
    );
    const actions = sheet
      .getAllByRole("button")
      .filter((button) => ["Add", "Cancel"].includes(button.textContent ?? ""));
    expect(actions.map((button) => button.textContent)).toEqual([
      "Add",
      "Cancel",
    ]);

    await user.click(sheet.getByRole("button", { name: "Add" }));
    expect(await sheet.findByText(/^Planned: /)).toBeTruthy();
    expect(
      sheet.getByRole("button", { name: "Open meal plan" }).closest("a")?.href,
    ).toContain(`/plan?week=${today}&plan=${fixture.planId}`);
    expect((await fixture.meals(today)).map((meal) => meal.title)).toEqual([
      "Chili",
    ]);
  });

  it("adds the ingredients to the list from a sheet", async () => {
    const fixture = await planScreenFixture();
    const user = userEvent.setup();
    const view = render(
      <RecipeServings yieldServings={null}>
        <AddToListButton
          recipeId={fixture.recipeId}
          title="Chili"
          yieldServings={null}
          plans={[{ id: fixture.planId, name: "My Plan" }]}
        />
      </RecipeServings>,
    );

    await user.click(view.getByRole("button", { name: "Add to groceries" }));
    const sheet = within(
      view.getByRole("dialog", { name: "Add to groceries" }),
    );
    await user.click(sheet.getByRole("button", { name: "Add" }));
    expect(await sheet.findByText("1 added.")).toBeTruthy();
    expect(await fixture.groceries()).toEqual(["1 lb ground turkey"]);
  });
});
