import { beforeEach, expect, it } from "bun:test";
import {
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import type { GameRecord } from "@/src/entities/models/game.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, sam, priya } = CAST.people;
const { games } = CAST;

// A game with only its title, as G3 needs.
const fogLantern: GameRecord = {
  type: "base-game",
  baseGameId: null,
  title: "The Fog Lantern",
  year: null,
  publishers: null,
  designers: null,
  minPlayers: null,
  maxPlayers: null,
  bestPlayers: null,
  minMinutes: null,
  maxMinutes: null,
  minAge: null,
  complexity: null,
  categories: null,
  description: null,
  imageUrl: null,
  videoUrl: null,
};
const photo = {
  bytes: new Uint8Array([1, 2, 3]),
  contentType: "image/jpeg" as const,
};

describeEachBackend("suggestions", () => {
  let app: ReturnType<typeof makeApp>;
  const suggest = (userId: string, title = "Fog Lantern") =>
    app.suggestGame(
      { title, year: 2024, publisher: "Small Hours Press", sourceUrl: null },
      null,
      userId,
    );

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("takes a member's suggestion, and tells the admin (R4)", async () => {
    const suggestion = await suggest(sam.id);

    expect(suggestion).toMatchObject({
      createdBy: sam.id,
      title: "Fog Lantern",
      year: 2024,
      status: "waiting",
      imageUrl: null,
    });
    expect(
      (await app.noticesOf(you.id)).map(
        ({ type, gameSuggestionId, createdBy }) => ({
          type,
          gameSuggestionId,
          createdBy,
        }),
      ),
    ).toEqual([
      {
        type: "suggestion-arrived",
        gameSuggestionId: suggestion.id,
        createdBy: sam.id,
      },
    ]);
    // The admin's own suggestion tells no one.
    await suggest(you.id, "Paper Boats");
    expect(await app.noticesOf(you.id)).toHaveLength(1);
  });

  it("keeps a photo of the box in the public catalog bucket", async () => {
    const suggestion = await app.suggestGame(
      { title: "Fog Lantern", year: null, publisher: null, sourceUrl: null },
      photo,
      sam.id,
    );
    expect(suggestion.imageUrl).toContain("catalog-images");
    expect(
      [...app.files.keys()].some((key) => key.startsWith("catalog-images/")),
    ).toBe(true);
  });

  it("refuses every admin read and answer to anyone but the admin", async () => {
    const suggestion = await suggest(sam.id);
    for (const attempt of [
      () => app.listSuggestions(sam.id),
      () => app.listAnsweredSuggestions(sam.id),
      () => app.getSuggestion(suggestion.id, sam.id),
      () =>
        app.answerSuggestion(
          suggestion.id,
          { status: "declined", declineNote: "No" },
          sam.id,
        ),
      () => app.addGame(fogLantern, null, null, sam.id),
      () => app.updateGame(games.harborLights.id, fogLantern, null, sam.id),
      () => app.findGamesToEdit("harbor", sam.id),
      () => app.getGameToEdit(games.harborLights.id, sam.id),
    ]) {
      await expect(attempt()).rejects.toBeInstanceOf(UnauthorizedError);
    }
  });

  it("adds a suggestion by hand: the game lands on the suggester's shelf, and they're told", async () => {
    const suggestion = await suggest(priya.id);
    expect(
      (await app.listSuggestions(you.id)).map(({ suggestion, by }) => [
        suggestion.title,
        by?.name,
      ]),
    ).toEqual([["Fog Lantern", "Priya"]]);

    const game = await app.addGame(fogLantern, null, suggestion.id, you.id);
    expect(game).toMatchObject({
      title: "The Fog Lantern",
      searchTitle: "fog lantern",
    });

    const own = await app.repos.userGames.listOwn(priya.id);
    expect(own.some((copy) => copy.gameId === game.id)).toBe(true);
    expect(await app.listSuggestions(you.id)).toEqual([]);
    const [answered] = await app.listAnsweredSuggestions(you.id);
    expect(answered?.suggestion).toMatchObject({
      status: "added",
      gameId: game.id,
    });
    expect(answered?.game?.title).toBe("The Fog Lantern");
    expect(
      (await app.noticesOf(priya.id)).map(({ type, answerNote }) => [
        type,
        answerNote,
      ]),
    ).toEqual([["suggestion-answered", null]]);
  });

  it("answers that it's already here, which adds it to the suggester's shelf too", async () => {
    const suggestion = await suggest(sam.id, "Salt and Signal");
    await app.answerSuggestion(
      suggestion.id,
      { status: "already-here", gameId: games.saltAndSignal.id },
      you.id,
    );

    const own = await app.repos.userGames.listOwn(sam.id);
    expect(own.some((copy) => copy.gameId === games.saltAndSignal.id)).toBe(
      true,
    );
    expect(
      (await app.getSuggestion(suggestion.id, you.id)).suggestion.status,
    ).toBe("already-here");
  });

  it("declines with its reason, which the suggester's notice carries", async () => {
    const suggestion = await suggest(sam.id);
    await app.answerSuggestion(
      suggestion.id,
      { status: "declined", declineNote: "That's a puzzle, not a game." },
      you.id,
    );

    expect(
      (await app.noticesOf(sam.id)).map(({ answerNote }) => answerNote),
    ).toEqual(["That's a puzzle, not a game."]);
    // A second answer is refused.
    await expect(
      app.answerSuggestion(
        suggestion.id,
        { status: "declined", declineNote: "Again" },
        you.id,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
  });

  it("adds and corrects a game with only its title, writing its search title (R5)", async () => {
    const game = await app.addGame(fogLantern, photo, null, you.id);
    expect(game.imageUrl).toContain("catalog-images");

    const saved = await app.updateGame(
      game.id,
      { ...fogLantern, title: "Fog Lantern: Deluxe", complexity: "light" },
      null,
      you.id,
    );
    expect(saved).toMatchObject({
      title: "Fog Lantern: Deluxe",
      searchTitle: "fog lantern deluxe",
      complexity: "light",
    });
    expect(
      (await app.findGamesToEdit("fog lantern", you.id)).map(
        ({ title }) => title,
      ),
    ).toEqual(["Fog Lantern: Deluxe"]);
    expect((await app.getGameToEdit(game.id, you.id)).baseGame).toBeNull();
  });

  it("needs an expansion's base game to be a base game", async () => {
    await expect(
      app.addGame({ ...fogLantern, type: "expansion" }, null, null, you.id),
    ).rejects.toBeInstanceOf(InputParseError);
    await expect(
      app.addGame(
        { ...fogLantern, type: "expansion", baseGameId: games.lowTide.id },
        null,
        null,
        you.id,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    const night = await app.addGame(
      { ...fogLantern, type: "expansion", baseGameId: games.harborLights.id },
      null,
      null,
      you.id,
    );
    expect((await app.getGameToEdit(night.id, you.id)).baseGame?.title).toBe(
      "Harbor Lights",
    );
  });
});
