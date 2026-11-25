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
import FriendsPage from "@/app/(main)/friends/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

const { you, noor } = CAST.people;

// happy-dom's own handle on its window, to put the page at an address.
const { happyDOM } = window as unknown as {
  happyDOM: { setURL: (url: string) => void };
};

// Friends at its address: ?show=friend-link is where /friends/link sends.
const friendsPage = (show?: string) =>
  FriendsPage({ searchParams: Promise.resolve(show ? { show } : {}) });

// Your friend link's sheet, once it's open.
const friendLinkSheet = async (view: ReturnType<typeof render>) =>
  within(await view.findByRole("dialog", { name: "Your friend link" }));

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
    const view = render(await friendsPage());
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
      page.getByRole("button", { name: "Share my friend link" }),
    ).toBeTruthy();
  });

  // E2 opens over Friends, the link read as it opens; happy-dom's page is at localhost:3000.
  it("opens your friend link as a sheet over Friends (E2)", async () => {
    const view = render(await friendsPage());
    fireEvent.click(
      within(view.container).getByRole("button", {
        name: "Share my friend link",
      }),
    );
    const sheet = await friendLinkSheet(view);
    const address = await sheet.findByText(/^localhost:3000\/f\//);
    const link = await getInjection("IFriendLinksRepository").getByUserId(
      you.id,
    );
    expect(address.textContent).toBe(`localhost:3000/f/${link?.token}`);
    expect(sheet.getByRole("button", { name: "Share" })).toBeTruthy();
    expect(sheet.getByRole("button", { name: "Copy" })).toBeTruthy();
  });

  it("opens the sheet as the page arrives at ?show=friend-link, where /friends/link sends, then drops it from the address", async () => {
    const start = window.location.href;
    happyDOM.setURL("http://localhost:3000/friends?show=friend-link");
    const view = render(await friendsPage("friend-link"));
    const sheet = await friendLinkSheet(view);
    expect(await sheet.findByText(/^localhost:3000\/f\//)).toBeTruthy();
    // Friends is behind it, out of reach while the sheet is open.
    expect(
      within(view.container).getByRole("heading", { level: 1, hidden: true })
        .textContent,
    ).toBe("Friends");
    // Only this arrival opens it: a reload of the address it leaves shows Friends alone.
    await waitFor(() =>
      expect(window.location.href).toBe("http://localhost:3000/friends"),
    );
    happyDOM.setURL(start);
  });

  it("adds Noor, then cancels the request", async () => {
    const view = withToaster(await friendsPage());
    fireEvent.click(
      (await rowOf(view, "Noor")).getByRole("button", { name: "Add friend" }),
    );
    expect(await view.findByText("Request sent to Noor.")).toBeTruthy();
    const request = await getInjection("IFriendRequestsRepository").getBetween(
      you.id,
      noor.id,
    );
    expect(request?.createdBy).toBe(you.id);

    // A fresh render, with its own toaster: the first one's pending work can keep a second
    // render from committing in happy-dom.
    view.unmount();
    const again = withToaster(await friendsPage());
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
    const view = withToaster(await friendsPage());
    fireEvent.click(
      (await rowOf(view, "Mei")).getByRole("button", { name: "Decline" }),
    );
    expect(await view.findByText("Declined. Mei isn’t told.")).toBeTruthy();
    expect(
      within(render(await friendsPage()).container).queryByText(
        "Wants to be your friend · 1",
      ),
    ).toBe(null);

    await getInjection("ISendFriendRequestController")(
      { recipientUserId: you.id },
      noor.id,
    );
    const asked = render(await friendsPage());
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
    const view = render(await friendsPage());
    const page = within(view.container);
    expect(page.getByText("No friends yet")).toBeTruthy();
    expect(page.queryByText(/Your friends/)).toBe(null);
    // A member with no link yet gets one as the sheet opens.
    fireEvent.click(page.getByRole("button", { name: "Share my friend link" }));
    const sheet = await friendLinkSheet(view);
    expect(await sheet.findByText(/^localhost:3000\/f\//)).toBeTruthy();
  });

  // Arriving from /friends/link, then making a friend: No friends yet turns into the box with the
  // button under the sheet, and the sheet doesn't open again.
  it("opens the sheet once as the page arrives, however the page changes after", async () => {
    const friendId = await signInAsMember();
    const memberId = await signInAsMember();
    const view = render(await friendsPage("friend-link"));
    const sheet = await friendLinkSheet(view);
    fireEvent.click(sheet.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(view.queryByRole("dialog") === null).toBe(true));

    await getInjection("IFriendshipsRepository").add({
      userId: memberId,
      friendUserId: friendId,
    });
    view.rerender(await friendsPage("friend-link"));
    expect(
      await within(view.container).findByText(
        "Bring in the rest of your group",
      ),
    ).toBeTruthy();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(view.queryByRole("dialog") === null).toBe(true);
  });
});
