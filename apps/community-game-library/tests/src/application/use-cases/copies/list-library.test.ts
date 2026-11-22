import { beforeEach, expect, it } from "bun:test";
import { EMPTY_VIEW, type LibraryView } from "@/src/entities/library-filters";
import type { UserGame } from "@/src/entities/models/user-game.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST, CAST_TODAY } from "@/tests/_support/cast";

const { you, mei, sam, alice } = CAST.people;
const { games } = CAST;

// Mei's copy of Harbor Master: Mei is Alice's friend, not yours.
const meisHarborMaster: UserGame = {
  id: "00000000-0000-4000-8000-000000000902",
  userId: mei.id,
  gameId: games.harborMaster.id,
  condition: "good",
  conditionNote: null,
  lendable: true,
  passAlong: false,
  createdAt: new Date("2026-08-01T12:00:00-04:00"),
  updatedAt: new Date("2026-08-01T12:00:00-04:00"),
};

describeEachBackend("list-library", () => {
  let app: ReturnType<typeof makeApp>;
  const list = (view: Partial<LibraryView> = {}, viewerId: string = you.id) =>
    app.listLibrary(viewerId, CAST_TODAY, { ...EMPTY_VIEW, ...view });

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("gives every game on your and your friends' shelves, one card each (B1)", async () => {
    const library = await list();

    expect(library.total).toBe(9);
    expect(library.hasFriends).toBe(true);
    expect(library.items.map(({ game }) => game.title)).toEqual([
      "Fenwick Fair",
      "Gull & Anchor",
      "Harbor Lights",
      "Moss & Mortar",
      "Night Market",
      "Paper Kites",
      "Quarry Lane",
      "Salt & Signal",
      "Tin Kettle Derby",
    ]);
    // The owner filter's people: you first, then your friends by name.
    expect(library.owners.map(({ name }) => name)).toEqual([
      "Robin Vale",
      "Alice",
      "Jo",
      "Priya",
      "Sam",
    ]);
  });

  // AE1: two copies of a game, one out until Nov 20, give a card reading 1 of 2 available.
  it("AE1: a card counts the copies free now", async () => {
    const library = await list();
    const harbor = library.items.find(
      ({ game }) => game.id === games.harborLights.id,
    );
    expect(harbor?.card.stateLine).toBe("1 of 2 available");
    expect(harbor?.ownerIds).toEqual([sam.id, alice.id]);
  });

  // AE8: a member who isn't a friend has none of their games in your library.
  it("AE8: a stranger's games never show", async () => {
    await app.addCopies(meisHarborMaster);

    expect(
      (await list()).items.some(
        ({ game }) => game.id === games.harborMaster.id,
      ),
    ).toBe(false);
    // Alice is Mei's friend, so Alice sees it.
    expect(
      (await list({}, alice.id)).items.some(
        ({ game }) => game.id === games.harborMaster.id,
      ),
    ).toBe(true);
  });

  it("counts pick-ups only to sort by most borrowed", async () => {
    const byTitle = await list();
    expect(byTitle.items.every(({ borrowed }) => borrowed === 0)).toBe(true);

    const mostBorrowed = await list({ sort: "most-borrowed" });
    expect(
      mostBorrowed.items
        .slice(0, 3)
        .map(({ game, borrowed }) => [game.title, borrowed]),
    ).toEqual([
      ["Gull & Anchor", 3],
      ["Fenwick Fair", 2],
      ["Harbor Lights", 2],
    ]);
  });

  it("says when you have no friends yet", async () => {
    const library = await list({}, mei.id);
    expect(library.hasFriends).toBe(true);

    const loner = "00000000-0000-4000-8000-0000000009a1";
    const empty = await list({}, loner);
    expect(empty).toMatchObject({ total: 0, hasFriends: false, items: [] });
  });
});
