import { beforeEach, describe, expect, it } from "bun:test";
import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import PlanPage from "@/app/(main)/plan/page";
import { getInjection } from "@/di/container";
import {
  addDays,
  mondayOf,
  PLAN_TIME_ZONE,
  todayIn,
} from "@/src/entities/week";
import { planScreenFixture } from "@/tests/_support/plan-screens";

const EMPTY_WEEK =
  "Nothing planned this week. To plan a meal, open a recipe and tap Add to meal plan.";

// The Plan page as the server renders it (D50: the week first).
describe("Plan", () => {
  let fixture: Awaited<ReturnType<typeof planScreenFixture>>;

  beforeEach(async () => {
    fixture = await planScreenFixture();
  });

  const page = async (week?: string, plan?: string, show?: string) =>
    PlanPage({
      searchParams: Promise.resolve({
        ...(week ? { week } : {}),
        ...(plan ? { plan } : {}),
        ...(show ? { show } : {}),
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

  // D92: Today sits in the week's row, only off the current week, so the days don't move.
  it("offers Today beside the week's dates, only on another week", async () => {
    const today = todayIn(PLAN_TIME_ZONE);
    const week = (view: ReturnType<typeof render>) =>
      within(view.getByRole("navigation", { name: "Week" }));

    const thisWeek = render(await page());
    week(thisWeek).getByText("This week");
    expect(week(thisWeek).queryByRole("button", { name: "Today" })).toBe(null);
    thisWeek.unmount();

    const later = render(await page(addDays(today, 21), fixture.planId));
    const goToday = week(later).getByRole("button", { name: "Today" });
    expect(goToday.closest("a")?.getAttribute("href")).toBe(
      `/plan?week=${today}&plan=${fixture.planId}`,
    );
    expect(week(later).queryByText("This week")).toBe(null);
    expect(later.queryByRole("button", { name: /this week/i })).toBe(null);
  });

  // D93: a Monday cook eaten Tuesday and Wednesday is on three days, or only its cook day, or
  // only the days it's eaten; the choice goes in the address and with the week's links.
  it("shows the cook days or the eat days, and keeps the choice", async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, "", "/plan");
    const monday = mondayOf(addDays(todayIn(PLAN_TIME_ZONE), 14));
    await fixture.planChili({
      cookDate: monday,
      eatDates: [addDays(monday, 1), addDays(monday, 2)],
    });
    const other = await getInjection("ICreateSpaceController")(
      { type: "meal-plan", name: "Other" },
      fixture.userId,
    );
    const view = render(await page(monday));
    // The days Chili shows on.
    const shown = () =>
      view.getAllByRole("heading", { level: 2 }).flatMap((heading) => {
        const day = heading.closest("li");
        return day && within(day).queryByRole("link", { name: "Chili" })
          ? [heading.querySelector("span")?.textContent]
          : [];
      });
    const show = view.getByRole("combobox", { name: "Show" });
    const next = () =>
      view
        .getByRole("button", { name: "Next week" })
        .closest("a")
        ?.getAttribute("href");

    expect(shown()).toEqual(["Mon", "Tue", "Wed"]);
    await user.selectOptions(show, "Cook days");
    expect(shown()).toEqual(["Mon"]);
    expect(window.location.search).toBe("?show=cook");
    await user.selectOptions(show, "Eat days");
    expect(shown()).toEqual(["Tue", "Wed"]);
    expect(window.location.search).toBe("?show=eat");
    expect(next()).toBe(`/plan?week=${addDays(monday, 7)}&show=eat`);
    expect(
      view
        .getByRole("navigation", { name: "Meal plans" })
        .querySelector(`a[href*="${other.id}"]`)
        ?.getAttribute("href"),
    ).toBe(`/plan?plan=${other.id}&week=${monday}&show=eat`);
    await user.selectOptions(show, "All meals");
    expect(shown()).toEqual(["Mon", "Tue", "Wed"]);
    expect(window.location.search).toBe("");
    view.unmount();

    // Opened from a link that carries it.
    const opened = render(await page(monday, undefined, "cook"));
    expect(
      (opened.getByRole("combobox", { name: "Show" }) as HTMLSelectElement)
        .value,
    ).toBe("cook");
    expect(opened.getAllByRole("link", { name: "Chili" })).toHaveLength(1);
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

    const user = userEvent.setup();
    await user.click(view.getByRole("button", { name: /^More for / }));
    await view.findByRole("button", { name: "Members" });
    expect(view.queryByRole("button", { name: "Clear meal plan" })).toBe(null);
  });

  // D91: starting the plan over, from the ⋯ sheet: every week's meals go, groceries stay.
  it("clears the meal plan from the ⋯ sheet, after asking", async () => {
    const user = userEvent.setup();
    const today = todayIn(PLAN_TIME_ZONE);
    await fixture.planChili({ cookDate: today, eatDates: [today] });
    const later = addDays(today, 28);
    await fixture.planChili({ cookDate: later, eatDates: [later] });
    await getInjection("IAddGroceryItemController")(
      { spaceId: fixture.planId, text: "Milk" },
      fixture.userId,
    );
    const view = render(await page());
    const question = () =>
      view.getByRole("group", { name: "Clear the meal plan?" });

    await user.click(view.getByRole("button", { name: /^More for / }));
    await user.click(
      await view.findByRole("button", { name: "Clear meal plan" }),
    );
    within(question()).getByText(/every meal, in every week/);
    await user.click(
      within(question()).getByRole("button", { name: "Cancel" }),
    );
    expect(await fixture.meals(today)).toHaveLength(1);

    await user.click(view.getByRole("button", { name: "Clear meal plan" }));
    await user.click(
      within(question()).getByRole("button", { name: "Clear meal plan" }),
    );
    await waitFor(async () => expect(await fixture.meals(today)).toEqual([]));
    expect(await fixture.meals(later)).toEqual([]);
    expect(await fixture.groceries()).toEqual(["Milk"]);
    view.rerender(await page());
    await view.findByText("Meal plan cleared.");
  });
});
