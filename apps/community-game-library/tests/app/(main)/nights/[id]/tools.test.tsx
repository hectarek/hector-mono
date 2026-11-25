import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  mock,
  setSystemTime,
} from "bun:test";
import { fireEvent, render, within } from "@testing-library/react";

// The host the request came to; headers() works only inside a request.
mock.module("next/headers", () => ({
  headers: async () => new Headers({ host: "communitygamelibrary.com" }),
}));

const { default: WhatToPlayPage } = await import(
  "@/app/(main)/nights/[id]/what-to-play/page"
);
const { default: TablesPage } = await import(
  "@/app/(main)/nights/[id]/tables/page"
);
const { default: NightPage } = await import("@/app/(main)/nights/[id]/page");
const { getInjection } = await import("@/di/container");
const { CAST } = await import("@/tests/_support/cast");
const { resetCastNights, signInAsYouWithTheCast } = await import(
  "@/tests/_support/members"
);
const { NotFoundPage, nextState } = await import("@/tests/_support/next");

const { heavyGamesAtMine, saturdayGameNight } = CAST.nights;
const params = (id: string) => ({ params: Promise.resolve({ id }) });
// A link-styled Button has the button role (AGENTS.md, Testing).
const hrefOf = (page: ReturnType<typeof within>, name: string) =>
  page.getByRole("button", { name }).closest("a")?.getAttribute("href");

