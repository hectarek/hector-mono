import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import { render, within } from "@testing-library/react";
import GamePage from "@/app/(main)/games/[id]/page";
import { CAST } from "@/tests/_support/cast";
import { signInAsYouWithTheCast } from "@/tests/_support/members";
import { NotFoundPage } from "@/tests/_support/next";

const { games, copies } = CAST;

// The page as the server renders it, opened from a search for harbor or not.
const renderGame = async (id: string, q?: string) =>
  render(
    await GamePage({
      params: Promise.resolve({ id }),
      searchParams: Promise.resolve(q ? { q } : {}),
    }),
  );
// Each copy's row by its name, and the words in it.
const row = (view: ReturnType<typeof render>, name: string) => {
  const item = within(view.container)
    .getAllByRole("listitem")
    .find((li) => li.textContent?.startsWith(name));
  if (!item) {
    throw new Error(`No row for ${name}`);
  }
  return item;
};

describe("a game's page", () => {
  beforeEach(async () => {
    // The kit's today, Tue Nov 10, 2026, in the morning.
    setSystemTime(new Date("2026-11-10T09:00:00-05:00"));
    await signInAsYouWithTheCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("draws B5: Harbor Lights, which friends own", async () => {
    const view = await renderGame(games.harborLights.id);

    expect(view.getByRole("heading", { level: 1 }).textContent).toBe(
      "Harbor Lights",
    );
    expect(
      view.getByText("2019 · Tidewater Games · designed by Ines Varga"),
    ).toBeTruthy();
    expect(view.getByText("1 of 2 available")).toBeTruthy();
    expect(
      view.getByRole("link", { name: "See copies" }).getAttribute("href"),
    ).toBe("#copies");
    for (const fact of [
      "2–5 players · best at 4",
      "45–60 min",
      "Age 10+",
      "Complexity: medium",
    ]) {
      expect(view.getByText(fact)).toBeTruthy();
    }
    expect(view.getByText(/^Light a path home/)).toBeTruthy();
    expect(view.getByText("Categories:").parentElement?.textContent).toBe(
      "Categories: Nautical, Family",
    );
    expect(
      view
        .getByRole("link", { name: /Harbor Lights: Night Tide/ })
        .getAttribute("href"),
    ).toBe(`/games/${games.nightTide.id}`);
    // video.example won't play inside the page, so it opens on its own.
    expect(
      view
        .getByRole("link", { name: "Open the how-to-play video" })
        .getAttribute("href"),
    ).toBe("https://video.example/harbor-lights-how-to-play");
    expect(
      view.getByRole("heading", { name: "Copies · 1 of 2 available" }).id,
    ).toBe("copies");
    // The cover's stamp is your own status for the game.
    expect(view.getByText("Available")).toBeTruthy();
  });

  it("AE1, the page's half: of two copies, one out until Nov 20, the page shows the second as out until Nov 20", async () => {
    const view = await renderGame(games.harborLights.id);

    const sams = row(view, "Sam’s copy");
    for (const line of [
      "At Sam’s",
      "Good · 1 part missing",
      "With Night Tide",
    ]) {
      expect(within(sams).getByText(line)).toBeTruthy();
    }
    const alices = row(view, "Alice’s copy");
    for (const line of [
      "Out until Nov 20",
      "Ben has it",
      "Jo is 1st in line",
      "Like new",
    ]) {
      expect(within(alices).getByText(line)).toBeTruthy();
    }
  });

  it("goes back to the search it was opened from", async () => {
    const view = await renderGame(games.harborLights.id, "harbor");

    expect(
      view.getByRole("link", { name: "Back to Library" }).getAttribute("href"),
    ).toBe("/?q=harbor");
  });

  it("draws B11: Night Market, your own copy, which Priya asked for", async () => {
    const view = await renderGame(games.nightMarket.id);

    expect(view.queryByRole("link", { name: "See copies" })).toBeNull();
    expect(view.getByRole("heading", { name: "Copies · 1" })).toBeTruthy();
    const yours = row(view, "Your copy");
    for (const line of ["At home", "Priya asked for it", "Requested"]) {
      expect(within(yours).getByText(line)).toBeTruthy();
    }
    expect(yours.querySelector("a")?.getAttribute("href")).toBe(
      `/copies/${copies.yourNightMarket.id}`,
    );
  });

  it("draws B13's states with the cast's copies", async () => {
    const lines = async (gameId: string, name: string) => {
      const view = await renderGame(gameId);
      const words = [...row(view, name).querySelectorAll("span")].map(
        (span) => span.textContent,
      );
      view.unmount();
      return words;
    };

    // You asked for Sam's Quarry Lane at 7:40 this morning.
    expect(await lines(games.quarryLane.id, "Sam’s copy")).toEqual(
      expect.arrayContaining([
        "At Sam’s",
        "You asked this morning",
        "You asked",
      ]),
    );
    // You have Sam's Moss & Mortar, due Friday.
    expect(await lines(games.mossAndMortar.id, "Sam’s copy")).toEqual(
      expect.arrayContaining(["You have it · due Fri, Nov 13", "Due Fri"]),
    );
    // Ben has Priya's Fenwick Fair, and you're next.
    expect(await lines(games.fenwickFair.id, "Priya’s copy")).toEqual(
      expect.arrayContaining(["Out until Nov 24", "1st in line"]),
    );
    // Your Paper Kites stays home.
    expect(await lines(games.paperKites.id, "Your copy")).toEqual(
      expect.arrayContaining(["You keep it at home", "Not lent"]),
    );
  });

  it("says when none of your friends own a game", async () => {
    const view = await renderGame(games.harborMaster.id);

    expect(view.getByText("None of your friends own this yet.")).toBeTruthy();
    expect(view.queryByText("Available")).toBeNull();
    expect(view.getByRole("heading", { name: "Copies" })).toBeTruthy();
  });

  it("shows an expansion's base game, and the copy whose box holds it", async () => {
    const view = await renderGame(games.nightTide.id);

    expect(
      view.getByRole("link", { name: /^Harbor Lights/ }).getAttribute("href"),
    ).toBe(`/games/${games.harborLights.id}`);
    expect(row(view, "Sam’s copy")).toBeTruthy();
  });

  it("is Not found for an id that isn't a game's", async () => {
    for (const id of ["00000000-0000-4000-8000-000000000999", "harbor"]) {
      expect(
        await GamePage({
          params: Promise.resolve({ id }),
          searchParams: Promise.resolve({}),
        }).catch((caught: unknown) => caught),
      ).toBeInstanceOf(NotFoundPage);
    }
  });
});
