import { beforeEach, expect, it } from "bun:test";
import type { UserGame } from "@/src/entities/models/user-game.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, mei, noor } = CAST.people;
const { copies, games } = CAST;
const ids = (found: { id: string }[]) => found.map(({ id }) => id);

// Mei's copy of Harbor Lights: Mei is Alice's friend, not yours (ids end in 9xx).
const meisHarborLights: UserGame = {
  id: "00000000-0000-4000-8000-000000000901",
  userId: mei.id,
  gameId: games.harborLights.id,
  condition: "good",
  conditionNote: null,
  lendable: true,
  passAlong: false,
  createdAt: new Date("2026-08-01T12:00:00-04:00"),
  updatedAt: new Date("2026-08-01T12:00:00-04:00"),
};

describeEachBackend("IUserGamesRepository", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
    await app.addCopies(meisHarborLights);
  });

  it("lists your copies and your friends', oldest first, and never a stranger's", async () => {
    const yours = await app.repos.userGames.listVisible(you.id);

    // The circle's eleven copies, without Mei's.
    expect(yours).toHaveLength(11);
    expect(ids(yours)).not.toContain(meisHarborLights.id);
    // Your Night Market and Gull & Anchor were the first on anyone's shelf.
    expect(ids(yours).slice(0, 2)).toEqual([
      copies.yourNightMarket.id,
      copies.yourGullAndAnchor.id,
    ]);
    // Noor is Sam's friend only: Sam's three copies.
    expect(ids(await app.repos.userGames.listVisible(noor.id))).toEqual([
      copies.samsHarborLights.id,
      copies.samsMossAndMortar.id,
      copies.samsQuarryLane.id,
    ]);
  });

  it("lists a game's copies for one viewer", async () => {
    const harborLights = (viewerId: string) =>
      app.repos.userGames.listVisibleForGame(games.harborLights.id, viewerId);

    expect(ids(await harborLights(you.id))).toEqual([
      copies.samsHarborLights.id,
      copies.alicesHarborLights.id,
    ]);
    // Mei sees her own copy and her friend Alice's, not Sam's.
    expect(ids(await harborLights(mei.id))).toEqual([
      copies.alicesHarborLights.id,
      meisHarborLights.id,
    ]);
    expect(ids(await harborLights(alice.id))).toEqual([
      copies.samsHarborLights.id,
      copies.alicesHarborLights.id,
      meisHarborLights.id,
    ]);
  });

  it("lists the expansions in copies' boxes", async () => {
    expect(
      await app.repos.userGames.listExpansionsInBoxes([
        copies.yourGullAndAnchor.id,
        copies.samsHarborLights.id,
        copies.alicesHarborLights.id,
      ]),
    ).toEqual([
      { userGameId: copies.samsHarborLights.id, gameId: games.nightTide.id },
      { userGameId: copies.yourGullAndAnchor.id, gameId: games.lowTide.id },
    ]);
    expect(await app.repos.userGames.listExpansionsInBoxes([])).toEqual([]);
  });
});
