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
const again = async (view: ReturnType<typeof render>, id: string) => {
  view.unmount();
  return within((await withToaster(id)).container);
};

describe("more time and the due date (U14: C6, C13, C14)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("asks Sam for 1 more week on Moss & Mortar (Ask for more time)", async () => {
    nextState.userId = you.id;
    const view = await withToaster(youHaveMossAndMortar.id);
    fireEvent.click(
      within(view.container).getByRole("button", { name: "Ask for more time" }),
    );
    const sheet = within(await view.findByRole("dialog"));
    expect(sheet.getByText("Due Fri, Nov 13")).toBeTruthy();
    expect(sheet.getByText("How much longer?")).toBeTruthy();
    expect(sheet.getByText("Mon, Nov 16")).toBeTruthy();
    expect(sheet.getByText("Fri, Nov 20")).toBeTruthy();
    expect(sheet.getByText("Jo is in line, so Sam may say no.")).toBeTruthy();
    fireEvent.change(sheet.getByLabelText(/Note for Sam/), {
      target: { value: "One more session to finish the campaign." },
    });
    fireEvent.click(sheet.getByRole("button", { name: "Ask Sam" }));
    expect(await view.findByText("Sam is asked for more time.")).toBeTruthy();

    const c5 = await again(view, youHaveMossAndMortar.id);
    expect(c5.getByText("You asked for 1 more week")).toBeTruthy();
    expect(c5.getByText("Sam hasn’t answered")).toBeTruthy();
    expect(c5.queryByRole("button", { name: "Ask for more time" })).toBeNull();
  });

  it("answers Jo's request for more time with yes, which moves the due date (Answer a request for more time)", async () => {
    nextState.userId = you.id;
    const view = await withToaster(joHasGullAndAnchor.id);
    const page = within(view.container);
    expect(page.getByText("Jo asked for more time")).toBeTruthy();
    expect(page.getByText("Until Fri, Nov 13")).toBeTruthy();
    expect(page.getByText("“Out of town until Thursday.”")).toBeTruthy();

    fireEvent.click(page.getByRole("button", { name: "Answer" }));
    const sheet = within(await view.findByRole("dialog"));
    expect(sheet.getByText("Due Mon, Nov 9 · 1 day overdue")).toBeTruthy();
    expect(
      sheet.getByText("Ben is 1st in line and waits longer if you say yes."),
    ).toBeTruthy();
    expect(sheet.getByText("What Jo asked for")).toBeTruthy();
    expect(
      sheet.getByRole("radio", { name: "No, it stays due Mon, Nov 9" }),
    ).toBeTruthy();
    fireEvent.click(sheet.getByRole("button", { name: "Send answer" }));
    expect(await view.findByText("Jo is told.")).toBeTruthy();

    const c7 = await again(view, joHasGullAndAnchor.id);
    expect(c7.queryByText("Jo asked for more time")).toBeNull();
    expect(c7.getByText("Picked up Mon, Nov 2 · due Fri, Nov 13")).toBeTruthy();
  });

  it("changes the due date of Sam's Moss & Mortar as Sam (Change the due date)", async () => {
    nextState.userId = sam.id;
    const view = await withToaster(youHaveMossAndMortar.id);
    fireEvent.click(
      within(view.container).getByRole("button", {
        name: "Change the due date",
      }),
    );
    const sheet = within(await view.findByRole("dialog"));
    expect(sheet.getByText("New due date")).toBeTruthy();
    expect(sheet.getByText("Jo is 1st in line and waits longer.")).toBeTruthy();
    expect(sheet.getByText(`${you.name} is told the new date.`)).toBeTruthy();
    fireEvent.click(sheet.getByRole("radio", { name: /3 more days/ }));
    fireEvent.click(sheet.getByRole("button", { name: "Change the due date" }));
    expect(
      await view.findByText(
        `${you.name} is told the new date.`, // The toast's title: the sheet said the same before it closed.
        { selector: "[data-title]" },
      ),
    ).toBeTruthy();

    const c7 = await again(view, youHaveMossAndMortar.id);
    expect(c7.getByText("Picked up Fri, Nov 6 · due Mon, Nov 16")).toBeTruthy();
  });
});
