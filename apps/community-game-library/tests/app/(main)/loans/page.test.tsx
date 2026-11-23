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

describe("Loans (C4)", () => {
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
    // C4's Record a loan beside the title, and Past loans at the end (U16).
    expect(
      page
        .getByRole("button", { name: "Record a loan" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/loans/record");
    expect(
      page.getByRole("link", { name: /Past loans/ }).getAttribute("href"),
    ).toBe("/loans/past");
    expect(page.getByRole("heading", { name: "Needs you · 2" })).toBeTruthy();
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

  it("lists C4's sections in order: Jo's request for more time and Priya's request, what you borrowed, then the lines you're in (R22)", async () => {
    await signInAsYouWithTheCast();
    const view = render(await LoansPage());
    const page = within(view.container);

    expect(
      page.getAllByRole("heading", { level: 2 }).map((h) => h.textContent),
    ).toEqual(["Needs you · 2", "You borrowed", "In line", "You asked"]);
    // C4's In line: Fenwick Fair opens its game's page, where Leave the line is.
    const inLine = page.getByRole("link", { name: /Fenwick Fair/ });
    expect(inLine.getAttribute("href")).toBe(
      `/games/${CAST.games.fenwickFair.id}`,
    );
    for (const words of ["Priya’s copy", "Out until Nov 24", "1st in line"]) {
      expect(within(inLine).getByText(words)).toBeTruthy();
    }
    const moreTime = page.getByRole("link", { name: /Gull & Anchor/ });
    expect(moreTime.getAttribute("href")).toBe(
      `/loans/${CAST.loans.joHasGullAndAnchor.id}`,
    );
    for (const words of [
      "Jo asked for more time",
      "Ben is 1st in line",
      "Overdue",
    ]) {
      expect(within(moreTime).getByText(words)).toBeTruthy();
    }
    const borrowed = page.getByRole("link", { name: /Moss & Mortar/ });
    expect(borrowed.getAttribute("href")).toBe(
      `/loans/${CAST.loans.youHaveMossAndMortar.id}`,
    );
    for (const words of ["Due Fri", "From Sam", "Jo is 1st in line"]) {
      expect(within(borrowed).getByText(words)).toBeTruthy();
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
    // The empty state offers Record a loan too, as screens.md's Empty lists has it.
    expect(page.getAllByRole("button", { name: "Record a loan" })).toHaveLength(
      2,
    );
  });
});
