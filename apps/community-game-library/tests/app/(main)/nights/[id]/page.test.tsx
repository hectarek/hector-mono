import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { render, within } from "@testing-library/react";

// The host the request came to; headers() works only inside a request.
mock.module("next/headers", () => ({
  headers: async () => new Headers({ host: "communitygamelibrary.com" }),
}));

const { default: NightPage } = await import("@/app/(main)/nights/[id]/page");
const { CAST } = await import("@/tests/_support/cast");
const { signInAsYouWithTheCast } = await import("@/tests/_support/members");
const { NotFoundPage, nextState } = await import("@/tests/_support/next");

const { saturdayGameNight, heavyGamesAtMine } = CAST.nights;
const nightPage = (id: string) =>
  NightPage({ params: Promise.resolve({ id }) });

describe("A night's page (U18: D2, D7)", () => {
  beforeEach(() => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
  });
  afterEach(() => {
    setSystemTime();
  });

  it("gives the host D7: the details, who's going with Ben's guest, the games on the table and Edit", async () => {
    await signInAsYouWithTheCast();
    const page = within(render(await nightPage(heavyGamesAtMine.id)).container);
    // The stamp, and under You on the list.
    expect(page.getAllByText("Host")).toHaveLength(2);
    for (const text of [
      "Fri, Nov 20 · 7 to 10:30 PM",
      "Robin’s place · 9 Juniper Court",
      "Only people invited can see it",
      "Going · 6 of 6",
    ]) {
      expect(page.getByText(text)).toBeTruthy();
    }
    expect(page.getByRole("heading", { level: 1 }).textContent).toBe(
      "Heavy games at mine",
    );
    const going = within(
      page.getByText("Going · 6 of 6").closest("section") as HTMLElement,
    );
    expect(
      going.getAllByRole("listitem").map((row) => row.textContent),
    ).toEqual([
      "YouHost",
      "Sam",
      "Priya",
      "Jo",
      "BenBringing 1 guest",
      "Ben’s guest",
    ]);
    const table = within(
      page.getByText("Games on the table").closest("section") as HTMLElement,
    );
    // Most wanted first, with who'd play each and I'd play (U19).
    expect(
      table.getAllByRole("listitem").map((row) => row.textContent),
    ).toEqual([
      "Quarry LaneBest at 5 · 90 minSam brings it4 want to playI’d play",
      "Night MarketBest at 5 · 60–90 minYou bring it3 want to playYou’d play",
      "Harbor LightsBest at 4 · 45–60 minSam brings it1 wants to playI’d play",
      "Salt & Signal2 players only · 30 minYou bring itNo one yetI’d play",
    ]);
    expect(table.getByText("Most wanted first")).toBeTruthy();
    expect(
      table
        .getByRole("button", { name: "You’d play" })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    // The night's link, the waitlist and who hasn't answered (U19).
    for (const text of [
      "communitygamelibrary.com/n/7QK2-MARR",
      "Everyone invited has answered.",
      "Waitlist · 1",
      "1st on the waitlist · needs 1 seat",
    ]) {
      expect(page.getByText(text)).toBeTruthy();
    }
    expect(
      page.getByRole("button", { name: "Remove from waitlist" }),
    ).toBeTruthy();
    expect(
      page
        .getByRole("button", { name: "Invite people" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe(`/nights/${heavyGamesAtMine.id}/invite`);
    expect(
      page
        .getByRole("button", { name: "Edit" })
        .closest("a")
        ?.getAttribute("href"),
    ).toBe(`/nights/${heavyGamesAtMine.id}/edit`);
  });

  it("gives an invited friend D2's details: who's hosting, the note, the seats and who said maybe", async () => {
    await signInAsYouWithTheCast();
    const page = within(
      render(await nightPage(saturdayGameNight.id)).container,
    );
    for (const text of [
      "Invited",
      "Sat, Nov 14 · 7 to 10 PM",
      "Alice’s place · 14 Alder Row",
      "Alice is hosting",
      "“Snacks welcome. Street parking only.”",
      "Alice’s friends can see it",
      "4 of 6 going · 2 seats open",
      "Alice, Sam, Jo and Priya",
      "Ben said maybe",
      "Jo brings it",
    ]) {
      expect(page.getByText(text)).toBeTruthy();
    }
    expect(page.queryByRole("button", { name: "Edit" }) === null).toBe(true);
  });

  it("AE5: is Not found to a friend who isn't invited to a private night", async () => {
    await signInAsYouWithTheCast();
    nextState.userId = CAST.people.alice.id;
    await expect(nightPage(heavyGamesAtMine.id)).rejects.toThrow(NotFoundPage);
    await expect(nightPage("heavy-games")).rejects.toThrow(NotFoundPage);
  });
});
