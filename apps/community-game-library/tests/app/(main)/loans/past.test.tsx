import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { render, within } from "@testing-library/react";
import PastLoansPage from "@/app/(main)/loans/past/page";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";

const pastLoans = async (show?: string) =>
  within(
    render(
      await PastLoansPage({
        searchParams: Promise.resolve(show ? { show } : {}),
      }),
    ).container,
  );
// Each row by its game, and the words in it.
const row = (page: Awaited<ReturnType<typeof pastLoans>>, title: string) => {
  const item = page
    .getAllByRole("listitem")
    .find((li) => li.textContent?.startsWith(title));
  if (!item) {
    throw new Error(`No row for ${title}`);
  }
  return within(item);
};

describe("Past loans (U16: C12)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws C12: what you borrowed, newest first, with Fenwick Fair 3 days late", async () => {
    await signInAsYouWithTheCast();
    const page = await pastLoans();
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Past loans",
    );
    const borrowed = page.getByRole("button", { name: "You borrowed" });
    expect(borrowed.getAttribute("aria-pressed")).toBe("true");
    expect(
      page
        .getByRole("button", { name: "You lent" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/loans/past?show=lent");
    expect(page.getByText("3 loans, newest first")).toBeTruthy();
    const titles = ["Harbor Lights", "Tin Kettle Derby", "Fenwick Fair"];
    expect(
      page
        .getAllByRole("listitem")
        .map((li) => titles.find((title) => li.textContent?.startsWith(title))),
    ).toEqual(titles);
    const harbor = row(page, "Harbor Lights");
    expect(harbor.getByText("From Sam")).toBeTruthy();
    expect(harbor.getByText("Oct 14 to Oct 28")).toBeTruthy();
    expect(harbor.queryByText(/late/)).toBeNull();
    const fenwick = row(page, "Fenwick Fair");
    expect(fenwick.getByText("Aug 2 to Aug 30")).toBeTruthy();
    expect(fenwick.getByText("3 days late")).toBeTruthy();
  });

  it("shows what you lent with ?show=lent", async () => {
    await signInAsYouWithTheCast();
    const page = await pastLoans("lent");
    expect(
      page
        .getByRole("button", { name: "You lent" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(page.getByText("2 loans, newest first")).toBeTruthy();
    expect(row(page, "Gull & Anchor").getByText("To Priya")).toBeTruthy();
  });

  it("says Nothing borrowed or lent yet for a member with none", async () => {
    await signInAsMember();
    const page = await pastLoans();
    expect(page.getByText("Nothing borrowed or lent yet.")).toBeTruthy();
  });
});
