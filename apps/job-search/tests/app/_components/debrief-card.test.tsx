import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { DebriefCard } from "@/app/_components/debrief-card";
import { logInteraction } from "@/app/actions/interactions";
import { addPerson, getPerson } from "@/app/actions/people";
import { dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

describe("a conversation to debrief", () => {
  it("records how it went, with a note and the person's next step (R8)", async () => {
    signInAs("owner");
    const person = dataOf(
      await addPerson({ name: `Grace ${crypto.randomUUID().slice(0, 8)}` }),
    );
    const [conversation] = dataOf(
      await logInteraction({
        personIds: [person.id],
        kind: "conversation",
        scheduled: {
          startsAt: "2026-01-05T14:00:00-05:00",
          endsAt: "2026-01-05T14:30:00-05:00",
        },
      }),
    ).interactions;
    if (!conversation) {
      throw new Error("No conversation was logged");
    }
    render(
      <DebriefCard
        debrief={{
          conversation,
          person: { id: person.id, name: person.name, role: null, rank: null },
        }}
      />,
    );

    expect(screen.getByText("Conversation, Jan 5 at 2:00 PM")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save" })).toHaveProperty(
      "disabled",
      true,
    );
    fireEvent.click(screen.getByRole("button", { name: "Held" }));
    fireEvent.change(screen.getByLabelText("Note"), {
      target: { value: "Talked about the team" },
    });
    fireEvent.change(screen.getByLabelText("Next step"), {
      target: { value: "Send a thank-you" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(async () =>
      expect(dataOf(await getPerson({ id: person.id }))).toMatchObject({
        person: { metOn: "2026-01-05", nextStep: "Send a thank-you" },
        interactions: [
          expect.objectContaining({
            id: conversation.id,
            state: "held",
            note: "Talked about the team",
          }),
        ],
      }),
    );
  });
});
