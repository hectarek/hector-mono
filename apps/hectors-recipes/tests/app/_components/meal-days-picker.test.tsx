import { describe, expect, it } from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MealDaysPicker } from "@/app/_components/meal-days-picker";
import type { MealDays } from "@/src/entities/meal-days";

// Sunday 4 October 2026.
const TODAY = "2026-10-04";

// Holds the days, as Add to plan and Change days do.
function Picker({ initial }: { initial: MealDays }) {
  const [days, setDays] = useState(initial);
  return <MealDaysPicker today={TODAY} value={days} onChange={setDays} />;
}

// A meal's days (D38): a cook day, then the days it's eaten.
describe("MealDaysPicker", () => {
  const group = (view: ReturnType<typeof render>, name: string) =>
    within(view.getByRole("group", { name }));
  const eatDays = (view: ReturnType<typeof render>) =>
    group(view, "Eat on")
      .getAllByRole("button", { pressed: true })
      .map((button) => button.textContent);

  it("moves the eat days with the cook day", async () => {
    const user = userEvent.setup();
    const view = render(
      <Picker initial={{ cookDate: TODAY, eatDates: [TODAY, "2026-10-05"] }} />,
    );
    expect(eatDays(view)).toEqual(["Today", "Mon 5"]);

    await user.click(
      group(view, "Cook on").getByRole("button", { name: "Tue 6" }),
    );
    expect(eatDays(view)).toEqual(["Tue 6", "Wed 7"]);
  });

  // D47: a day a week or more away shows its month.
  it("adds a later eat day with Other, written with its month", async () => {
    const user = userEvent.setup();
    const view = render(
      <Picker initial={{ cookDate: TODAY, eatDates: [TODAY] }} />,
    );

    await user.click(
      group(view, "Eat on").getByRole("button", { name: "Other" }),
    );
    fireEvent.change(view.getByLabelText("Another day to eat it"), {
      target: { value: "2026-10-20" },
    });
    expect(eatDays(view)).toEqual(["Today", "Tue Oct 20"]);
  });

  it("asks for an eat day when there's none", async () => {
    const user = userEvent.setup();
    const view = render(
      <Picker initial={{ cookDate: TODAY, eatDates: [TODAY] }} />,
    );

    await user.click(
      group(view, "Eat on").getByRole("button", { name: "Today" }),
    );
    view.getByText("Pick at least one day to eat it.");
  });
});
