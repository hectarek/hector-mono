import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { PracticeForm } from "@/app/_components/practice-form";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

beforeEach(() => {
  nextState.pushed = [];
});

describe("the session form", () => {
  it("logs a session with its problem, how it went and its minutes, then goes back to the practice page (R11)", async () => {
    signInAs("owner");
    const topic = `Pair sum ${crypto.randomUUID().slice(0, 8)}`;
    const view = render(<PracticeForm />);

    fireEvent.change(screen.getByLabelText("Problem or topic"), {
      target: { value: topic },
    });
    fireEvent.click(screen.getByRole("button", { name: "Partial" }));
    fireEvent.change(screen.getByLabelText("Minutes"), {
      target: { value: "25" },
    });
    const form = view.container.querySelector("form");
    if (!form) throw new Error("No form");
    fireEvent.submit(form);

    await waitFor(() => expect(nextState.pushed).toEqual(["/practice"]));
    const { recent } = await getInjection("IListPracticeController")(
      { limit: 50 },
      HECTOR,
    );
    expect(recent.find((session) => session.topic === topic)).toMatchObject({
      result: "partial",
      minutes: 25,
      aiUsed: false,
      practicedOn: todayIn(PLAN_TIME_ZONE),
      nextReview: { step: 1 },
    });
  });
});
