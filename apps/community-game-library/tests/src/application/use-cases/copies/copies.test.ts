import { beforeEach, expect, it } from "bun:test";
import {
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { EMPTY_VIEW } from "@/src/entities/library-filters";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST, CAST_TODAY } from "@/tests/_support/cast";

const { you, sam } = CAST.people;
const { copies, games, loans } = CAST;

describeEachBackend("copies", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("I own it takes the owner's default pass-along, and Undo removes the copy", async () => {
    const yours = await app.addUserGame(games.harborMaster.id, you.id);
    expect(yours.game.title).toBe("Harbor Master");
    expect(yours.copy).toMatchObject({
      userId: you.id,
      gameId: games.harborMaster.id,
      condition: "good",
      lendable: true,
      passAlong: false,
    });
    // Sam passes his games along by default.
    expect(
      (await app.addUserGame(games.harborMaster.id, sam.id)).copy.passAlong,
    ).toBe(true);

    expect(await app.removeUserGame(yours.copy.id, you.id)).toEqual({
      title: "Harbor Master",
    });
    expect(await app.repos.userGames.getById(yours.copy.id)).toBeUndefined();
  });

  it("adds a second copy of a game you own (R9)", async () => {
    await app.addUserGame(games.saltAndSignal.id, you.id);

    const own = await app.repos.userGames.listOwn(you.id);
    expect(
      own.filter((copy) => copy.gameId === games.saltAndSignal.id),
    ).toHaveLength(2);
  });

  it("never adds an expansion as a copy of its own (R3)", async () => {
    await expect(
      app.addUserGame(games.nightTide.id, you.id),
    ).rejects.toBeInstanceOf(InputParseError);
  });

  it("In my box puts an expansion in your copy of its base game, never twice (R3)", async () => {
    const { copy: harborLights } = await app.addUserGame(
      games.harborLights.id,
      you.id,
    );

    const put = await app.putInBox(games.nightTide.id, you.id);
    expect(put.copy.id).toBe(harborLights.id);
    expect(put.expansion.title).toBe("Harbor Lights: Night Tide");
    expect(put.baseGame.title).toBe("Harbor Lights");
    const boxed = async () =>
      (await app.repos.userGames.listExpansionsInBoxes([harborLights.id])).map(
        (row) => row.gameId,
      );
    expect(await boxed()).toEqual([games.nightTide.id]);

    // Again, and it's where it was.
    expect((await app.putInBox(games.nightTide.id, you.id)).copy.id).toBe(
      harborLights.id,
    );
    expect(await boxed()).toEqual([games.nightTide.id]);
  });

  it("In my box leaves a box that has it, and keeps the rest of the box", async () => {
    // Your Gull & Anchor holds Low Tide already (B7).
    const put = await app.putInBox(games.lowTide.id, you.id);
    expect(put.copy.id).toBe(copies.yourGullAndAnchor.id);
    expect(
      (
        await app.repos.userGames.listExpansionsInBoxes([
          copies.yourGullAndAnchor.id,
        ])
      ).map((row) => row.gameId),
    ).toEqual([games.lowTide.id]);
  });

  it("In my box takes the older copy when you have two of the base game", async () => {
    const { copy: first } = await app.addUserGame(
      games.harborLights.id,
      you.id,
    );
    // A moment later, so the two aren't added in the same millisecond.
    await Bun.sleep(5);
    await app.addUserGame(games.harborLights.id, you.id);

    expect((await app.putInBox(games.nightTide.id, you.id)).copy.id).toBe(
      first.id,
    );
  });

  it("In my box needs the base game on your shelf, and an expansion", async () => {
    await expect(app.putInBox(games.nightTide.id, you.id)).rejects.toThrow(
      "Add Harbor Lights first",
    );
    await expect(
      app.putInBox(games.harborMaster.id, you.id),
    ).rejects.toBeInstanceOf(InputParseError);
  });

  it("saves a copy's condition, what's missing and only its game's expansions", async () => {
    await app.updateUserGame(
      copies.yourGullAndAnchor.id,
      { condition: "worn", conditionNote: "Lid torn", expansionIds: [] },
      you.id,
    );
    const saved = await app.getUserGame(
      copies.yourGullAndAnchor.id,
      you.id,
      CAST_TODAY,
    );
    expect(saved.copy).toMatchObject({
      condition: "worn",
      conditionNote: "Lid torn",
    });
    expect(saved.boxed).toEqual([]);

    await app.updateUserGame(
      copies.yourGullAndAnchor.id,
      {
        condition: "good",
        conditionNote: null,
        expansionIds: [games.lowTide.id],
      },
      you.id,
    );
    expect(
      (await app.getUserGame(copies.yourGullAndAnchor.id, you.id, CAST_TODAY))
        .boxed,
    ).toEqual([games.lowTide.id]);
    // Night Tide is Harbor Lights' expansion, not Gull & Anchor's.
    await expect(
      app.updateUserGame(
        copies.yourGullAndAnchor.id,
        {
          condition: "good",
          conditionNote: null,
          expansionIds: [games.nightTide.id],
        },
        you.id,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
  });

  it("saves each lending switch as it flips", async () => {
    expect(
      (
        await app.setLending(
          copies.yourPaperKites.id,
          { lendable: true },
          you.id,
        )
      ).lendable,
    ).toBe(true);
    expect(
      (
        await app.setLending(
          copies.yourPaperKites.id,
          { passAlong: true },
          you.id,
        )
      ).passAlong,
    ).toBe(true);
  });

  it("B6's switch sets every copy you own and your default for the next", async () => {
    await app.setPassAlongForAll(true, you.id);

    const own = await app.repos.userGames.listOwn(you.id);
    expect(own.every((copy) => copy.passAlong)).toBe(true);
    expect(
      (await app.addUserGame(games.harborMaster.id, you.id)).copy.passAlong,
    ).toBe(true);
    expect(
      (await app.listMyLibrary(you.id, CAST_TODAY, EMPTY_VIEW))
        .defaultPassAlong,
    ).toBe(true);
  });

  it("AE2: refuses to remove a copy while someone has it", async () => {
    // Jo has your Gull & Anchor.
    const refused = await app
      .removeUserGame(copies.yourGullAndAnchor.id, you.id)
      .catch((err: unknown) => err);
    expect(refused).toBeInstanceOf(UnauthorizedError);
    expect((refused as Error).message).toBe(
      "You can remove it once it’s back.",
    );
    expect(
      await app.repos.userGames.getById(copies.yourGullAndAnchor.id),
    ).toBeDefined();

    await app.removeUserGame(copies.yourSaltAndSignal.id, you.id);
    expect(
      await app.repos.userGames.getById(copies.yourSaltAndSignal.id),
    ).toBeUndefined();
  });

  it("refuses a friend who tries to change someone else's copy", async () => {
    const samsCopy = copies.samsHarborLights.id;
    for (const attempt of [
      () =>
        app.updateUserGame(
          samsCopy,
          { condition: "worn", conditionNote: null, expansionIds: [] },
          you.id,
        ),
      () => app.setLending(samsCopy, { lendable: false }, you.id),
      () => app.removeUserGame(samsCopy, you.id),
      () => app.getUserGame(samsCopy, you.id, CAST_TODAY),
    ]) {
      await expect(attempt()).rejects.toBeInstanceOf(UnauthorizedError);
    }
  });

  it("lists My library by title, with B6's lines", async () => {
    const library = await app.listMyLibrary(you.id, CAST_TODAY, EMPTY_VIEW);

    expect(
      library.items.map(({ game, card }) => [game.title, card.stateLine]),
    ).toEqual([
      ["Gull & Anchor", "Jo has it · 1 in line"],
      ["Night Market", "Priya asked for it"],
      ["Paper Kites", "Kept at home"],
      ["Salt & Signal", "At home"],
    ]);
    expect(library.passingAlong).toBe(0);
  });

  it("counts My library's games, not its copies, for You's My library row (E5)", async () => {
    await app.addUserGame(games.nightMarket.id, you.id);
    const library = await app.listMyLibrary(you.id, CAST_TODAY, EMPTY_VIEW);
    // Two copies of Night Market, one game.
    expect(library.items).toHaveLength(5);
    expect(library.total).toBe(4);
  });

  it("shows a copy's box and its history to its owner (B7)", async () => {
    const view = await app.getUserGame(
      copies.yourGullAndAnchor.id,
      you.id,
      CAST_TODAY,
    );

    expect(view.game.title).toBe("Gull & Anchor");
    expect(view.expansions.map(({ title }) => title)).toEqual([
      "Gull & Anchor: Low Tide",
    ]);
    expect(view.boxed).toEqual([games.lowTide.id]);
    expect(view.state.kind).toBe("out");
    expect(view.history.map(({ id }) => id)).toEqual([
      loans.joHasGullAndAnchor.id,
      loans.priyaHadGullAndAnchor.id,
      loans.samHadGullAndAnchor.id,
    ]);
  });
});
