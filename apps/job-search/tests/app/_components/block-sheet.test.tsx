import { afterEach, describe, expect, it } from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { BlockSheet } from "@/app/_components/block-sheet";
import { TodayBlocks } from "@/app/_components/today-blocks";
import { APP_TOASTER } from "@/app/_lib/notify";
import { addBlocks, getBlock, updateBlock } from "@/app/actions/blocks";
import type { Block } from "@/src/entities/models/block.model";
import { dataOf } from "@/tests/_support/screens";
import { signInAs } from "@/tests/_support/session";

const fictional = (name: string) =>
  `${name} ${crypto.randomUUID().slice(0, 8)}`;

// A block of Hector's, on Monday, Nov 9, 9:30 to 11 am Eastern.
async function aBlock(input: Record<string, unknown> = {}): Promise<Block> {
  signInAs("owner");
  const [block] = dataOf(
    await addBlocks({
      blocks: [
        {
          startsAt: "2026-11-09T09:30:00-05:00",
          endsAt: "2026-11-09T11:00:00-05:00",
          effort: "networking",
          title: fictional("Messages"),
          doneWhen: "five messages are sent",
          ...input,
        },
      ],
    }),
  );
  if (!block) throw new Error("No block added");
  return block;
}

const blockOf = async (id: string) => dataOf(await getBlock({ id }));

// The row's button, named by all its text, and the sheet's buttons in its portal.
const rowOf = (block: Block) =>
  screen.getByRole("button", { name: new RegExp(block.title) });
const tap = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));
const submit = () => {
  const form = screen.getByLabelText("What happened").closest("form");
  if (!form) throw new Error("The sheet isn't a form");
  fireEvent.submit(form);
};

// Sonner keeps its toasts in a store of its own, which outlives a test's render.
afterEach(() => {
  toast.dismiss();
});

describe("a block's row and its sheet (U17)", () => {
  it("shows the block's time, effort, title, done-when line and how it went", async () => {
    const block = await aBlock();
    render(<BlockSheet block={block} now={false} />);

    const row = rowOf(block).textContent ?? "";
    expect(row).toMatch(/9:30\sAM/);
    expect(row).toContain("Networking");
    expect(row).toContain("Done when five messages are sent");
    expect(row).toContain("Planned");
  });

  it("marks a block done with a line in three taps and the typing, then puts it back on Undo", async () => {
    const block = await aBlock();
    render(
      <>
        <BlockSheet block={block} now={false} />
        <Toaster id={APP_TOASTER} />
      </>,
    );

    fireEvent.click(rowOf(block));
    tap("Done");
    fireEvent.change(screen.getByLabelText("What happened"), {
      target: { value: "Sent six." },
    });
    tap("Save");

    await waitFor(async () =>
      expect(await blockOf(block.id)).toMatchObject({
        state: "done",
        whatHappened: "Sent six.",
      }),
    );
    expect(
      await screen.findByText(`Marked done: ${block.title}.`),
    ).toBeTruthy();

    tap("Undo");
    await waitFor(async () =>
      expect(await blockOf(block.id)).toMatchObject({
        state: "planned",
        whatHappened: null,
      }),
    );
  });

  it("saves on the form's submit, so Enter or the phone's Go saves", async () => {
    const block = await aBlock();
    render(<BlockSheet block={block} now={false} />);

    fireEvent.click(rowOf(block));
    tap("Skipped");
    submit();

    await waitFor(async () =>
      expect((await blockOf(block.id)).state).toBe("skipped"),
    );
  });

  it("shows a change made since the row was read, and keeps what was typed", async () => {
    const block = await aBlock();
    render(<BlockSheet block={block} now={false} />);
    dataOf(
      await updateBlock({
        id: block.id,
        updatedAt: block.updatedAt.toISOString(),
        title: "Renamed meanwhile",
      }),
    );

    fireEvent.click(rowOf(block));
    tap("Partial");
    submit();

    expect(await screen.findByText(/changed since/i)).toBeTruthy();
    expect((await blockOf(block.id)).state).toBe("planned");
  });
});

describe("today's blocks on This week (U17)", () => {
  it("counts the blocks done of those planned, leaving a moved one out, and says which is happening now", async () => {
    const done = await aBlock({ state: "done" });
    const moved = await aBlock({
      startsAt: "2026-11-09T11:00:00-05:00",
      endsAt: "2026-11-09T12:00:00-05:00",
      state: "moved",
    });
    const now = await aBlock({
      startsAt: "2026-11-09T13:00:00-05:00",
      endsAt: "2026-11-09T15:00:00-05:00",
    });
    render(
      <TodayBlocks
        blocks={[done, moved, now]}
        now={new Date("2026-11-09T14:00:00-05:00")}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Today's blocks · 1 of 2 done" }),
    ).toBeTruthy();
    expect(rowOf(now).textContent).toContain("Now");
    expect(rowOf(moved).textContent).toContain("Moved");
  });
});
