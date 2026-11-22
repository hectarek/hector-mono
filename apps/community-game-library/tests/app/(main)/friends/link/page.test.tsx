import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { Toaster } from "@repo/ui/components/sonner";
import { fireEvent, render, within } from "@testing-library/react";

// The host the request came to; headers() works only inside a request.
mock.module("next/headers", () => ({
  headers: async () => new Headers({ host: "communitygamelibrary.com" }),
}));

const { APP_TOASTER } = await import("@/app/_lib/notify");
const { default: FriendLinkPage } = await import(
  "@/app/(main)/friends/link/page"
);
const { getInjection } = await import("@/di/container");
const { CAST } = await import("@/tests/_support/cast");
const { signInAsYouWithTheCast } = await import("@/tests/_support/members");

const { you } = CAST.people;

describe("your friend link (E2)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws E2: the link on this site, Share and Copy, and a week to use it", async () => {
    const view = render(await FriendLinkPage());
    const page = within(view.container);
    const link = await getInjection("IFriendLinksRepository").getByUserId(
      you.id,
    );

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Your friend link",
    );
    expect(
      page.getByText(`communitygamelibrary.com/f/${link?.token}`),
    ).toBeTruthy();
    expect(page.getByRole("button", { name: "Share" })).toBeTruthy();
    expect(page.getByRole("button", { name: "Copy" })).toBeTruthy();
    expect(page.getByText("Works until Tue, Nov 17")).toBeTruthy();
    expect(
      page.getByText(
        "Anyone who opens it and signs in becomes your friend at once, so share it only with people you’d lend a game to.",
      ),
    ).toBeTruthy();
    expect(
      page.getByText("The link you already shared stops working."),
    ).toBeTruthy();
  });

  it("asks first, then makes a new link that ends the old one", async () => {
    const view = render(
      <>
        {await FriendLinkPage()}
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    const links = getInjection("IFriendLinksRepository");
    const before = (await links.getByUserId(you.id))?.token;

    fireEvent.click(view.getByRole("button", { name: "Make a new link" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(dialog.getByText("Make a new link?")).toBeTruthy();
    expect(dialog.getByRole("button", { name: "Keep this one" })).toBeTruthy();
    fireEvent.click(dialog.getByRole("button", { name: "Make a new link" }));

    expect(
      await view.findByText("New link made. The old one no longer works."),
    ).toBeTruthy();
    const after = (await links.getByUserId(you.id))?.token;
    expect(after).not.toBe(before);
    expect(before && (await links.getByToken(before))).toBe(undefined);
  });
});
