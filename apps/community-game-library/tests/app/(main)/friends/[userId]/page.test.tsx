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
import FriendPage from "@/app/(main)/friends/[userId]/page";
import { getInjection } from "@/di/container";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { NotFoundPage, nextState } from "@/tests/_support/next";

const { you, sam, noor } = CAST.people;

const friendPage = (userId: string) =>
  FriendPage({
    params: Promise.resolve({ userId }),
    searchParams: Promise.resolve({}),
  });

describe("a friend's page (E3) and Unfriend (E4)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    nextState.pushed = [];
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws E3: Sam, friends since July, his phone, and his library as you see it", async () => {
    const view = render(await friendPage(sam.id));
    const page = within(view.container);

    expect(page.getByRole("heading", { level: 1 }).textContent).toBe("Sam");
    expect(page.getByText("Friends since Jul 2026")).toBeTruthy();
    expect(page.getByText("3 games")).toBeTruthy();
    const call = page.getByRole("link", { name: "Call Sam, 555 0142" });
    expect(call.getAttribute("href")).toBe("tel:5550142");
    expect(
      page.getByText(
        "Only Sam’s friends, and the other person in a loan, see it.",
      ),
    ).toBeTruthy();
    expect(page.getByText("Sam’s library")).toBeTruthy();
    for (const [title, stamp] of [
      ["Harbor Lights", "Available"],
      ["Moss & Mortar", "Due Fri"],
      ["Quarry Lane", "You asked"],
    ] as const) {
      const row = within(page.getByText(title).closest("li") as HTMLElement);
      expect(row.getByText(stamp)).toBeTruthy();
    }
    expect(page.getByText("Friendship")).toBeTruthy();
    expect(
      page.getByText("You see each other’s libraries and game nights."),
    ).toBeTruthy();
  });

  it("lists the nights coming up that Sam is going to, each opening its night (U18)", async () => {
    const page = within(render(await friendPage(sam.id)).container);
    const nights = within(
      page
        .getByText("Game nights Sam is going to")
        .closest("section") as HTMLElement,
    );
    expect(
      nights
        .getAllByRole("link")
        .map((link) => [link.getAttribute("href"), link.textContent]),
    ).toEqual([
      [
        `/nights/${CAST.nights.saturdayGameNight.id}`,
        "Saturday game nightSat, Nov 14 · 7:00 PM ·Alice is hosting",
      ],
      [
        `/nights/${CAST.nights.heavyGamesAtMine.id}`,
        "Heavy games at mineFri, Nov 20 · 7:00 PM ·You’re hosting",
      ],
      [
        `/nights/${CAST.nights.bensBirthdayGames.id}`,
        "Ben’s birthday gamesSat, Nov 21 · 2:00 PM ·Ben is hosting",
      ],
    ]);
  });

  it("asks first with E4's lines, then unfriends Sam and goes back to Friends", async () => {
    const view = render(
      <>
        {await friendPage(sam.id)}
        <Toaster id={APP_TOASTER} theme="light" />
      </>,
    );
    fireEvent.click(view.getByRole("button", { name: "Unfriend Sam" }));
    const dialog = within(await view.findByRole("alertdialog"));

    expect(dialog.getByText("Unfriend Sam?")).toBeTruthy();
    expect(
      dialog.getAllByRole("listitem").map((line) => line.textContent),
    ).toEqual([
      "You stop seeing each other’s libraries and game nights.",
      "Moss & Mortar stays on your Loans until it’s back with Sam.",
      "Your request for Quarry Lane is withdrawn, and you leave each other’s lines.",
      "Sam isn’t told. You can become friends again with a friend link.",
    ]);
    expect(dialog.getByRole("button", { name: "Keep Sam" })).toBeTruthy();

    fireEvent.click(dialog.getByRole("button", { name: "Unfriend Sam" }));
    expect(
      await view.findByText("Unfriended Sam. Sam isn’t told."),
    ).toBeTruthy();
    await waitFor(() => expect(nextState.pushed).toContain("/friends"));
    expect(
      await getInjection("IFriendshipsRepository").areFriends(you.id, sam.id),
    ).toBe(false);
    await expect(friendPage(sam.id)).rejects.toThrow(NotFoundPage);
  });

  it("is Not found for someone who isn't your friend, and for an id that isn't one (AE8)", async () => {
    await expect(friendPage(noor.id)).rejects.toThrow(NotFoundPage);
    await expect(friendPage("sam")).rejects.toThrow(NotFoundPage);
  });
});
