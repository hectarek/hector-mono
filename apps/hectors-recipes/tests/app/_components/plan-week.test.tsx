import { beforeEach, describe, expect, it } from "bun:test";
import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlanWeek } from "@/app/_components/plan-week";
import type { PlanEntry } from "@/src/entities/models/plan-entry.model";
import { formatDay, mondayOf, weekDates } from "@/src/entities/week";
import { planScreenFixture } from "@/tests/_support/plan-screens";

// Sunday 4 October 2026, the last day of its week.
const TODAY = "2026-10-04";
const SATURDAY = "2026-10-03";

// The week as Plan shows it (D38, D39): a meal on its cook day has the check; on a day it's
// only eaten, it says when it was cooked and has none.
describe("PlanWeek", () => {
  let fixture: Awaited<ReturnType<typeof planScreenFixture>>;

  beforeEach(async () => {
    fixture = await planScreenFixture();
  });

  const week = (entries: PlanEntry[]) => (
    <PlanWeek
      today={TODAY}
      canEdit
      entries={entries}
      days={weekDates(mondayOf(TODAY)).map((date) => ({
        date,
        ...formatDay(date),
        isToday: date === TODAY,
        isPast: date < TODAY,
      }))}
    />
  );
  // One day of the week, found by its heading as a person reads it.
  const day = (view: ReturnType<typeof render>, heading: RegExp) => {
    const row = view.getByRole("heading", { name: heading }).closest("li");
    if (!row) throw new Error(`No day ${heading}`);
    return within(row);
  };

  it("shows a meal with the check on its cook day and as leftovers after", async () => {
    await fixture.planChili({
      cookDate: SATURDAY,
      eatDates: [SATURDAY, TODAY],
    });
    const view = render(week(await fixture.meals(TODAY)));

    const saturday = day(view, /^Sat/);
    saturday.getByRole("button", { name: "Mark Chili cooked" });
    saturday.getByText("Cook");

    const sunday = day(view, /Sun/);
    sunday.getByText("Cooked Sat 3");
    expect(sunday.queryByRole("button", { name: /cooked/ })).toBe(null);
  });

  it("marks the meal cooked from its check", async () => {
    const user = userEvent.setup();
    await fixture.planChili({ cookDate: SATURDAY, eatDates: [SATURDAY] });
    const view = render(week(await fixture.meals(TODAY)));

    await user.click(view.getByRole("button", { name: "Mark Chili cooked" }));
    await waitFor(async () =>
      expect((await fixture.meals(TODAY))[0]?.cooked).toBe(true),
    );
  });
});
