import "@/tests/_support/dom";
import { beforeEach, describe, expect, it } from "bun:test";
import { render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanEntrySheet } from "@/app/_components/plan-entry-sheet";
import { addPlanEntry } from "@/app/actions/plan";
import { getInjection } from "@/di/container";
import type { PlanEntry } from "@/src/entities/models/plan-entry.model";
import { signInAsNewUser } from "@/tests/_support/next";

// Sunday 4 October 2026.
const TODAY = "2026-10-04";

// The meal's sheet runs against the real actions and the test container's repositories.
describe("PlanEntrySheet", () => {
  let userId: string;

  const meal = async (): Promise<PlanEntry> => {
    const [entry] = await getInjection("IGetWeekPlanController")(
      { spaceId: await planId(), date: TODAY },
      userId,
    );
    if (!entry) throw new Error("No meal planned");
    return entry;
  };
  const planId = async () =>
    (
      await getInjection("IListMySpacesController")(
        { type: "meal-plan" },
        userId,
      )
    )[0]?.id ?? "";

  beforeEach(async () => {
    userId = signInAsNewUser();
    const book = await getInjection("IEnsurePersonalSpaceController")(
      "recipe-book",
      userId,
    );
    const recipe = await getInjection("ICreateRecipeController")(
      {
        spaceId: book.id,
        data: { title: "Chili", ingredients: [{ raw: "1 lb ground turkey" }] },
      },
      userId,
    );
    await addPlanEntry({
      recipeId: recipe.id,
      cookDate: TODAY,
      eatDates: [TODAY, "2026-10-05", "2026-10-06"],
    });
  });

  const sheet = (entry: PlanEntry) => (
    <PlanEntrySheet
      entry={entry}
      date={TODAY}
      today={TODAY}
      open
      onOpenChange={() => {}}
      onRemove={() => {}}
    />
  );
  const eatOn = (view: ReturnType<typeof render>) =>
    within(view.getByRole("group", { name: "Eat on" }));
  const eatDays = (view: ReturnType<typeof render>) =>
    eatOn(view)
      .getAllByRole("button", { pressed: true })
      .map((button) => button.textContent);

  // P14.2: the sheet stays mounted while its meal changes, so Change days must start from
  // the meal as saved, not from the days it was opened with.
  it("starts Change days from the meal's saved days after they change", async () => {
    const user = userEvent.setup();
    const view = render(sheet(await meal()));

    await user.click(view.getByRole("button", { name: "Change days" }));
    await user.click(eatOn(view).getByRole("button", { name: "Tue 6" }));
    await user.click(view.getByRole("button", { name: "Save days" }));
    expect((await meal()).eatDates).toEqual([TODAY, "2026-10-05"]);

    view.rerender(sheet(await meal()));
    await user.click(view.getByRole("button", { name: "Change days" }));
    expect(eatDays(view)).toEqual(["Today", "Mon 5"]);
  });
});
