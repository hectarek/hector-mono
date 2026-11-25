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
import PassAlongPage from "@/app/(main)/loans/[id]/pass-along/page";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

const { jo } = CAST.people;
const { yourGullAndAnchor } = CAST.copies;
const { youHaveMossAndMortar, joAskedForMossAndMortar, joHasGullAndAnchor } =
  CAST.loans;

const withToaster = async (page: Promise<React.ReactNode>) =>
  render(
    <>
      {await page}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
const loanPage = (id: string) =>
  withToaster(LoanPage({ params: Promise.resolve({ id }) }));

// The tests share the container's rows, in order: the first takes its pass-along back, and the
// last two change the cast for good.
describe("lines and passing it along on a loan's pages (U15: C5, C7, C11)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));
    await signInAsYouWithTheCast();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("hands Sam's Moss & Mortar to Jo from C11, waits for Jo, and takes it back with I still have it", async () => {
    const c5 = await loanPage(youHaveMossAndMortar.id);
    expect(
      c5.getByText(
        "Pass-along is on: when you’re done, hand it straight to Jo. Sam is told who has it, and Jo’s week starts when they confirm.",
      ),
    ).toBeTruthy();
    expect(
      c5
        .getByRole("button", { name: "Hand it to Jo" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe(`/loans/${youHaveMossAndMortar.id}/pass-along`);
    c5.unmount();

    const c11 = await withToaster(
      PassAlongPage({
        params: Promise.resolve({ id: youHaveMossAndMortar.id }),
      }),
    );
    expect(c11.getByRole("heading", { level: 1 }).textContent).toBe(
      "Hand it to Jo",
    );
    for (const words of [
      "Sam’s copy",
      "You have it",
      "Jo is next",
      "Arrange it with Jo",
      "Give Jo the game",
      "Jo confirms they have it",
      "Your loan ends then. Jo’s starts that day and runs 1 week, the same as yours.",
      "Jo is asked to confirm. The loan stays yours until Jo does, and then Sam is told.",
    ]) {
      expect(c11.getByText(words)).toBeTruthy();
    }
    // C11's three steps are a numbered list, the phone under the first.
    const steps = c11
      .getByRole("heading", { name: "Three steps" })
      .closest("section") as HTMLElement;
    expect(steps.querySelector("ol")).toBeTruthy();
    const [arrange] = within(steps).getAllByRole("listitem");
    expect(within(steps).getAllByRole("listitem")).toHaveLength(3);
    expect(
      within(arrange as HTMLElement).getByRole("link", {
        name: "Call Jo, 555 0117",
      }),
    ).toBeTruthy();
    fireEvent.click(c11.getByRole("button", { name: "I gave it to Jo" }));
    expect(await c11.findByText("Jo is asked to confirm.")).toBeTruthy();
    expect(nextState.pushed).toEqual([`/loans/${youHaveMossAndMortar.id}`]);
    c11.unmount();

    const waiting = await loanPage(youHaveMossAndMortar.id);
    expect(waiting.getByText("Waiting for Jo to confirm")).toBeTruthy();
    expect(waiting.getByText("You gave it to Jo")).toBeTruthy();
    expect(waiting.getByText("Handed on")).toBeTruthy();
    expect(waiting.getByText("Getting it from you")).toBeTruthy();
    fireEvent.click(waiting.getByRole("button", { name: "I still have it" }));
    expect(
      await waiting.findByText("You still have it. Jo is told."),
    ).toBeTruthy();
    waiting.unmount();

    const back = await loanPage(youHaveMossAndMortar.id);
    expect(back.getByText("You have it · from Sam")).toBeTruthy();
    expect(back.getByRole("button", { name: "Hand it to Jo" })).toBeTruthy();
  });

  it("shows Jo the handoff from Robin, and I have it starts Jo's week that day", async () => {
    const c11 = await withToaster(
      PassAlongPage({
        params: Promise.resolve({ id: youHaveMossAndMortar.id }),
      }),
    );
    fireEvent.click(c11.getByRole("button", { name: "I gave it to Jo" }));
    // The first test's message may still be showing, so this waits for the move's way back.
    await waitFor(() =>
      expect(nextState.pushed).toEqual([`/loans/${youHaveMossAndMortar.id}`]),
    );
    c11.unmount();

    nextState.userId = jo.id;
    const handed = await loanPage(joAskedForMossAndMortar.id);
    expect(handed.getByRole("heading", { level: 1 }).textContent).toBe(
      "Get Moss & Mortar from Robin Vale",
    );
    expect(
      handed.getByText("Robin Vale is handing it to you · yours for 1 week"),
    ).toBeTruthy();
    expect(
      handed.getByRole("link", { name: "Call Robin Vale, 555 0199" }),
    ).toBeTruthy();
    expect(
      handed.getByRole("button", { name: "Handed to you on" }).textContent,
    ).toBe("Today, Tue, Nov 10");
    expect(
      handed.getByText("If you get it today, it’s due Tue, Nov 17."),
    ).toBeTruthy();
    fireEvent.click(handed.getByRole("button", { name: "I have it" }));
    expect(await handed.findByText("The loan has started.")).toBeTruthy();
    handed.unmount();

    const jos = await loanPage(joAskedForMossAndMortar.id);
    expect(jos.getByText("You have it · from Sam")).toBeTruthy();
    expect(
      jos.getByText("Picked up Tue, Nov 10 · 1 week · due Tue, Nov 17"),
    ).toBeTruthy();
  });

  it("AE10: with pass-along off, C7 and C5 say Jo returns it first, and you take Ben out of the line after asking", async () => {
    const c7 = await loanPage(joHasGullAndAnchor.id);
    const line = within(
      c7
        .getByRole("heading", { name: "The line" })
        .closest("section") as HTMLElement,
    );
    expect(line.getByText(/^1st in line · asked/)).toBeTruthy();
    expect(
      c7.getByText(
        "Pass-along is off: Jo returns it to you, then you answer Ben.",
      ),
    ).toBeTruthy();
    // C7's quiet link, drawn as a button (Base UI gives it the role).
    expect(
      c7
        .getByRole("button", { name: "Change it on this copy’s page" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe(`/copies/${yourGullAndAnchor.id}`);
    c7.unmount();

    nextState.userId = jo.id;
    const c5 = await loanPage(joHasGullAndAnchor.id);
    expect(
      c5.getByText(
        "Pass-along is off: when you’re done, give it back to Robin Vale, who answers Ben next.",
      ),
    ).toBeTruthy();
    expect(c5.queryByRole("button", { name: /Hand it to/ })).toBeNull();
    c5.unmount();

    nextState.userId = CAST.people.you.id;
    const owner = await loanPage(joHasGullAndAnchor.id);
    fireEvent.click(owner.getByRole("button", { name: "Remove from line" }));
    const dialog = within(await owner.findByRole("alertdialog"));
    expect(dialog.getByText("Take Ben out of the line?")).toBeTruthy();
    expect(dialog.getByText("Ben is told. A note is optional.")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Keep Ben" })).toBeTruthy();
    fireEvent.change(dialog.getByLabelText(/Note for Ben/), {
      target: { value: "Jo needs it a while longer." },
    });
    fireEvent.click(dialog.getByRole("button", { name: "Remove Ben" }));
    expect(
      await owner.findByText("Ben is out of the line. Ben is told."),
    ).toBeTruthy();
    owner.unmount();

    const after = await loanPage(joHasGullAndAnchor.id);
    expect(after.queryByRole("heading", { name: "The line" })).toBeNull();
  });
});
