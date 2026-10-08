import { beforeEach, describe, expect, it } from "bun:test";
import { render, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Activity, useState } from "react";
import { PlanEntrySheet } from "@/app/_components/plan-entry-sheet";
import type { PlanEntry } from "@/src/entities/models/plan-entry.model";
import { planScreenFixture } from "@/tests/_support/plan-screens";

// Sunday 4 October 2026.
const TODAY = "2026-10-04";
const MON = "2026-10-05";
const TUE = "2026-10-06";

// A meal's ⋯ sheet, against the real actions and the test container's repositories.
describe("PlanEntrySheet", () => {
  let fixture: Awaited<ReturnType<typeof planScreenFixture>>;

  beforeEach(async () => {
    fixture = await planScreenFixture();
  });

  // The sheet for `entry`, opened from the row for `date`.
  const sheet = (entry: PlanEntry, date = TODAY) => (
    <PlanEntrySheet
      entry={entry}
      date={date}
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
    const meal = await fixture.planChili({
      cookDate: TODAY,
      eatDates: [TODAY, MON, TUE],
    });
    const view = render(sheet(meal));

    await user.click(view.getByRole("button", { name: "Change days" }));
    await user.click(eatOn(view).getByRole("button", { name: "Tue 6" }));
    await user.click(view.getByRole("button", { name: "Save days" }));
    await waitFor(async () =>
      expect((await fixture.meals(TODAY))[0]?.eatDates).toEqual([TODAY, MON]),
    );
    const [saved] = await fixture.meals(TODAY);

    view.rerender(sheet(saved ?? meal));
    await user.click(view.getByRole("button", { name: "Change days" }));
    expect(eatDays(view)).toEqual(["Today", "Mon 5"]);
  });

  // D43: a leftovers day can come off a meal on its own, but not its cook day or its only
  // eat day.
  it("takes a leftovers day off, and offers it only on one", async () => {
    const user = userEvent.setup();
    const meal = await fixture.planChili({
      cookDate: TODAY,
      eatDates: [TODAY, MON, TUE],
    });
    const fromMonday = render(sheet(meal, MON));
    await user.click(
      fromMonday.getByRole("button", { name: "Not eating it on Mon 5" }),
    );
    await waitFor(async () =>
      expect((await fixture.meals(TODAY))[0]?.eatDates).toEqual([TODAY, TUE]),
    );
    fromMonday.unmount();

    const fromCookDay = render(sheet(meal, TODAY));
    expect(fromCookDay.queryByRole("button", { name: /Not eating it/ })).toBe(
      null,
    );
    fromCookDay.unmount();

    const onlyMonday = await fixture.planChili({
      cookDate: TODAY,
      eatDates: [MON],
    });
    const lastDay = render(sheet(onlyMonday, MON));
    expect(lastDay.queryByRole("button", { name: /Not eating it/ })).toBe(null);
  });

  // D45: the sheet says which button was pressed, so one loaded before the meal went on the
  // list (someone else's press) adds nothing, and Add to list again adds a second batch.
  it("adds a meal once from a sheet that's out of date, and again when asked", async () => {
    const user = userEvent.setup();
    const meal = await fixture.planChili({
      cookDate: TODAY,
      eatDates: [TODAY],
    });
    const view = render(sheet(meal));

    await user.click(view.getByRole("button", { name: "Add to groceries" }));
    await view.findByText("1 added.");
    expect(await fixture.groceries()).toEqual(["1 lb ground turkey"]);

    // Still showing the meal as it was before it went on the list.
    await user.click(
      await view.findByRole("button", { name: "Add to groceries" }),
    );
    await view.findByText("1 meal was already in groceries.");
    expect(await fixture.groceries()).toEqual(["1 lb ground turkey"]);

    const [added] = await fixture.meals(TODAY);
    view.rerender(sheet(added ?? meal));
    await user.click(
      view.getByRole("button", { name: "Add to groceries again" }),
    );
    await waitFor(async () =>
      expect(await fixture.groceries()).toEqual(["2 lb ground turkey"]),
    );
  });

  // D88: Next.js keeps the plan alive but hidden when you leave it; a meal's sheet left open
  // (the row owns its open state) is closed, and back at its first step, when you return.
  it("is closed when you come back to the plan", async () => {
    const user = userEvent.setup();
    const meal = await fixture.planChili({
      cookDate: TODAY,
      eatDates: [TODAY],
    });
    function Row({ mode }: { mode: "visible" | "hidden" }) {
      const [open, setOpen] = useState(true);
      return (
        <Activity mode={mode}>
          <PlanEntrySheet
            entry={meal}
            date={TODAY}
            today={TODAY}
            open={open}
            onOpenChange={setOpen}
            onRemove={() => {}}
          />
        </Activity>
      );
    }
    const view = render(<Row mode="visible" />);
    await user.click(view.getByRole("button", { name: "Change days" }));
    await view.findByRole("button", { name: "Save days" });

    view.rerender(<Row mode="hidden" />);
    view.rerender(<Row mode="visible" />);
    await waitFor(() =>
      expect(view.queryByRole("button", { name: "Save days" })).toBe(null),
    );
    expect(view.queryByRole("button", { name: "Change days" })).toBe(null);
  });
});
