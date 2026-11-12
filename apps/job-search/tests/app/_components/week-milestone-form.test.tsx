import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WeekMilestoneForm } from "@/app/_components/week-milestone-form";
import { getWeek, setWeekMilestone } from "@/app/actions/week";
import { addDays } from "@/src/entities/week";
import { dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const aPastWeek = async (weeksBack: number) =>
  addDays(dataOf(await getWeek({})).week, -7 * weeksBack);

const planOf = async (week: string) => dataOf(await getWeek({ week })).plan;

const reviewOf = async (week: string) => dataOf(await getWeek({ week })).review;

const submit = (name: string) =>
  fireEvent.submit(
    screen.getByRole("button", { name }).closest("form") as HTMLFormElement,
  );

// R10 as revised 2026-11-10 (U20): Monday's planning sets the week's milestone, which fixes no
// counts.
describe("the week's milestone form", () => {
  it("sets a first milestone once one is typed, and then changes it", async () => {
    signInAs("owner");
    const week = await aPastWeek(8);
    render(<WeekMilestoneForm week={week} plan={null} />);

    expect(
      screen.getByRole("button", { name: "Set the milestone" }),
    ).toHaveProperty("disabled", true);
    fireEvent.change(screen.getByLabelText("Milestone"), {
      target: { value: "Ship the fictional widget" },
    });
    submit("Set the milestone");

    await waitFor(async () =>
      expect((await planOf(week))?.milestone).toBe("Ship the fictional widget"),
    );
    expect(await screen.findByText("Saved.")).toBeTruthy();
    // Setting it saved no review, so nothing fixed the week's counts.
    expect(await reviewOf(week)).toBeNull();

    fireEvent.change(screen.getByLabelText("Milestone"), {
      target: { value: "Ship two fictional widgets" },
    });
    submit("Save");
    await waitFor(async () =>
      expect((await planOf(week))?.milestone).toBe(
        "Ship two fictional widgets",
      ),
    );
  });

  // KTD15: Claude changes the milestone while Hector's form is open.
  it("keeps what Hector typed on a conflict, and shows Claude's milestone beside it", async () => {
    signInAs("owner");
    const week = await aPastWeek(9);
    const plan = dataOf(
      await setWeekMilestone({ week, milestone: "Draft", updatedAt: null }),
    );
    render(<WeekMilestoneForm week={week} plan={plan} />);
    fireEvent.change(screen.getByLabelText("Milestone"), {
      target: { value: "Hector's milestone" },
    });

    signInAs("agent");
    dataOf(
      await setWeekMilestone({
        week,
        milestone: "Claude's milestone",
        updatedAt: plan.updatedAt.toISOString(),
      }),
    );
    signInAs("owner");
    submit("Save");

    expect(
      await screen.findByText("Changed since you opened this"),
    ).toBeTruthy();
    expect(
      screen.getByText("Milestone is now Claude's milestone"),
    ).toBeTruthy();
    expect(screen.getByLabelText("Milestone")).toHaveProperty(
      "value",
      "Hector's milestone",
    );
  });
});
