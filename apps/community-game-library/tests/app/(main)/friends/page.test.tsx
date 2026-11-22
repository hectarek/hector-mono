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
import FriendsPage from "@/app/(main)/friends/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

const { you, noor } = CAST.people;

const withToaster = (page: React.ReactNode) =>
  render(
    <>
      {page}
      <Toaster id={APP_TOASTER} theme="light" />
    </>,
  );
// A row on Friends: the list item that holds a person's name, once the page has rendered it (a
// render can suspend for a moment on a busy machine).
const rowOf = async (view: ReturnType<typeof render>, name: string) => {
  const row = (await within(view.container).findByText(name)).closest("li");
  if (!row) throw new Error(`No row for ${name}`);
  return within(row as HTMLElement);
};

describe("Friends (E1)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws E1: Mei asking, your link, Dev asked, your five friends, and Noor", async () => {
    const view = render(await FriendsPage());
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe("Friends");
    const text = view.container.textContent ?? "";
    const order = [
      "Wants to be your friend · 1",
      "Mei isn’t told if you decline.",
      "Bring in the rest of your group",
      "Requests you sent · 1",
      "Your friends · 5",
      "People you may know",
      "They get a request to accept.",
      "Looking for someone else? Send them your friend link.",
    ];
    expect(order.map((line) => text.indexOf(line))).toEqual(
      [...order.map((line) => text.indexOf(line))].sort((a, b) => a - b),
    );
    expect(order.every((line) => text.includes(line))).toBe(true);

    const mei = await rowOf(view, "Mei");
    expect(mei.getByText("Friend of Alice")).toBeTruthy();
    expect(mei.getByRole("button", { name: "Accept" })).toBeTruthy();
    expect(mei.getByRole("button", { name: "Decline" })).toBeTruthy();
    const dev = await rowOf(view, "Dev");
    expect(dev.getByText("You asked")).toBeTruthy();
    expect(dev.getByRole("button", { name: "Cancel request" })).toBeTruthy();
    expect(
      (await rowOf(view, "Noor")).getByRole("button", { name: "Add friend" }),
    ).toBeTruthy();

    const friends: (string | null)[][] = [];
    for (const name of ["Alice", "Ben", "Jo", "Priya", "Sam"]) {
      friends.push([
        name,
        (await rowOf(view, name)).getByText(/games?$|^No games yet$/)
          .textContent,
        page
          .getByRole("link", { name: new RegExp(`^${name}`) })
          .getAttribute("href"),
      ]);
    }
    expect(friends).toEqual([
      ["Alice", "2 games", `/friends/${CAST.people.alice.id}`],
      ["Ben", "No games yet", `/friends/${CAST.people.ben.id}`],
      ["Jo", "1 game", `/friends/${CAST.people.jo.id}`],
      ["Priya", "1 game", `/friends/${CAST.people.priya.id}`],
      ["Sam", "3 games", `/friends/${CAST.people.sam.id}`],
    ]);
    expect(
      page
        .getByRole("button", { name: "Share my friend link" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/friends/link");
  });

  it("adds Noor, then cancels the request", async () => {
    const view = withToaster(await FriendsPage());
    fireEvent.click(
      (await rowOf(view, "Noor")).getByRole("button", { name: "Add friend" }),
    );
    expect(await view.findByText("Request sent to Noor.")).toBeTruthy();
    const request = await getInjection("IFriendRequestsRepository").getBetween(
      you.id,
      noor.id,
    );
    expect(request?.createdBy).toBe(you.id);

    const again = render(await FriendsPage());
    fireEvent.click(
      (await rowOf(again, "Noor")).getByRole("button", {
        name: "Cancel request",
      }),
    );
    expect(await again.findByText("Request to Noor cancelled.")).toBeTruthy();
    expect(
      await getInjection("IFriendRequestsRepository").getBetween(
        you.id,
        noor.id,
      ),
    ).toBe(undefined);
  });

  it("declines Mei without telling her, and accepts Noor", async () => {
    const view = withToaster(await FriendsPage());
    fireEvent.click(
      (await rowOf(view, "Mei")).getByRole("button", { name: "Decline" }),
    );
    expect(await view.findByText("Declined. Mei isn’t told.")).toBeTruthy();
    expect(
      within(render(await FriendsPage()).container).queryByText(
        "Wants to be your friend · 1",
      ),
    ).toBe(null);

    await getInjection("ISendFriendRequestController")(
      { recipientUserId: you.id },
      noor.id,
    );
    const asked = render(await FriendsPage());
    fireEvent.click(
      (await rowOf(asked, "Noor")).getByRole("button", { name: "Accept" }),
    );
    expect(await asked.findByText("You and Noor are friends.")).toBeTruthy();
    expect(
      await getInjection("IFriendshipsRepository").areFriends(you.id, noor.id),
    ).toBe(true);
  });
});

describe("Friends before any friends", () => {
  it("says No friends yet, with your friend link", async () => {
    await signInAsMember();
    nextState.pushed = [];
    const view = render(await FriendsPage());
    const page = within(view.container);
    expect(page.getByText("No friends yet")).toBeTruthy();
    expect(
      page
        .getByRole("button", { name: "Share my friend link" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/friends/link");
    expect(page.queryByText(/Your friends/)).toBe(null);
  });
});
