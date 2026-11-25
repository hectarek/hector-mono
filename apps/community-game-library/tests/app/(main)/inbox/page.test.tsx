import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { render, waitFor, within } from "@testing-library/react";
import InboxPage from "@/app/(main)/inbox/page";
import { getInjection } from "@/di/container";
import type { NewNotice } from "@/src/entities/models/notice.model";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";

const { you, priya, jo } = CAST.people;
const { priyaAskedForNightMarket, joHasGullAndAnchor } = CAST.loans;

// A row's line as F1 sets it: its words in bold, then the whole line as it reads.
const lineOf = (row: HTMLElement) => {
  const bold = row.querySelector("strong");
  return [
    bold?.textContent,
    bold?.parentElement?.textContent?.replace("Unread. ", ""),
  ];
};

const tell = (notice: NewNotice) =>
  getInjection("ITransactionManagerService").startTransaction((tx) =>
    getInjection("INoticesRepository").add(notice, tx),
  );

describe("the inbox (F1, F2)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws F1: what's new today, each line opening its thing, then marks it read", async () => {
    await signInAsYouWithTheCast();
    await tell({
      userId: you.id,
      type: "more-time-asked",
      createdBy: jo.id,
      loanId: joHasGullAndAnchor.id,
    });
    setSystemTime(new Date("2026-11-10T09:20:00-05:00"));
    await tell({
      userId: you.id,
      type: "loan-requested",
      createdBy: priya.id,
      loanId: priyaAskedForNightMarket.id,
    });
    setSystemTime(new Date("2026-11-10T09:40:00-05:00"));

    const view = render(await InboxPage());
    const page = within(view.container);
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe("Inbox");
    expect(page.getByText("2 unread")).toBeTruthy();
    expect(page.getAllByText("Unread.")).toHaveLength(2);
    expect(page.getByText("Today")).toBeTruthy();

    const rows = page
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("/loans/"));
    expect(rows.map((row) => row.getAttribute("href"))).toEqual([
      `/loans/${priyaAskedForNightMarket.id}`,
      `/loans/${joHasGullAndAnchor.id}`,
    ]);
    const request = within(rows[0] as HTMLElement);
    expect(lineOf(rows[0] as HTMLElement)).toEqual([
      "Priya asked to borrow",
      "Priya asked to borrow Night Market",
    ]);
    expect(request.getByText("“Can I grab it Friday?”")).toBeTruthy();
    expect(request.getByText("20 min ago")).toBeTruthy();
    expect(request.getByText("Requested")).toBeTruthy();
    expect(lineOf(rows[1] as HTMLElement)).toEqual([
      "Jo asked for more time",
      "Jo asked for more time on Gull & Anchor",
    ]);
    expect(
      page
        .getByRole("button", { name: "Choose which notices I get" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/you/notices");

    // It marks them read once it's open.
    await waitFor(async () =>
      expect(
        (await getInjection("IGetTabCountsController")(you.id)).unread,
      ).toBe(0),
    );

    // The action's revalidation refreshes the open page with both read, and what was new stays
    // marked until the member leaves.
    view.rerender(await InboxPage());
    expect(page.getByText("2 unread")).toBeTruthy();
    expect(page.getAllByText("Unread.")).toHaveLength(2);

    // The next visit has nothing new.
    view.unmount();
    const later = within(render(await InboxPage()).container);
    expect(later.getByText("Priya asked to borrow").tagName).toBe("STRONG");
    expect(later.queryByText("2 unread") === null).toBe(true);
    expect(later.queryAllByText("Unread.")).toHaveLength(0);
  });

  it("says Nothing here yet when it's empty (F2)", async () => {
    await signInAsMember();
    const view = render(await InboxPage());
    const page = within(view.container);
    expect(page.getByText("Nothing here yet")).toBeTruthy();
    expect(
      page.getByText("Requests, due dates and game-night news land here."),
    ).toBeTruthy();
  });
});
