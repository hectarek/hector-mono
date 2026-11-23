import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { fireEvent, render, waitFor, within } from "@testing-library/react";
import { DeleteAccount } from "@/app/(main)/you/delete/delete-account";
import DeleteAccountPage from "@/app/(main)/you/delete/page";
import { getInjection } from "@/di/container";
import { MockAuthService } from "@/src/infrastructure/services/mock-auth.service";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";
import { nextState } from "@/tests/_support/next";

const { youHaveMossAndMortar, joHasGullAndAnchor } = CAST.loans;

describe("Delete my account (U22: E8, E9)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
  });
  afterEach(() => {
    setSystemTime();
  });

  it("lists the loans to settle first, with Delete my account switched off, and what else ends (E8)", async () => {
    await signInAsYouWithTheCast();
    const view = render(await DeleteAccountPage());
    const page = within(view.container);
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Delete my account",
    );
    expect(page.getByText("Settle your loans first")).toBeTruthy();
    expect(page.getByText("Open loans · 2")).toBeTruthy();
    const [loans, ends] = page.getAllByRole("list");
    if (!loans || !ends) {
      throw new Error("E8 has its two lists");
    }
    const rows = within(loans).getAllByRole("link");
    expect(rows.map((row) => row.textContent)).toEqual([
      "Moss & MortarYou have itDue Fri, Nov 13Due Fri",
      "Gull & AnchorJo has itOverdue",
    ]);
    expect(rows.map((row) => row.getAttribute("href"))).toEqual([
      `/loans/${youHaveMossAndMortar.id}`,
      `/loans/${joHasGullAndAnchor.id}`,
    ]);
    expect(
      within(ends)
        .getAllByRole("listitem")
        .map((item) => item.textContent),
    ).toEqual([
      "Heavy games at mine, Fri, Nov 20: cancelled, and everyone is told",
      "Your request for Quarry Lane",
      "Your place in line for Fenwick Fair",
      "Priya’s request for Night Market",
      "Ben’s place in line for Gull & Anchor",
    ]);
    expect(
      page.getByText(
        "When you delete it, your 4 games leave your friends’ libraries with you, and your friends stop seeing you. This can’t be undone.",
      ),
    ).toBeTruthy();
    expect(
      page
        .getByRole("button", { name: "Delete my account" })
        .hasAttribute("disabled"),
    ).toBe(true);
  });

  it("names in E9's dialog what leaves, each night cancelled, and the requests that end", async () => {
    const view = render(
      <DeleteAccount
        settled
        games={4}
        nights={[{ id: "night-1", title: "Heavy games at mine" }]}
        asked
      />,
    );
    fireEvent.click(view.getByRole("button", { name: "Delete my account" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(dialog.getByText("Delete your account?")).toBeTruthy();
    expect(
      dialog.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual([
      "Your 4 games leave your friends’ libraries.",
      "Heavy games at mine is cancelled and everyone is told.",
      "Your requests and your places in line end.",
      "This can’t be undone.",
    ]);
    expect(
      dialog.getByRole("button", { name: "Keep my account" }),
    ).toBeTruthy();
  });

  it("deletes a member with nothing open after E9's dialog, signs them out and opens the welcome page", async () => {
    const userId = await signInAsMember();
    const view = render(await DeleteAccountPage());
    expect(view.queryByText("Settle your loans first") === null).toBe(true);
    expect(view.queryByText("This also ends") === null).toBe(true);
    expect(
      view.getByText(
        "When you delete it, your friends stop seeing you. This can’t be undone.",
      ),
    ).toBeTruthy();

    fireEvent.click(view.getByRole("button", { name: "Delete my account" }));
    const dialog = within(await view.findByRole("alertdialog"));
    expect(
      dialog.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(["This can’t be undone."]);
    fireEvent.click(dialog.getByRole("button", { name: "Delete my account" }));
    await waitFor(() => expect(nextState.pushed).toEqual(["/welcome"]));

    expect(
      await getInjection("IUserProfilesRepository").getByUserId(userId),
    ).toBeUndefined();
    const auth = getInjection("IAuthenticationService");
    if (!(auth instanceof MockAuthService)) {
      throw new Error("The container's auth service is the mock under test");
    }
    expect(auth.deletedUserIds).toContain(userId);
    expect(auth.signedOut).toBeGreaterThan(0);
  });
});
