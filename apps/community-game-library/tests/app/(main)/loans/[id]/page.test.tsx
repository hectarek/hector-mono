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
import { NotFoundPage, nextState } from "@/tests/_support/next";

const { you, sam, priya, alice, jo, noor } = CAST.people;
const { samsHarborLights, yourSaltAndSignal } = CAST.copies;
const { youAskedForQuarryLane, priyaAskedForNightMarket } = CAST.loans;

const loanPage = (id: string) => LoanPage({ params: Promise.resolve({ id }) });
const withToaster = async (id: string) =>
  render(
    <>
      {await loanPage(id)}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
const as = (userId: string) => {
  nextState.userId = userId;
};

// Each test works on a request of its own: the container's mocks keep what a test writes.
describe("a loan's page (U12: C16, C2, C17, C3)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, twenty minutes after Priya asked.
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));
    await signInAsYouWithTheCast();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws C16 for your request to Sam, and withdraws it after asking (Withdraw a request)", async () => {
    const view = await withToaster(youAskedForQuarryLane.id);
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Quarry Lane",
    );
    expect(page.getByText("You asked")).toBeTruthy();
    expect(page.getByText("Sam hasn’t answered")).toBeTruthy();
    expect(page.getByText("Asked this morning")).toBeTruthy();
    expect(page.getByText("It’s Sam’s copy")).toBeTruthy();
    expect(
      page
        .getByRole("link", { name: "Call Sam, 555 0142" })
        .getAttribute("href"),
    ).toBe("tel:5550142");
    // C16 keeps "where to pick it up." together on its line.
    expect(
      page.getByText("where to pick it up.").closest("p")?.textContent,
    ).toBe("If Sam says yes, this page shows where to pick it up.");

    fireEvent.click(page.getByRole("button", { name: "Withdraw my request" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(
      dialog.getByText("Withdraw your request for Quarry Lane?"),
    ).toBeTruthy();
    expect(dialog.getByText("Sam is told.")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Keep it" })).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Withdraw it" }));

    expect(await view.findByText("Request withdrawn.")).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toContain("/loans"));
    const { loan } = await getInjection("IGetLoanController")(
      { loanId: youAskedForQuarryLane.id },
      you.id,
    );
    expect(loan.status).toBe("withdrawn");
  });

  it("draws C2 for Priya's request, says yes for 2 weeks, then reads as C17 and cancels (The owner says yes)", async () => {
    const view = await withToaster(priyaAskedForNightMarket.id);
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Priya asked for Night Market",
    );
    expect(page.getByText("Your copy · at home")).toBeTruthy();
    expect(page.getByText("“Can I grab it Friday?”")).toBeTruthy();
    expect(page.getByText("Asked 20 min ago")).toBeTruthy();
    expect(
      page.getByText("Counts from the day Priya picks it up."),
    ).toBeTruthy();

    fireEvent.submit(
      page
        .getByRole("button", { name: "Send answer" })
        .closest("form") as HTMLFormElement,
    );
    expect(await view.findByText("You said yes. Priya is told.")).toBeTruthy();

    // The action's revalidation renders the page again: C17.
    view.unmount();
    const again = await withToaster(priyaAskedForNightMarket.id);
    const c17 = within(again.container);
    expect(c17.getByText("Said yes")).toBeTruthy();
    expect(c17.getByText("Priya hasn’t picked it up yet")).toBeTruthy();
    expect(c17.getByText("You said yes this morning")).toBeTruthy();
    expect(
      c17.getByText("2 weeks from the day Priya picks it up"),
    ).toBeTruthy();
    expect(c17.getByText("to arrange the pick-up")).toBeTruthy();

    fireEvent.click(c17.getByRole("button", { name: "Cancel this loan" }));
    const dialog = within(await again.findByRole("alertdialog"));
    expect(dialog.getByText("Cancel this loan?")).toBeTruthy();
    expect(dialog.getByText("Priya is told.")).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Cancel the loan" }));
    expect(
      await again.findByText("Loan cancelled. Priya is told."),
    ).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toContain("/loans"));
  });

  it("says no with a note, which goes on Alice's notice, and goes on to Loans (The owner says no)", async () => {
    const request = await getInjection("IRequestLoanController")(
      { userGameId: yourSaltAndSignal.id, note: "" },
      alice.id,
    );
    const view = await withToaster(request.id);
    const page = within(view.container);

    fireEvent.click(page.getByRole("radio", { name: "No, not this time" }));
    fireEvent.change(page.getByLabelText(/Note for Alice/), {
      target: { value: "It's at my sister's this month." },
    });
    fireEvent.submit(
      page
        .getByRole("button", { name: "Send answer" })
        .closest("form") as HTMLFormElement,
    );

    expect(await view.findByText("You said no. Alice is told.")).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toContain("/loans"));
    const notices = (await getInjection("IListInboxController")(alice.id)).map(
      ({ notice }) => [notice.type, notice.answerNote],
    );
    expect(notices).toContainEqual([
      "request-declined",
      "It's at my sister's this month.",
    ]);
  });

  it("says yes until a picked date (X1), which C17 then shows", async () => {
    const request = await getInjection("IRequestLoanController")(
      { userGameId: yourSaltAndSignal.id, note: "" },
      jo.id,
    );
    const view = await withToaster(request.id);
    const page = within(view.container);

    fireEvent.click(page.getByRole("radio", { name: "Pick a date" }));
    const sheet = within(await view.findByRole("dialog"));
    fireEvent.click(sheet.getByRole("button", { name: "Fri, Nov 20" }));
    fireEvent.click(sheet.getByRole("button", { name: "Use Fri, Nov 20" }));
    expect(
      await page.findByRole("radio", { name: "Until Fri, Nov 20" }),
    ).toBeTruthy();
    fireEvent.submit(
      page
        .getByRole("button", { name: "Send answer" })
        .closest("form") as HTMLFormElement,
    );
    expect(await view.findByText("You said yes. Jo is told.")).toBeTruthy();

    view.unmount();
    const again = within((await withToaster(request.id)).container);
    expect(again.getByText("Until Fri, Nov 20")).toBeTruthy();
  });

  it("draws C3's top for a yes you haven't picked up, and calls it off (I can't pick it up after all)", async () => {
    const request = await getInjection("IRequestLoanController")(
      { userGameId: samsHarborLights.id, note: "" },
      you.id,
    );
    await getInjection("IAnswerRequestController")(
      { loanId: request.id, answer: "yes", periodDays: 14, note: "" },
      sam.id,
    );
    const view = await withToaster(request.id);
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Pick up Harbor Lights from Sam",
    );
    expect(page.getByText("Sam said yes · yours for 2 weeks")).toBeTruthy();
    fireEvent.click(
      page.getByRole("button", { name: "I can’t pick it up after all" }),
    );
    const dialog = within(await view.findByRole("alertdialog"));
    expect(dialog.getByText("Cancel this loan?")).toBeTruthy();
    expect(
      dialog.getByText(
        "Sam is told, and the game is free for the next person.",
      ),
    ).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Cancel the loan" }));
    expect(await view.findByText("Loan cancelled. Sam is told.")).toBeTruthy();
  });

  it("is Not found for someone who isn't part of the loan, and for an id that isn't one (AE8)", async () => {
    as(noor.id);
    await expect(loanPage(youAskedForQuarryLane.id)).rejects.toThrow(
      NotFoundPage,
    );
    as(priya.id);
    await expect(loanPage("night-market")).rejects.toThrow(NotFoundPage);
  });
});
