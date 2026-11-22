import { beforeEach, expect, it } from "bun:test";
import type { UserGame } from "@/src/entities/models/user-game.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST, CAST_TODAY } from "@/tests/_support/cast";

const { you, mei } = CAST.people;
const { games } = CAST;

// Mei's copy of Harbor Master: Mei is Alice's friend, not yours.
const meisHarborMaster: UserGame = {
  id: "00000000-0000-4000-8000-000000000901",
  userId: mei.id,
  gameId: games.harborMaster.id,
  condition: "good",
  conditionNote: null,
  lendable: true,
  passAlong: false,
  createdAt: new Date("2026-08-01T12:00:00-04:00"),
  updatedAt: new Date("2026-08-01T12:00:00-04:00"),
};

describeEachBackend("search-games", () => {
  let app: ReturnType<typeof makeApp>;
  const search = (typed: string, viewerId: string = you.id) =>
    app.searchGames(typed, viewerId, CAST_TODAY);

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("gives B10's two groups for harbor", async () => {
    const found = await search("harbor");

    expect(
      found.onShelves.map(({ game, card }) => ({
        title: game.title,
        owners: card.ownerLine,
        line: card.stateLine,
        stamp: card.stamp.word,
      })),
    ).toEqual([
      {
        title: "Harbor Lights",
        owners: "Sam’s and Alice’s",
        line: "1 of 2 available",
        stamp: "Available",
      },
    ]);
    expect(
      found.inCatalog.map(({ game, base }) => ({ title: game.title, base })),
    ).toEqual([
      {
        title: "Harbor Lights: Night Tide",
        base: { title: "Harbor Lights", yours: false },
      },
      { title: "Harbor Master", base: null },
      { title: "Safe Harbor", base: null },
    ]);
  });

  it("never counts a stranger's copy (KTD4)", async () => {
    await app.addCopies(meisHarborMaster);

    const yours = await search("harbor master");
    expect(yours.onShelves).toEqual([]);
    expect(yours.inCatalog.map(({ game }) => game.title)).toEqual([
      "Harbor Master",
    ]);
    // On Mei's own shelf, it's in her first group.
    const meis = await search("harbor master", mei.id);
    expect(meis.onShelves.map(({ card }) => card.ownerLine)).toEqual(["Yours"]);
  });

  it("says when you own an expansion's base game", async () => {
    const found = await search("low tide");

    // Night Tide shares "tide", so it comes too, after the closer match.
    expect(found.inCatalog.map(({ game, base }) => [game.title, base])).toEqual(
      [
        ["Gull & Anchor: Low Tide", { title: "Gull & Anchor", yours: true }],
        ["Harbor Lights: Night Tide", { title: "Harbor Lights", yours: false }],
      ],
    );
  });

  it("finds nothing for nothing typed", async () => {
    expect(await search("")).toEqual({ onShelves: [], inCatalog: [] });
    expect(await search("  the ")).toEqual({ onShelves: [], inCatalog: [] });
  });
});
