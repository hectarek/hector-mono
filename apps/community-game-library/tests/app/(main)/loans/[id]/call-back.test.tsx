import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, within } from "@testing-library/react";
import { APP_TOASTER } from "@/app/_lib/notify";
import LoanPage from "@/app/(main)/loans/[id]/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

const { you, sam } = CAST.people;
const { youHaveMossAndMortar, joHasGullAndAnchor } = CAST.loans;

const withToaster = async (id: string) =>
  render(
    <>
      {await LoanPage({ params: Promise.resolve({ id }) })}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );

describe("calling a game back (U14: C15, C18)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("asks first, calls Gull & Anchor back, and offers to text Jo too (Call a game back)", async () => {
    nextState.userId = you.id;
    const view = await withToaster(joHasGullAndAnchor.id);
    fireEvent.click(
      within(view.container).getByRole("button", { name: "Call it back" }),
    );
    const dialog = within(await view.findByRole("alertdialog"));
    expect(dialog.getByText("Call Gull & Anchor back?")).toBeTruthy();
    expect(
      dialog.getByText(
        "Jo is asked to give Gull & Anchor back now. It goes to their inbox, so they see it when they next open the app.",
      ),
    ).toBeTruthy();
    expect(
      dialog.getByText("It stays overdue until you confirm it’s back."),
    ).toBeTruthy();
    // C15's box for whoever is first in line.
    expect(dialog.getByText("Ben keeps their place")).toBeTruthy();
    expect(
      dialog.getByText("Ben is 1st in line and is told when it’s back."),
    ).toBeTruthy();
    expect(
      dialog.getByRole("button", { name: "Leave it with Jo" }),
    ).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Call it back" }));

    expect(await view.findByText("Jo is asked to bring it back.")).toBeTruthy();
    expect(view.getByRole("button", { name: "Text Jo too" })).toBeTruthy();

    view.unmount();
    const c18 = within((await withToaster(joHasGullAndAnchor.id)).container);
    expect(c18.getByText("Called back")).toBeTruthy();
    expect(
      c18.getByText(
        "You called it back this morning. Jo sees that when they next open the app.",
      ),
    ).toBeTruthy();
    expect(c18.queryByText("Jo asked for more time")).toBeNull();
    expect(c18.queryByRole("button", { name: "Call it back" })).toBeNull();
    // C18 draws no Change the due date once it's called back.
    expect(
      c18.queryByRole("button", { name: "Change the due date" }),
    ).toBeNull();
  });

  it("leads the borrower's page with Sam wants it back now", async () => {
    await getInjection("ICallBackController")(
      { loanId: youHaveMossAndMortar.id },
      sam.id,
    );
    nextState.userId = you.id;
    const page = within((await withToaster(youHaveMossAndMortar.id)).container);
    expect(page.getByText("Sam wants it back now")).toBeTruthy();
    expect(
      page.getByText("Sam called it back this morning. It’s due today."),
    ).toBeTruthy();
    expect(page.getByText("Due today")).toBeTruthy();
    expect(
      page.queryByRole("button", { name: "Ask for more time" }),
    ).toBeNull();
  });
});
