import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { APP_TOASTER } from "@/app/_lib/notify";
import LoansPage from "@/app/(main)/loans/page";
import RecordLoanPage from "@/app/(main)/loans/record/page";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

describe("Record a loan (U16: C9)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("records Salt & Signal to Alice for 1 week, which goes on to Loans under You lent", async () => {
    await signInAsYouWithTheCast();
    const view = render(
      <>
        {await RecordLoanPage()}
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const page = within(view.container);
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Record a loan",
    );
    expect(
      page.getByText("For a loan you made face to face. No request needed."),
    ).toBeTruthy();
    const game = page.getByRole("combobox", { name: "Game" });
    expect(
      [...game.querySelectorAll("option")].map((option) => option.textContent),
    ).toEqual(["Night Market · Priya asked for it", "Salt & Signal"]);
    fireEvent.change(game, {
      target: {
        value: (game.querySelectorAll("option")[1] as HTMLOptionElement).value,
      },
    });
    // Nobody is taking it yet, so it can't be recorded.
    const record = page.getByRole("button", { name: "Record the loan" });
    expect((record as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(page.getByRole("button", { name: "Alice" }));
    expect(page.getByRole("button", { name: "Picked up on" }).textContent).toBe(
      "Today, Tue, Nov 10",
    );
    expect(
      page.getByText("Picked up today, so it’s due Tue, Nov 24."),
    ).toBeTruthy();
    fireEvent.click(page.getByRole("radio", { name: "1 week" }));
    expect(
      page.getByText("Picked up today, so it’s due Tue, Nov 17."),
    ).toBeTruthy();
    expect(
      page.getByText(
        "Alice is told, and it shows on their Loans, with nothing to confirm.",
      ),
    ).toBeTruthy();

    fireEvent.submit(record.closest("form") as HTMLFormElement);
    expect(await view.findByText("Loan recorded. Alice is told.")).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toEqual(["/loans"]));
    view.unmount();

    const loans = within(render(await LoansPage()).container);
    const lent = loans.getByRole("link", { name: /Salt & Signal/ });
    expect(within(lent).getByText("Alice has it")).toBeTruthy();
    expect(within(lent).getByText("Out to Nov 17")).toBeTruthy();
  });

  it("says there's nothing at home to lend for a member with no games", async () => {
    await signInAsMember();
    const page = within(render(await RecordLoanPage()).container);
    expect(page.getByText("Nothing at home to lend")).toBeTruthy();
    expect(
      page
        .getByRole("button", { name: "My library" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/my-library");
  });
});
