import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PracticeReview } from "@/app/_components/practice-review";
import { logPractice } from "@/app/actions/practice";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

describe("the review sheet", () => {
  it("logs the session's next review, dated today, once the result is picked (R11)", async () => {
    signInAs("owner");
    const { session } = dataOf(
      await logPractice({
        topic: `Pair sum ${crypto.randomUUID().slice(0, 8)}`,
        result: "solved",
        practicedOn: "2026-01-05",
      }),
    );
    render(
      <PracticeReview
        session={{ id: session.id, topic: session.topic, step: 1 }}
      />,
    );

    // The sheet renders in a portal, outside the trigger's container.
    fireEvent.click(screen.getByRole("button", { name: "Log review" }));
    fireEvent.click(screen.getByRole("button", { name: "Solved" }));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(async () =>
      expect(
        (
          await getInjection("IGetPracticeSessionController")(
            { id: session.id },
            HECTOR,
          )
        ).reviews,
      ).toEqual([
        expect.objectContaining({
          result: "solved",
          practicedOn: todayIn(PLAN_TIME_ZONE),
          aiUsed: false,
          author: "owner",
        }),
      ]),
    );
  });
});
