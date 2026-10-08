import { beforeEach, describe, expect, it } from "bun:test";
import { render } from "@testing-library/react";
import PlanPage from "@/app/(main)/plan/page";
import { getInjection } from "@/di/container";
import { addDays, PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { planScreenFixture } from "@/tests/_support/plan-screens";

const EMPTY_WEEK =
  "Nothing planned this week. To plan a meal, open a recipe and tap Add to meal plan.";

// The Plan page as the server renders it (D50: the week first).
describe("Plan", () => {
  let fixture: Awaited<ReturnType<typeof planScreenFixture>>;

  beforeEach(async () => {
    fixture = await planScreenFixture();
  });

  const page = async (week?: string, plan?: string) =>
    PlanPage({
      searchParams: Promise.resolve({
        ...(week ? { week } : {}),
        ...(plan ? { plan } : {}),
      }),
    });

  it("shows the week first, with the grocery box under the days and no Plan a meal", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    await fixture.planChili({ cookDate: today, eatDates: [today] });
    const view = render(await page());

    expect(view.queryByRole("button", { name: /Plan a meal/ })).toBe(null);
    const lastDay = view.getAllByRole("heading", { level: 2 }).at(-1);
    const groceryBox = view.getByLabelText("Shopping for");
    expect(
      (lastDay?.compareDocumentPosition(groceryBox) ?? 0) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    view.getByRole("button", { name: "Add 1 meal to groceries" });
    expect(view.queryByText(EMPTY_WEEK)).toBe(null);
  });

  it("says how to plan a meal on a week with nothing planned", async () => {
    const view = render(await page(addDays(todayIn(PLAN_TIME_ZONE), 21)));
    view.getByText(EMPTY_WEEK);
  });

  // P25.1, fix 6: a viewer can't plan, so their empty week says only that it's empty.
  it("tells a viewer the week is empty, without how to plan", async () => {
    const owner = crypto.randomUUID();
    const plan = await getInjection("IEnsurePersonalSpaceController")(
      "meal-plan",
      owner,
    );
    const links = await getInjection("IEnsureInviteLinksController")(
      { spaceId: plan.id },
      owner,
    );
    await getInjection("IAcceptInviteController")(
      { token: links.viewer.token },
      fixture.userId,
    );

    const view = render(await page(undefined, plan.id));
    view.getByText("Nothing planned this week.");
    expect(view.queryByText(EMPTY_WEEK)).toBe(null);
  });
});