describe("What should we play? and tables (U20: D8, D9)", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
    resetCastNights();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("starts D8 from the night on all friends’ games with no complexity picked, and changes the fits as the choices change", async () => {
    const view = render(await WhatToPlayPage(params(heavyGamesAtMine.id)));
    const page = within(view.container);
    const pressed = (name: string) =>
      page.getByRole("button", { name }).getAttribute("aria-pressed");
    expect(page.getByText("6 are going, guests included.")).toBeTruthy();
    expect(pressed("3 hours")).toBe("true");
    // Hector, 2026-11-25: All friends’ games, though the night has games on its table.
    expect(pressed("All friends’ games")).toBe("true");
    expect(pressed("Games on the table")).toBe("false");
    for (const level of ["Light", "Medium", "Heavy", "New players"]) {
      expect(pressed(level)).toBe("false");
    }
    const fits = () =>
      within(
        page.getByText("Best fits first").closest("section") as HTMLElement,
      )
        .getAllByRole("link")
        .map((row) => row.textContent);
    const leftOut = () =>
      page.getByText("Left out").closest("section")?.querySelector("p")
        ?.textContent;
    // Tin Kettle Derby plays best at 6, so it comes before the table's games.
    expect(fits()).toEqual([
      "Tin Kettle DerbyPlays 6, best at 620 min · lightAlice has it",
      "Quarry LanePlays 6, best at 590 min · mediumSam brings itOn the table",
      "Night MarketPlays 6, best at 560–90 min · mediumYou bring itOn the table",
    ]);
    // Six are left out: the first three reasons, then how many more.
    expect(leftOut()).toBe(
      "Salt & Signal seats 2. Harbor Lights seats 5 at most. Gull & Anchor seats 4 at most. And 3 more games are left out.",
    );

    // D8's board: Medium picked, which leaves out Tin Kettle Derby too.
    fireEvent.click(page.getByRole("button", { name: "Medium" }));
    expect(fits()).toEqual([
      "Quarry LanePlays 6, best at 590 min · mediumSam brings itOn the table",
      "Night MarketPlays 6, best at 560–90 min · mediumYou bring itOn the table",
    ]);
    expect(leftOut()).toBe(
      "Salt & Signal seats 2. Harbor Lights seats 5 at most. Gull & Anchor seats 4 at most. And 4 more games are left out.",
    );

    // Three or fewer read in full.
    fireEvent.click(page.getByRole("button", { name: "Games on the table" }));
    expect(leftOut()).toBe(
      "Salt & Signal seats 2. Harbor Lights seats 5 at most.",
    );

    fireEvent.click(page.getByRole("button", { name: "1 hour" }));
    expect(
      page.getByText(
        "Nothing fits 6 people in 1 hour. Try more time or another complexity.",
      ),
    ).toBeTruthy();
  });

  it("splits D9 into two tables of 3, with one table for all 6 offered, and uses it", async () => {
    const view = render(await TablesPage(params(heavyGamesAtMine.id)));
    const page = within(view.container);
    expect(page.getByText("5 going + 1 guest · 3 hours")).toBeTruthy();
    expect(
      page.getByText("Only you see this until you share it."),
    ).toBeTruthy();
    const table = (label: string) =>
      within(page.getByText(label).closest("section") as HTMLElement);
    expect(
      table("Table 1 · 3 players")
        .getAllByRole("listitem")
        .map((seat) => seat.textContent),
    ).toEqual(["You", "Sam", "Priya"]);
    expect(table("Table 1 · 3 players").getByText("Quarry Lane")).toBeTruthy();
    expect(
      table("Table 2 · 3 players")
        .getAllByRole("listitem")
        .map((seat) => seat.textContent),
    ).toEqual(["Jo", "Ben", "Ben’s guest"]);
    expect(table("Table 2 · 3 players").getByText("Night Market")).toBeTruthy();
    expect(page.getByText("Or one table for all 6")).toBeTruthy();

    fireEvent.click(page.getByRole("button", { name: "Use one table" }));
    expect(page.getByText("Table 1 · 6 players")).toBeTruthy();
    expect(page.queryByText("Table 2 · 3 players") === null).toBe(true);
    fireEvent.click(
      page.getByRole("button", { name: "Split into tables again" }),
    );
    expect(page.getByText("Table 2 · 3 players")).toBeTruthy();
  });

  it("seats everyone at one table on D9 when too few are going to split", async () => {
    const { you, sam, jo } = CAST.people;
    const night = await getInjection("ICreateNightController")(
      {
        name: "Three of us",
        date: "2026-11-27",
        startsAt: "19:00",
        endsAt: null,
        place: "Robin’s place",
        address: "",
        note: "",
        capacity: 6,
        audience: "friends",
        attendeesCanInvite: false,
        guestsAllowed: false,
        userGameIds: [CAST.copies.yourNightMarket.id],
      },
      you.id,
    );
    for (const friend of [sam, jo]) {
      await getInjection("IAnswerNightController")(
        { gameNightId: night.id, answer: "going" },
        friend.id,
      );
    }
    const page = within(render(await TablesPage(params(night.id))).container);
    expect(page.getByText("3 going · 2 hours")).toBeTruthy();
    const table = within(
      page.getByText("Table 1 · 3 players").closest("section") as HTMLElement,
    );
    expect(table.getByText("Night Market")).toBeTruthy();
    expect(
      table.getAllByRole("listitem").map((seat) => seat.textContent),
    ).toEqual(["You", "Sam", "Jo"]);
    expect(page.queryByText(/Or one table/) === null).toBe(true);
    expect(
      page.queryByRole("button", { name: "Split into tables again" }) === null,
    ).toBe(true);
  });

  it("opens both from the host's page, and What should we play? from a friend's night", async () => {
    const host = within(
      render(await NightPage(params(heavyGamesAtMine.id))).container,
    );
    expect(hrefOf(host, "What should we play?")).toBe(
      `/nights/${heavyGamesAtMine.id}/what-to-play`,
    );
    expect(hrefOf(host, "Split into tables")).toBe(
      `/nights/${heavyGamesAtMine.id}/tables`,
    );
    const friend = within(
      render(await NightPage(params(saturdayGameNight.id))).container,
    );
    expect(hrefOf(friend, "What should we play?")).toBe(
      `/nights/${saturdayGameNight.id}/what-to-play`,
    );
  });

  it("is Not found to someone who can't see the night", async () => {
    nextState.userId = CAST.people.alice.id;
    await expect(WhatToPlayPage(params(heavyGamesAtMine.id))).rejects.toThrow(
      NotFoundPage,
    );
    await expect(TablesPage(params(heavyGamesAtMine.id))).rejects.toThrow(
      NotFoundPage,
    );
  });
});
