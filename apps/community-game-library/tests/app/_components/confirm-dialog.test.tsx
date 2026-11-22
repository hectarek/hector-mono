import { describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { ConfirmDialog } from "@/app/_components/confirm-dialog";
import { focused } from "@/tests/_support/focus";

// C15's dialog, as screens.md's Actions that ask first words it.
function CallItBack({
  onConfirm,
}: {
  onConfirm: () => Promise<string | undefined> | string | undefined;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Call it back
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Call Gull & Anchor back?"
        confirmLabel="Call it back"
        keepLabel="Leave it with Jo"
        onConfirm={onConfirm}
      >
        <p>
          Jo is told to return it now. It goes to her inbox, so she sees it when
          she next opens the app.
        </p>
      </ConfirmDialog>
    </>
  );
}

// A tap focuses the button it opens from, as a browser does, so the dialog has somewhere to
// give the cursor back to.
async function openDialog(view: ReturnType<typeof render>) {
  const opener = view.getByRole("button", { name: "Call it back" });
  opener.focus();
  fireEvent.click(opener);
  return view.findByRole("alertdialog", { name: "Call Gull & Anchor back?" });
}

// Polled as a boolean: Bun prints a whole element when an expectation on one fails, which
// takes seconds and starves waitFor's retries.
const isClosed = (view: ReturnType<typeof render>) =>
  expect(view.queryByRole("alertdialog") === null).toBe(true);

describe("ConfirmDialog", () => {
  // screens.md rule 3: the red button names the thing, the other says what's kept, and the
  // dialog names who is told.
  it("asks with a red button naming the thing, one keeping it, and who's told", async () => {
    const view = render(<CallItBack onConfirm={() => undefined} />);
    const dialog = await openDialog(view);

    expect(dialog.getAttribute("aria-describedby")).toBeTruthy();
    const description = document.getElementById(
      dialog.getAttribute("aria-describedby") ?? "",
    );
    expect(description?.textContent).toContain("Jo is told to return it now.");

    const [confirm, keep, ...more] = within(dialog).getAllByRole("button");
    expect(more).toEqual([]);
    expect(confirm?.textContent).toBe("Call it back");
    expect(keep?.textContent).toBe("Leave it with Jo");
    // The red button is @repo/ui's destructive one, which the theme draws solid stamp-red.
    expect(confirm?.className).toContain("bg-destructive");
  });

  // So a stray Enter keeps things as they are; closing gives the cursor back to what opened it.
  it("gives the keeping button the cursor, and the opener it again on close", async () => {
    const view = render(<CallItBack onConfirm={() => undefined} />);
    const dialog = await openDialog(view);
    await waitFor(() => expect(focused()).toBe("Leave it with Jo"));

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Leave it with Jo" }),
    );
    await waitFor(() => isClosed(view));
    await waitFor(() => expect(focused()).toBe("Call it back"));
  });

  it("keeps things as they are when the keeping button is tapped", async () => {
    let calls = 0;
    const view = render(
      <CallItBack
        onConfirm={() => {
          calls += 1;
          return undefined;
        }}
      />,
    );
    const dialog = await openDialog(view);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Leave it with Jo" }),
    );
    await waitFor(() => isClosed(view));
    expect(calls).toBe(0);
  });

  it("runs the action and closes once it's done", async () => {
    let calls = 0;
    const view = render(
      <CallItBack
        onConfirm={async () => {
          calls += 1;
          return undefined;
        }}
      />,
    );
    const dialog = await openDialog(view);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Call it back" }),
    );
    await waitFor(() => isClosed(view));
    expect(calls).toBe(1);
  });

  it("stays open with the action's error, so it can be tried again", async () => {
    const view = render(
      <CallItBack onConfirm={async () => "That didn’t send."} />,
    );
    const dialog = await openDialog(view);
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Call it back" }),
    );
    expect((await within(dialog).findByRole("alert")).textContent).toBe(
      "That didn’t send.",
    );
    expect(view.getByRole("alertdialog")).toBeTruthy();
  });
});
