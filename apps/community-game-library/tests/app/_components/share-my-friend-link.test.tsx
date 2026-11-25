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
import { Activity } from "react";
import {
  FriendLinkOnArrival,
  ShareMyFriendLink,
} from "@/app/_components/share-my-friend-link";
import { APP_TOASTER } from "@/app/_lib/notify";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

const { you } = CAST.people;

// happy-dom's own handle on its window: the screen's width, and the address the page is at.
const { happyDOM } = window as unknown as {
  happyDOM: {
    setInnerWidth: (width: number) => void;
    setURL: (url: string) => void;
  };
};
const width = window.innerWidth;
const startURL = window.location.href;

// What the browser was asked to copy.
let copied: string[];

const tokenOf = async () =>
  (await getInjection("IFriendLinksRepository").getByUserId(you.id))?.token;

// The button as a page shows it, or the sheet Friends opens as it arrives, in React's Activity
// as Next.js keeps a page, with the toaster.
function Page({
  arriving = false,
  mode = "visible",
}: {
  arriving?: boolean;
  mode?: "visible" | "hidden";
}) {
  return (
    <>
      <Activity mode={mode}>
        {arriving ? <FriendLinkOnArrival /> : <ShareMyFriendLink />}
      </Activity>
      <Toaster id={APP_TOASTER} theme="light" />
    </>
  );
}

async function openSheet(view: ReturnType<typeof render>) {
  fireEvent.click(view.getByRole("button", { name: "Share my friend link" }));
  return within(await view.findByRole("dialog", { name: "Your friend link" }));
}

// The link's address, once it has come.
const addressIn = async (sheet: ReturnType<typeof within>) =>
  (await sheet.findByText(/^communitygamelibrary\.com\/f\//)).textContent;

describe("Your friend link (E2), a sheet over the page you're on", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    happyDOM.setURL("https://communitygamelibrary.com/friends");
    copied = [];
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          copied.push(text);
        },
      },
    });
  });
  afterEach(() => {
    setSystemTime();
    happyDOM.setInnerWidth(width);
    happyDOM.setURL(startURL);
  });

  it("draws E2 once the link comes: its address on this site, Share and Copy, and a week to use it", async () => {
    const view = render(<Page />);
    const sheet = await openSheet(view);

    expect(await addressIn(sheet)).toBe(
      `communitygamelibrary.com/f/${await tokenOf()}`,
    );
    // Share is the sheet's main action, so it's the filled one (Button's variant class).
    expect(
      sheet
        .getByRole("button", { name: "Share" })
        .classList.contains("bg-primary"),
    ).toBe(true);
    expect(
      sheet
        .getByRole("button", { name: "Copy" })
        .classList.contains("bg-secondary"),
    ).toBe(true);
    expect(sheet.getByText("Works until Tue, Nov 17")).toBeTruthy();
    expect(
      sheet.getByText(
        "Anyone who opens it and signs in becomes your friend at once, so share it only with people you’d lend a game to.",
      ),
    ).toBeTruthy();
    expect(sheet.getByRole("button", { name: "Make a new link" })).toBeTruthy();
    expect(
      sheet.getByText("The link you already shared stops working."),
    ).toBeTruthy();
  });

  it("copies the link alone, and says so", async () => {
    const view = render(<Page />);
    const sheet = await openSheet(view);
    await addressIn(sheet);

    fireEvent.click(sheet.getByRole("button", { name: "Copy" }));
    expect(await view.findByText("Link copied")).toBeTruthy();
    expect(copied).toEqual([
      `https://communitygamelibrary.com/f/${await tokenOf()}`,
    ]);
  });

  // On a phone the sheet is the drawer, and the dialog asks over it.
  it("asks first, then shows the new link, which ends the old one", async () => {
    happyDOM.setInnerWidth(390);
    const view = render(<Page />);
    const sheet = await openSheet(view);
    expect(document.querySelector("[data-slot=drawer-popup]")).toBeTruthy();
    await addressIn(sheet);
    const links = getInjection("IFriendLinksRepository");
    const before = await tokenOf();

    fireEvent.click(sheet.getByRole("button", { name: "Make a new link" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(dialog.getByText("Make a new link?")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Keep this one" })).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Make a new link" }));

    expect(
      await view.findByText("New link made. The old one no longer works."),
    ).toBeTruthy();
    await waitFor(() =>
      expect(view.queryByRole("alertdialog") === null).toBe(true),
    );
    const after = await tokenOf();
    expect(after).not.toBe(before);
    expect(before && (await links.getByToken(before))).toBe(undefined);
    const still = within(
      view.getByRole("dialog", { name: "Your friend link" }),
    );
    expect(
      await still.findByText(`communitygamelibrary.com/f/${after}`),
    ).toBeTruthy();
  });

  it("says what went wrong when the link can't be read", async () => {
    const view = render(<Page />);
    nextState.userId = undefined;
    const sheet = await openSheet(view);

    expect((await sheet.findByRole("alert")).textContent).toBe(
      "Your session expired. Sign in again.",
    );
  });

  // /friends/link, from before the sheet, opens Friends with it open: once, so it stays closed
  // when the member comes back to the page Next.js kept.
  it("opens as the page arrives, and only then", async () => {
    const view = render(<Page arriving />);
    const sheet = within(
      await view.findByRole("dialog", { name: "Your friend link" }),
    );
    expect(await addressIn(sheet)).toBe(
      `communitygamelibrary.com/f/${await tokenOf()}`,
    );

    fireEvent.click(sheet.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(view.queryByRole("dialog") === null).toBe(true));
    view.rerender(<Page arriving mode="hidden" />);
    view.rerender(<Page arriving mode="visible" />);
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(view.queryByRole("dialog") === null).toBe(true);
  });

  // So a reload, Back once Next.js has let the page go, or the installed app reopening there
  // doesn't open it again: the address becomes Friends' own, in place, with no new history entry.
  it("takes ?show=friend-link out of the address once it's open", async () => {
    happyDOM.setURL(
      "https://communitygamelibrary.com/friends?show=friend-link",
    );
    const entries = window.history.length;
    const view = render(<Page arriving />);
    expect(
      await view.findByRole("dialog", { name: "Your friend link" }),
    ).toBeTruthy();

    await waitFor(() =>
      expect(window.location.href).toBe(
        "https://communitygamelibrary.com/friends",
      ),
    );
    expect(window.history.length).toBe(entries);
    expect(view.getByRole("dialog", { name: "Your friend link" })).toBeTruthy();
  });
});
