import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { render, within } from "@testing-library/react";
import NightsPage from "@/app/(main)/nights/page";
import { CAST } from "@/tests/_support/cast";
import {
  signInAsMember,
  signInAsYouWithTheCast,
} from "@/tests/_support/members";

const { saturdayGameNight, heavyGamesAtMine, bensBirthdayGames } = CAST.nights;

describe("Nights (U18: D1)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
  });
  afterEach(() => {
    setSystemTime();
  });

  it("lists the nights coming up as D1 draws them, each opening its night", async () => {
    await signInAsYouWithTheCast();
    const view = render(await NightsPage());
    const page = within(view.container);
    expect(page.getByRole("heading", { level: 2 }).textContent).toBe(
      "Coming up",
    );
    const cards = page.getAllByRole("listitem").map((item) => {
      const link = within(item).getByRole("link");
      return { link, card: within(link) };
    });
    expect(cards.map(({ link }) => link.getAttribute("href"))).toEqual([
      `/nights/${saturdayGameNight.id}`,
      `/nights/${heavyGamesAtMine.id}`,
      `/nights/${bensBirthdayGames.id}`,
    ]);
    const [saturday, heavy, birthday] = cards.map(({ card }) => card);
    for (const text of [
      "Saturday game night",
      "Invited",
      "Sat, Nov 14 · 7 PM",
      "Alice is hosting",
      "2 seats open",
    ]) {
      expect(saturday?.getByText(text)).toBeTruthy();
    }
    for (const text of [
      "Host",
      "Fri, Nov 20 · 7 PM",
      "You’re hosting",
      "Ben’s guest",
      "Full · 1 on the waitlist",
    ]) {
      expect(heavy?.getByText(text)).toBeTruthy();
    }
    for (const text of [
      "Sat, Nov 21 · 2 PM",
      "Ben is hosting",
      "Dev’s guest",
      "Full · you can join the waitlist",
    ]) {
      expect(birthday?.getByText(text)).toBeTruthy();
    }
    // A night with no row of the member's has no stamp.
    expect(birthday?.queryByText(/^(Host|Invited|Going)$/) === null).toBe(true);
    const newNight = page.getByRole("button", { name: "New night" });
    expect(newNight.closest("a")?.getAttribute("href")).toBe("/nights/new");
  });

  it("says so when no night is coming up, with New game night (Empty lists, Nights)", async () => {
    await signInAsMember();
    const page = within(render(await NightsPage()).container);
    expect(page.getByText("No game nights coming up.")).toBeTruthy();
    expect(
      page
        .getByRole("button", { name: "New game night" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe("/nights/new");
  });
});
