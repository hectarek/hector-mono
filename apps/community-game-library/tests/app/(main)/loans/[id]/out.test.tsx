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
import LoanPage from "@/app/(main)/loans/[id]/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

const { you, alice, ben } = CAST.people;
const { alicesTinKettleDerby } = CAST.copies;
const {
  priyaAskedForNightMarket,
  youHaveMossAndMortar,
  joHasGullAndAnchor,
  benAskedForGullAndAnchor,
  benHasAlicesHarborLights,
} = CAST.loans;

const withToaster = async (id: string) =>
  render(
    <>
      {await LoanPage({ params: Promise.resolve({ id }) })}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
// The page again, as the action's revalidation renders it.
const again = async (view: ReturnType<typeof render>, id: string) => {
  view.unmount();
  return within((await withToaster(id)).container);
};

// Each test works on a loan of its own: the container's mocks keep what a test writes.
describe("a loan out and its return (U13: C3, C5, C7, C8)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));
    await signInAsYouWithTheCast();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("confirms the pick-up from C3, and the page reads as C5 (I've picked it up)", async () => {
    const request = await getInjection("IRequestLoanController")(
      { userGameId: alicesTinKettleDerby.id, note: "" },
      you.id,
    );
    await getInjection("IAnswerRequestController")(
      { loanId: request.id, answer: "yes", periodDays: 14, note: "" },
      alice.id,
    );
    const view = await withToaster(request.id);
    const page = within(view.container);
    expect(page.getByText("When you have it")).toBeTruthy();
    // The day's field is named by its label, and shows the day.
    expect(page.getByRole("button", { name: "Picked up on" }).textContent).toBe(
      "Today, Tue, Nov 10",
    );
    expect(
      page.getByText("If you pick it up today, it’s due Tue, Nov 24."),
    ).toBeTruthy();

    fireEvent.click(page.getByRole("button", { name: "I’ve picked it up" }));
    expect(await view.findByText("The loan has started.")).toBeTruthy();

    const c5 = await again(view, request.id);
    expect(c5.getByText("You have it · from Alice")).toBeTruthy();
    expect(c5.getByText("Due Nov 24")).toBeTruthy();
    expect(
      c5.getByText("Picked up Tue, Nov 10 · 2 weeks · due Tue, Nov 24"),
    ).toBeTruthy();
  });

  it("takes the owner's Priya has it from C17, and the page reads as C7", async () => {
    await getInjection("IAnswerRequestController")(
      {
        loanId: priyaAskedForNightMarket.id,
        answer: "yes",
        periodDays: 7,
        note: "",
      },
      you.id,
    );
    const view = await withToaster(priyaAskedForNightMarket.id);
    const page = within(view.container);
    expect(
      page.getByText(
        "Use this if Priya picked it up and hasn’t said so. You give the day.",
      ),
    ).toBeTruthy();

    fireEvent.click(page.getByRole("button", { name: "Priya has it" }));
    const sheet = within(await view.findByRole("dialog"));
    expect(sheet.getByText("Picked up on")).toBeTruthy();
    fireEvent.click(sheet.getByRole("button", { name: "Priya has it" }));
    expect(await view.findByText("The loan has started.")).toBeTruthy();

    const c7 = await again(view, priyaAskedForNightMarket.id);
    expect(c7.getByText("Priya has it")).toBeTruthy();
    expect(
      c7.getByText("Picked up Tue, Nov 10 · 1 week · due Tue, Nov 17"),
    ).toBeTruthy();
    expect(c7.getByRole("button", { name: "It’s back with me" })).toBeTruthy();
  });

  it("draws C5 for Sam's Moss & Mortar, and gives it back (I gave it back to Sam)", async () => {
    const view = await withToaster(youHaveMossAndMortar.id);
    const page = within(view.container);
    expect(page.getByText("Due Fri")).toBeTruthy();
    expect(page.getByText("You have it · from Sam")).toBeTruthy();
    expect(
      page.getByText("Picked up Fri, Nov 6 · 1 week · due Fri, Nov 13"),
    ).toBeTruthy();
    expect(
      page.getByText("Sam’s note on this copy: Box corner is split."),
    ).toBeTruthy();
    expect(page.getByText("It’s Sam’s copy")).toBeTruthy();
    expect(page.getByText("Your due date doesn’t change.")).toBeTruthy();
    expect(page.getByText("1st in line")).toBeTruthy();

    fireEvent.click(
      page.getByRole("button", { name: "I gave it back to Sam" }),
    );
    expect(
      await view.findByText("Sam is asked to confirm it’s back."),
    ).toBeTruthy();

    const waiting = await again(view, youHaveMossAndMortar.id);
    expect(waiting.getByText("Waiting for Sam to confirm")).toBeTruthy();
    expect(waiting.getByText("You gave it back Tue, Nov 10")).toBeTruthy();
    expect(waiting.getByText("Gave it back")).toBeTruthy();
  });

  it("draws C7 for your Gull & Anchor, marks it back with a new note, and opens Ben's request next (Yes, it's back)", async () => {
    const view = await withToaster(joHasGullAndAnchor.id);
    const page = within(view.container);
    expect(page.getByText("Overdue")).toBeTruthy();
    expect(page.getByText("Jo has it")).toBeTruthy();
    expect(
      page.getByText("Picked up Mon, Nov 2 · 1 week · due Mon, Nov 9"),
    ).toBeTruthy();
    expect(page.getByText(/^1st in line · asked/)).toBeTruthy();
    expect(
      page
        .getByRole("link", { name: /This copy’s history/ })
        .getAttribute("href"),
    ).toBe(`/copies/${CAST.copies.yourGullAndAnchor.id}`);

    fireEvent.click(page.getByRole("button", { name: "It’s back with me" }));
    const sheet = within(await view.findByRole("dialog"));
    expect(sheet.getByText("Is it back?")).toBeTruthy();
    expect(
      sheet.getByText(
        "Already noted on this copy: One blue anchor token is missing.",
      ),
    ).toBeTruthy();
    fireEvent.change(sheet.getByLabelText(/Anything new missing or damaged/), {
      target: { value: "The lid is torn." },
    });
    fireEvent.click(sheet.getByRole("button", { name: "Yes, it’s back" }));

    expect(
      await view.findByText("Gull & Anchor is back. Ben is next in line."),
    ).toBeTruthy();
    await waitFor(() =>
      expect(nextState.pushed).toContain(
        `/loans/${benAskedForGullAndAnchor.id}`,
      ),
    );
  });

  it("asks Alice whether Ben's return is back, and says not yet (I don't have it yet)", async () => {
    await getInjection("IGiveBackController")(
      { loanId: benHasAlicesHarborLights.id, returnedOn: "2026-11-10" },
      ben.id,
    );
    nextState.userId = alice.id;
    const view = await withToaster(benHasAlicesHarborLights.id);
    const page = within(view.container);
    expect(page.getByText("Is it back?")).toBeTruthy();
    expect(
      page.getByText(/Ben says they gave it back Tue, Nov 10/),
    ).toBeTruthy();

    fireEvent.click(page.getByRole("button", { name: "Answer" }));
    const sheet = within(await view.findByRole("dialog"));
    expect(
      sheet.getByText("The day Ben gave. Change it if that’s wrong."),
    ).toBeTruthy();
    fireEvent.click(sheet.getByRole("button", { name: "I don’t have it yet" }));
    expect(
      await view.findByText("Ben is told it isn’t back yet."),
    ).toBeTruthy();
    const { loan } = await getInjection("IGetLoanController")(
      { loanId: benHasAlicesHarborLights.id },
      alice.id,
    );
    expect(loan.status).toBe("out");
  });
});
