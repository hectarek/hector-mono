import { describe, expect, it } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AddPlanToListButton } from "@/app/_components/add-plan-to-list-button";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { focused } from "@/tests/_support/focus";
import { planScreenFixture } from "@/tests/_support/plan-screens";

// Sunday 4 October 2026.
const SUNDAY = "2026-10-04";

// Plan's grocery button (D41, D44): the meals cooking in the range picked.
describe("AddPlanToListButton", () => {
  const box = (cookDays: string[], planId = crypto.randomUUID()) => (
    <AddPlanToListButton planId={planId} today={SUNDAY} cookDays={cookDays} />
  );

  it("counts the meals cooking in the range picked", async () => {
    const user = userEvent.setup();
    // Monday, Friday, and Friday week.
    const view = render(box(["2026-10-05", "2026-10-09", "2026-10-16"]));
    const range = view.getByLabelText("Shopping for");

    view.getByRole("button", { name: "Add 2 meals to the grocery list" });
    await user.selectOptions(range, "next-3-days");
    view.getByRole("button", { name: "Add 1 meal to the grocery list" });
    await user.selectOptions(range, "all-upcoming");
    view.getByRole("button", { name: "Add 3 meals to the grocery list" });
  });

  it("says when there's nothing to add in the range", async () => {
    const user = userEvent.setup();
    const view = render(box(["2026-10-16"]));

    view.getByText("Nothing new to add for the next 7 days.");
    await user.selectOptions(
      view.getByLabelText("Shopping for"),
      "next-3-days",
    );
    view.getByText("Nothing new to add for the next 3 days.");
    await user.selectOptions(
      view.getByLabelText("Shopping for"),
      "all-upcoming",
    );
    view.getByRole("button", { name: "Add 1 meal to the grocery list" });
  });

  // The action's range starts from the server's today, so the meal is planned from it too.
  it("adds the meals, says what it did, and puts the cursor there once the button goes", async () => {
    const user = userEvent.setup();
    const fixture = await planScreenFixture();
    const today = todayIn(PLAN_TIME_ZONE);
    const tomorrow = addDays(today, 1);
    await fixture.planChili({ cookDate: tomorrow, eatDates: [tomorrow] });
    const props = { planId: fixture.planId, today };
    const view = render(
      <AddPlanToListButton {...props} cookDays={[tomorrow]} />,
    );

    await user.click(
      view.getByRole("button", { name: "Add 1 meal to the grocery list" }),
    );
    expect((await view.findByRole("status")).textContent).toBe("1 added.");
    expect(await fixture.groceries()).toEqual(["1 lb ground turkey"]);

    // Plan comes back with nothing left to add.
    view.rerender(<AddPlanToListButton {...props} cookDays={[]} />);
    await waitFor(() => expect(focused()).toBe("1 added."));
    expect(view.getByText("Open list").closest("a")?.getAttribute("href")).toBe(
      `/groceries?plan=${fixture.planId}`,
    );
  });
});
