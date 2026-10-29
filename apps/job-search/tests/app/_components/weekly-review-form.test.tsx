import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { WeeklyReviewForm } from "@/app/_components/weekly-review-form";
import { getWeek, saveWeeklyReview } from "@/app/actions/week";
import { addDays } from "@/src/entities/week";
import { dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const aPastWeek = async (weeksBack: number) =>
  addDays(dataOf(await getWeek({})).week, -7 * weeksBack);

const reviewOf = async (week: string) => dataOf(await getWeek({ week })).review;

describe("the weekly review form", () => {
  it("saves a first review with its milestone and change, and then edits it", async () => {
    signInAs("owner");
    const week = await aPastWeek(6);
    render(<WeeklyReviewForm week={week} review={null} />);

    fireEvent.change(screen.getByLabelText("Build milestone"), {
      target: { value: "A fictional milestone" },
    });
    fireEvent.change(screen.getByLabelText("The one change"), {
      target: { value: "Send messages earlier" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Save the review" })
        .closest("form") as HTMLFormElement,
    );

    await waitFor(async () =>
      expect(await reviewOf(week)).toMatchObject({
        milestone: "A fictional milestone",
        change: "Send messages earlier",
      }),
    );
    expect(await screen.findByText("Saved.")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("The one change"), {
      target: { value: "Send messages on Monday" },
    });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Save" })
        .closest("form") as HTMLFormElement,
    );
    await waitFor(async () =>
      expect((await reviewOf(week))?.change).toBe("Send messages on Monday"),
    );
  });

  // KTD15: Claude saves the review while Hector's form is open.
  it("keeps what Hector typed on a conflict, and shows Claude's change beside it", async () => {
    signInAs("owner");
    const week = await aPastWeek(7);
    const review = dataOf(await saveWeeklyReview({ week, updatedAt: null }));
    render(<WeeklyReviewForm week={week} review={review} />);
    fireEvent.change(screen.getByLabelText("The one change"), {
      target: { value: "Hector's change" },
    });

    signInAs("agent");
    dataOf(
      await saveWeeklyReview({
        week,
        milestone: "Claude's milestone",
        updatedAt: review.updatedAt.toISOString(),
      }),
    );
    signInAs("owner");
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Save" })
        .closest("form") as HTMLFormElement,
    );

    expect(
      await screen.findByText("Changed since you opened this"),
    ).toBeTruthy();
    expect(
      screen.getByText("Build milestone is now Claude's milestone"),
    ).toBeTruthy();
    expect(screen.getByLabelText("The one change")).toHaveProperty(
      "value",
      "Hector's change",
    );
  });
});
