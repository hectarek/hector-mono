import { describe, expect, it } from "bun:test";
import { within } from "@testing-library/dom";
import WeekPage from "@/app/(main)/week/page";
import { logInteraction } from "@/app/actions/interactions";
import { addPerson } from "@/app/actions/people";
import {
  getWeek,
  saveWeeklyReview,
  setWeekMilestone,
} from "@/app/actions/week";
import { addDays } from "@/src/entities/week";
import { NotFoundPage } from "@/tests/_support/next";
import { dataOf } from "@/tests/_support/screens";
import { renderOnServer } from "@/tests/_support/server-render";
import { signInAs } from "@/tests/_support/session";

const weekPage = async (week?: string) =>
  within(
    await renderOnServer(
      await WeekPage({ searchParams: Promise.resolve(week ? { week } : {}) }),
    ),
  );

// A week no other test in the file reviews: the test container keeps every review for the run.
const aPastWeek = async (weeksBack: number) =>
  addDays(dataOf(await getWeek({})).week, -7 * weeksBack);

describe("the weekly review page", () => {
  it("shows a week with no plan or review: its counts so far, empty forms, and the week before", async () => {
    signInAs("owner");
    const week = await aPastWeek(3);

    const page = await weekPage(week);

    const plan = within(page.getByRole("region", { name: "Plan" }));
    expect(plan.getByLabelText("Milestone")).toHaveProperty("value", "");
    expect(
      plan.getByRole("button", { name: "Set the milestone" }),
    ).toHaveProperty("disabled", true);
    expect(page.getByRole("region", { name: "The week so far" })).toBeTruthy();
    expect(page.getByLabelText("The one change")).toHaveProperty("value", "");
    expect(page.getByRole("button", { name: "Save the review" })).toBeTruthy();
    expect(
      page.getByRole("button", { name: "Previous week" }).getAttribute("href"),
    ).toBe(`/week?week=${addDays(week, -7)}`);
    expect(
      page.getByRole("button", { name: "Next week" }).getAttribute("href"),
    ).toBe(`/week?week=${addDays(week, 7)}`);
  });

  // R10: the snapshot, with the live count beside it once they differ, and the milestone planning
  // set beside the one change (as revised 2026-11-10).
  it("shows a saved week's snapshot, a late message's count now beside it, and its milestone", async () => {
    signInAs("owner");
    const week = await aPastWeek(4);
    const person = dataOf(
      await addPerson({ name: `Ada ${crypto.randomUUID().slice(0, 8)}` }),
    );
    dataOf(
      await setWeekMilestone({
        week,
        milestone: "A fictional milestone",
        updatedAt: null,
      }),
    );
    dataOf(
      await saveWeeklyReview({
        week,
        change: "A fictional change",
        updatedAt: null,
      }),
    );
    dataOf(
      await logInteraction({
        personIds: [person.id],
        kind: "message-sent",
        occurredOn: addDays(week, 2),
      }),
    );

    const page = await weekPage(week);

    const counts = within(
      page.getByRole("region", { name: "The week as saved" }),
    );
    expect(counts.getByText("Now 1")).toBeTruthy();
    expect(counts.getByText(/^Saved .* by Hector/)).toBeTruthy();
    expect(page.getByLabelText("Milestone")).toHaveProperty(
      "value",
      "A fictional milestone",
    );
    expect(page.getByLabelText("The one change")).toHaveProperty(
      "value",
      "A fictional change",
    );
  });

  it("answers a day that isn't a Monday with not found", async () => {
    signInAs("owner");
    await expect(weekPage("2026-10-21")).rejects.toBeInstanceOf(NotFoundPage);
  });
});
