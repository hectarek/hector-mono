import { beforeEach, describe, expect, it } from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import type { MouseEvent } from "react";
import { BackLink } from "@/app/_components/back-link";
import { LeaveGuardDialog } from "@/app/_components/confirm-dialog";
import { confirmLeave, useLeaveGuard } from "@/app/_lib/leave-guard";
import { nextState, signInAsNewUser } from "@/tests/_support/next";

// A form that says whether it holds typed text, as each form does.
function Form({ typed }: { typed: boolean }) {
  useLeaveGuard(typed);
  return <p>A form</p>;
}

function Page({ typed }: { typed: boolean }) {
  return (
    <>
      <BackLink href="/loans" label="Loans" />
      <Form typed={typed} />
      <LeaveGuardDialog />
    </>
  );
}

// A plain tap's event, as confirmLeave sees it.
function tap(): MouseEvent & { prevented: boolean } {
  const event = {
    prevented: false,
    button: 0,
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    preventDefault() {
      event.prevented = true;
    },
  };
  return event as unknown as MouseEvent & { prevented: boolean };
}

beforeEach(() => {
  signInAsNewUser();
});

// screens.md, Actions that ask first: "Leave without saving?" when a form has typed text.
describe("the leave guard", () => {
  it("lets a link go when no form has typed text", () => {
    const event = tap();
    let went = 0;
    confirmLeave(event, () => {
      went += 1;
    });
    expect(event.prevented).toBe(false);
    expect(went).toBe(0);
  });

  it("asks before the back link leaves a form with typed text", async () => {
    const view = render(<Page typed />);
    fireEvent.click(view.getByRole("link", { name: "Back to Loans" }));

    const dialog = await view.findByRole("alertdialog", {
      name: "Leave without saving?",
    });
    expect(
      within(dialog)
        .getAllByRole("button")
        .map((button) => button.textContent),
    ).toEqual(["Leave", "Keep editing"]);

    fireEvent.click(
      within(dialog).getByRole("button", { name: "Keep editing" }),
    );
    await waitFor(() =>
      expect(view.queryByRole("alertdialog") === null).toBe(true),
    );
    expect(nextState.pushed).toEqual([]);

    fireEvent.click(view.getByRole("link", { name: "Back to Loans" }));
    const again = await view.findByRole("alertdialog");
    fireEvent.click(within(again).getByRole("button", { name: "Leave" }));
    await waitFor(() => expect(nextState.pushed).toEqual(["/loans"]));
  });

  it("stops asking once the form's text is saved or cleared", () => {
    const view = render(<Page typed />);
    view.rerender(<Page typed={false} />);
    const event = tap();
    confirmLeave(event, () => {});
    expect(event.prevented).toBe(false);
  });
});
