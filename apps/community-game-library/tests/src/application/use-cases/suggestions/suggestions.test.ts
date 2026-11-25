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
  imageCredit: null,
  imageSourceUrl: null,
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
      () => app.listCategories(sam.id),
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

  it("drops an image's credit with the image, unless the admin changes the credit too", async () => {
    const credited = {
      ...fogLantern,
      imageUrl: "https://images.example/fog-lantern-500px.jpg",
      imageCredit: "Ines Varga, CC BY-SA 4.0",
      imageSourceUrl: "https://images.example/File:Fog_Lantern.jpg",
    };
    const game = await app.addGame(credited, null, null, you.id);
    const credit = (saved: GameRecord) => [
      saved.imageUrl,
      saved.imageCredit,
      saved.imageSourceUrl,
    ];

    // Saved with the same image, the credit stays.
    expect(
      credit(await app.updateGame(game.id, credited, null, you.id)),
    ).toEqual(credit(credited));
    // A new image typed with a credit for it keeps that credit.
    const retaken = {
      ...credited,
      imageUrl: "https://images.example/fog-lantern-box.jpg",
      imageCredit: "Tom Reed, CC BY 4.0",
    };
    expect(
      credit(await app.updateGame(game.id, retaken, null, you.id)),
    ).toEqual(credit(retaken));
    // An uploaded photo leaves the old credit behind.
    const uploaded = await app.updateGame(game.id, retaken, photo, you.id);
    expect(uploaded.imageUrl).toContain("catalog-images");
    expect([uploaded.imageCredit, uploaded.imageSourceUrl]).toEqual([
      null,
      null,
    ]);
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

  it("marks a game in the catalog an expansion, and a base game again (G4)", async () => {
    const fog = await app.addGame(fogLantern, null, null, you.id);
    const ofHarborLights = {
      ...fogLantern,
      type: "expansion",
      baseGameId: games.harborLights.id,
    } as const;

    expect(
      await app.updateGame(fog.id, ofHarborLights, null, you.id),
    ).toMatchObject({ type: "expansion", baseGameId: games.harborLights.id });
    expect((await app.getGameToEdit(fog.id, you.id)).baseGame?.title).toBe(
      "Harbor Lights",
    );
    expect(
      (await app.repos.games.listExpansions(games.harborLights.id)).map(
        ({ id }) => id,
      ),
    ).toContain(fog.id);
    expect(
      await app.updateGame(fog.id, fogLantern, null, you.id),
    ).toMatchObject({ type: "base-game", baseGameId: null });
  });

  it("keeps a game from being its own base game, or an expansion while it has its own", async () => {
    const fog = await app.addGame(fogLantern, null, null, you.id);
    await expect(
      app.updateGame(
        fog.id,
        { ...fogLantern, type: "expansion", baseGameId: fog.id },
        null,
        you.id,
      ),
    ).rejects.toThrow("A game can’t be an expansion of itself");
    // Harbor Lights has Night Tide, which would be an expansion's expansion.
    await expect(
      app.updateGame(
        games.harborLights.id,
        {
          ...fogLantern,
          title: "Harbor Lights",
          type: "expansion",
          baseGameId: games.gullAndAnchor.id,
        },
        null,
        you.id,
      ),
    ).rejects.toThrow(
      "A game with expansions of its own can’t be an expansion",
    );
    expect(await app.repos.games.getById(games.harborLights.id)).toMatchObject({
      type: "base-game",
      baseGameId: null,
    });
  });

  it("keeps a game members own a base game, and an expansion in someone’s box an expansion (G4)", async () => {
    // Paper Kites is on your shelf.
    await expect(
      app.updateGame(
        games.paperKites.id,
        {
          ...fogLantern,
          title: "Paper Kites",
          type: "expansion",
          baseGameId: games.gullAndAnchor.id,
        },
        null,
        you.id,
      ),
    ).rejects.toThrow("Members own this game, so it can’t become an expansion");
    // Low Tide is in the box of your Gull & Anchor.
    const lowTide = {
      ...fogLantern,
      title: "Gull & Anchor: Low Tide",
      type: "expansion",
      baseGameId: games.gullAndAnchor.id,
    } as const;
    await expect(
      app.updateGame(
        games.lowTide.id,
        { ...lowTide, type: "base-game", baseGameId: null },
        null,
        you.id,
      ),
    ).rejects.toThrow(
      "This expansion is in someone’s box, so it can’t become a base game",
    );
    // Nor does it become another game's expansion while it's in that box.
    await expect(
      app.updateGame(
        games.lowTide.id,
        { ...lowTide, baseGameId: games.harborLights.id },
        null,
        you.id,
      ),
    ).rejects.toThrow(
      "This expansion is in someone’s box, so its base game can’t change",
    );
    expect(await app.repos.games.getById(games.paperKites.id)).toMatchObject({
      type: "base-game",
      baseGameId: null,
    });
    expect(await app.repos.games.getById(games.lowTide.id)).toMatchObject({
      type: "expansion",
      baseGameId: games.gullAndAnchor.id,
    });
    // Its other fields still change while it stays an expansion of the same game.
    expect(
      await app.updateGame(
        games.lowTide.id,
        { ...lowTide, year: 2021 },
        null,
        you.id,
      ),
    ).toMatchObject({
      type: "expansion",
      baseGameId: games.gullAndAnchor.id,
      year: 2021,
    });
  });

  it("adds a suggestion as an expansion: they're told, and it stays off their shelf", async () => {
    const suggestion = await suggest(priya.id);
    const game = await app.addGame(
      { ...fogLantern, type: "expansion", baseGameId: games.harborLights.id },
      null,
      suggestion.id,
      you.id,
    );

    expect(
      (await app.repos.userGames.listOwn(priya.id)).some(
        (copy) => copy.gameId === game.id,
      ),
    ).toBe(false);
    expect((await app.noticesOf(priya.id)).map(({ type }) => type)).toEqual([
      "suggestion-answered",
    ]);
  });

  it("gives the admin the catalog's categories, the most used first (G3)", async () => {
    await app.addGame(
      { ...fogLantern, categories: ["Nautical", "Dice"] },
      null,
      null,
      you.id,
    );
    expect(await app.listCategories(you.id)).toEqual([
      "Family",
      "Nautical",
      "Dice",
      "Economic",
    ]);
  });
});
