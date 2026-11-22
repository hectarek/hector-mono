import { beforeEach, expect, it } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import type { UserGame } from "@/src/entities/models/user-game.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST, CAST_TODAY } from "@/tests/_support/cast";

const { you, sam, alice, ben, jo, mei } = CAST.people;
const { copies, games, loans } = CAST;
const copyIds = (view: { copies: { copy: { id: string } }[] }) =>
  view.copies.map(({ copy }) => copy.id);

// Mei's copy of Harbor Lights: Mei is Alice's friend, not yours.
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

describeEachBackend("get-game", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("shows a game's copies with their states, as B5 draws Harbor Lights", async () => {
    const view = await app.getGame(games.harborLights.id, you.id, CAST_TODAY);

    expect(view.game.title).toBe("Harbor Lights");
    expect(view.baseGame).toBeNull();
    expect(view.expansions.map(({ title }) => title)).toEqual([
      "Harbor Lights: Night Tide",
    ]);
    expect(copyIds(view)).toEqual([
      copies.samsHarborLights.id,
      copies.alicesHarborLights.id,
    ]);
    const [samsCopy, alicesCopy] = view.copies;
    expect(samsCopy?.state.kind).toBe("available");
    expect(samsCopy?.boxedExpansions).toEqual(["Harbor Lights: Night Tide"]);
    // AE1's data: the second copy is out until Nov 20, with Jo in line.
    expect(alicesCopy?.state.kind).toBe("out");
    expect(alicesCopy?.state.holder).toMatchObject({
      id: loans.benHasAlicesHarborLights.id,
      dueOn: "2026-11-20",
    });
    expect(alicesCopy?.state.line.map(({ id }) => id)).toEqual([
      loans.joAskedForAlicesHarborLights.id,
    ]);
    // The owners, the holder and the person in line, by name and piece.
    expect(Object.keys(view.people).sort()).toEqual(
      [sam.id, alice.id, ben.id, jo.id].sort(),
    );
    expect(view.people[ben.id]).toEqual({
      userId: ben.id,
      name: "Ben",
      pieceShape: "pawn",
      pieceColor: "bone",
    });
  });

  it("never shows a stranger's copy (KTD4)", async () => {
    await app.addCopies(meisHarborLights);

    expect(
      copyIds(await app.getGame(games.harborLights.id, you.id, CAST_TODAY)),
    ).not.toContain(meisHarborLights.id);
    // Mei sees her own copy and her friend Alice's.
    expect(
      copyIds(await app.getGame(games.harborLights.id, mei.id, CAST_TODAY)),
    ).toEqual([copies.alicesHarborLights.id, meisHarborLights.id]);
  });

  it("puts your own copies after your friends'", async () => {
    const view = await app.getGame(games.saltAndSignal.id, you.id, CAST_TODAY);

    expect(copyIds(view)).toEqual([
      copies.josSaltAndSignal.id,
      copies.yourSaltAndSignal.id,
    ]);
    expect(view.copies.map(({ state }) => state.yours)).toEqual([false, true]);
  });

  it("shows an expansion's base game, and the copies whose box holds it", async () => {
    const view = await app.getGame(games.nightTide.id, you.id, CAST_TODAY);

    expect(view.baseGame?.title).toBe("Harbor Lights");
    expect(view.expansions).toEqual([]);
    expect(copyIds(view)).toEqual([copies.samsHarborLights.id]);
  });

  it("answers an unknown game with Not found", async () => {
    await expect(
      app.getGame("00000000-0000-4000-8000-000000000999", you.id, CAST_TODAY),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
