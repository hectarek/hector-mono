import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { render, within } from "@testing-library/react";
import LoansPage from "@/app/(main)/loans/page";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";

const { priyaAskedForNightMarket, youAskedForQuarryLane } = CAST.loans;

describe("Loans (C4, U12's sections)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));
  });
  afterEach(() => {
    setSystemTime();
  });

  it("lists Priya's request under Needs you and yours to Sam under You asked, each opening its loan", async () => {
    await signInAsYouWithTheCast();
    const view = render(await LoansPage());
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe("Loans");
    expect(page.getByRole("heading", { name: "Needs you · 1" })).toBeTruthy();
    const request = page.getByRole("link", {
      name: /Priya asked for Night Market/,
    });
    expect(request.getAttribute("href")).toBe(
      `/loans/${priyaAskedForNightMarket.id}`,
    );
    expect(within(request).getByText("“Can I grab it Friday?”")).toBeTruthy();
    expect(within(request).getByText("Requested")).toBeTruthy();

    expect(page.getByRole("heading", { name: "You asked" })).toBeTruthy();
    const asked = page.getByRole("link", { name: /Quarry Lane/ });
    expect(asked.getAttribute("href")).toBe(
      `/loans/${youAskedForQuarryLane.id}`,
    );
    for (const words of [
      "Sam hasn’t answered",
      "Asked this morning",
      "You asked",
    ]) {
      expect(within(asked).getByText(words)).toBeTruthy();
    }
  });

  it("says No loans for a member with none (Empty lists)", async () => {
    await signInAsMember();
    const view = render(await LoansPage());
    const page = within(view.container);
    expect(page.getByText("No loans")).toBeTruthy();
    expect(
      page.getByText(
        "Borrow a game from the Library, or record one you lent in person.",
      ),
    ).toBeTruthy();
  });
});
