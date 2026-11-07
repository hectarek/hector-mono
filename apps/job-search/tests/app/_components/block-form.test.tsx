import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BlockForm } from "@/app/_components/block-form";
import { addBlocks, getBlock } from "@/app/actions/blocks";
import { nextState } from "@/tests/_support/next";
import { dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const fictional = (name: string) =>
  `${name} ${crypto.randomUUID().slice(0, 8)}`;

const blockOf = async (id: string) => dataOf(await getBlock({ id }));

const type = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const tap = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const submit = () => {
  const form = screen.getByLabelText("Title").closest("form");
  if (!form) throw new Error("No form");
  fireEvent.submit(form);
};

beforeEach(() => {
  signInAs("owner");
  nextState.pushed = [];
});

describe("the block form (U17)", () => {
  it("adds a planned block, its end an hour after its start until set, its times in Eastern time", async () => {
    const title = fictional("Arrays and hashing");
    render(<BlockForm />);

    type("Title", title);
    tap("Practice");
    type("Starts", "2026-11-10T13:30");
    expect(screen.getByLabelText("Ends")).toHaveProperty(
      "value",
      "2026-11-10T14:30",
    );
    type("Done when", "three problems are logged");
    submit();

    await waitFor(() => expect(nextState.pushed).toHaveLength(1));
    const id = nextState.pushed[0]?.replace("/blocks/", "") ?? "";
    expect(await blockOf(id)).toMatchObject({
      title,
      effort: "practice",
      day: "2026-11-10",
      startsAt: new Date("2026-11-10T13:30:00-05:00"),
      endsAt: new Date("2026-11-10T14:30:00-05:00"),
      doneWhen: "three problems are logged",
      state: "planned",
      whatHappened: null,
    });
  });

  it("adds work that wasn't planned, already done", async () => {
    render(<BlockForm />);

    type("Title", fictional("An application"));
    tap("Applying");
    type("Starts", "2026-11-10T16:00");
    tap("Done");
    type("What happened", "Sent, with a referral.");
    submit();

    await waitFor(() => expect(nextState.pushed).toHaveLength(1));
    const id = nextState.pushed[0]?.replace("/blocks/", "") ?? "";
    expect(await blockOf(id)).toMatchObject({
      state: "done",
      whatHappened: "Sent, with a referral.",
    });
  });

  it("changes only what was typed, and refuses an end before the start under the end", async () => {
    const [block] = dataOf(
      await addBlocks({
        blocks: [
          {
            startsAt: "2026-11-11T09:30:00-05:00",
            endsAt: "2026-11-11T11:00:00-05:00",
            effort: "projects",
            title: fictional("Build the demo"),
          },
        ],
      }),
    );
    if (!block) throw new Error("No block added");
    render(<BlockForm block={block} />);
    expect(screen.getByLabelText("Starts")).toHaveProperty(
      "value",
      "2026-11-11T09:30",
    );

    type("Ends", "2026-11-11T09:00");
    submit();
    expect(
      await screen.findByText("A block ends after it starts"),
    ).toBeTruthy();

    type("Ends", "2026-11-11T12:00");
    type("Title", "Build the demo's first screen");
    submit();

    await waitFor(() =>
      expect(nextState.pushed).toEqual([`/blocks/${block.id}`]),
    );
    expect(await blockOf(block.id)).toMatchObject({
      title: "Build the demo's first screen",
      startsAt: block.startsAt,
      endsAt: new Date("2026-11-11T12:00:00-05:00"),
      effort: "projects",
    });
  });
});
