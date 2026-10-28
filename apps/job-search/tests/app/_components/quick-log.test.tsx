import { describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuickLog } from "@/app/_components/quick-log";
import { addPerson } from "@/app/actions/people";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

// The test container's people live for the whole run, so each test names its own.
const fictional = (name: string) =>
  `${name} ${crypto.randomUUID().slice(0, 8)}`;

async function aPerson(name: string) {
  const result = await addPerson({ name });
  if (!result.ok) throw new Error(`The add failed: ${result.code}`);
  return { id: result.data.id, name: result.data.name };
}

const interactionsOf = async (id: string) =>
  (await getInjection("IGetPersonController")({ id }, HECTOR)).interactions;

const findPersonNamed = async (name: string) =>
  (
    await getInjection("IFindPeopleController")({ query: name }, HECTOR)
  ).people.find((person) => person.name === name);

// The sheet renders in a portal, outside the trigger's container.
const open = () => fireEvent.click(screen.getByRole("button", { name: "Log" }));
const save = () =>
  fireEvent.click(screen.getByRole("button", { name: "Save" }));

describe("the quick log", () => {
  it("logs a sent message to the person it opens on with one tap, dated today (R8)", async () => {
    signInAs("owner");
    const ada = await aPerson(fictional("Ada"));
    render(<QuickLog person={ada} />);

    open();
    save();

    await waitFor(async () =>
      expect(await interactionsOf(ada.id)).toEqual([
        expect.objectContaining({
          kind: "message-sent",
          occurredOn: todayIn(PLAN_TIME_ZONE),
          author: "owner",
        }),
      ]),
    );
  });

  it("logs a held conversation with the same one sheet and one tap", async () => {
    signInAs("owner");
    const ada = await aPerson(fictional("Ada"));
    render(<QuickLog person={ada} />);

    open();
    fireEvent.click(screen.getByRole("button", { name: "Conversation" }));
    save();

    await waitFor(async () =>
      expect(await interactionsOf(ada.id)).toEqual([
        expect.objectContaining({ kind: "conversation", state: "held" }),
      ]),
    );
  });

  it("sends a batch to people picked by search, one interaction each", async () => {
    signInAs("owner");
    const grace = await aPerson(fictional("Grace"));
    const linus = await aPerson(fictional("Linus"));
    render(<QuickLog />);

    open();
    for (const person of [grace, linus]) {
      fireEvent.change(screen.getByLabelText("Search people by name"), {
        target: { value: person.name },
      });
      fireEvent.click(await screen.findByRole("button", { name: person.name }));
    }
    save();

    await waitFor(async () => {
      expect(await interactionsOf(grace.id)).toHaveLength(1);
      expect(await interactionsOf(linus.id)).toHaveLength(1);
    });
  });

  it("adds someone a search doesn't find, by name, and logs to them", async () => {
    signInAs("owner");
    const name = fictional("Margaret");
    render(<QuickLog />);

    open();
    fireEvent.change(screen.getByLabelText("Search people by name"), {
      target: { value: name },
    });
    fireEvent.click(
      await screen.findByRole("button", { name: `Add “${name}”` }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Add person" }));
    await screen.findByRole("button", { name: `Remove ${name}` });
    save();

    await waitFor(async () => {
      const added = await findPersonNamed(name);
      expect(added).toBeDefined();
      expect(await interactionsOf(added?.id ?? "")).toHaveLength(1);
    });
  });
});
