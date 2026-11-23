import { describe, expect, it } from "bun:test";
import {
  cardLine,
  catalogLine,
  gameFacts,
  tableLine,
  titleLine,
} from "@/src/entities/game-facts";
import type { Game } from "@/src/entities/models/game.model";
import { CAST, castRows } from "@/tests/_support/cast";

const castGame = (id: string): Game => {
  const game = castRows().games.find((row) => row.id === id);
  if (!game) {
    throw new Error(`No cast game ${id}`);
  }
  return game;
};
const harborLights = castGame(CAST.games.harborLights.id);
const texts = (game: Game) => gameFacts(game).map(({ text }) => text);

// A game with nothing but its title, as the catalog allows (R1).
const bare: Game = {
  ...harborLights,
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
};

describe("game-facts", () => {
  it("words B5's facts", () => {
    expect(texts(harborLights)).toEqual([
      "2–5 players · best at 4",
      "45–60 min",
      "Age 10+",
      "Complexity: medium",
    ]);
    expect(titleLine(harborLights)).toBe(
      "2019 · Tidewater Games · designed by Ines Varga",
    );
    expect(cardLine(harborLights)).toBe("2–5 · 45–60 min");
  });

  it("words a search row's line with the year and the publisher, or expansion (B10)", () => {
    expect(catalogLine(castGame(CAST.games.harborMaster.id))).toBe(
      "1998 · Bellwether & Co.",
    );
    expect(catalogLine(castGame(CAST.games.nightTide.id))).toBe(
      "2021 · expansion",
    );
  });

  it("words a game's line on a night's table (D2, D7)", () => {
    expect(tableLine(harborLights)).toBe("Best at 4 · 45–60 min");
    expect(tableLine(castGame(CAST.games.saltAndSignal.id))).toBe(
      "2 players only · 30 min",
    );
    expect(tableLine({ ...bare, minPlayers: 2, maxPlayers: 4 })).toBe("2–4");
    expect(tableLine(bare)).toBe("");
  });

  it("shows only what a game has (rule 14)", () => {
    expect(gameFacts(bare)).toEqual([]);
    expect(titleLine(bare)).toBe("");
    expect(catalogLine(bare)).toBe("");
    expect(cardLine(bare)).toBe("");
    expect(texts({ ...bare, minAge: 8 })).toEqual(["Age 8+"]);
    expect(texts({ ...bare, maxMinutes: 30 })).toEqual(["30 min"]);
  });

  it("words one count, two best counts and two designers", () => {
    expect(texts({ ...bare, minPlayers: 1, maxPlayers: 1 })).toEqual([
      "1 player",
    ]);
    expect(
      texts({ ...bare, minPlayers: 2, maxPlayers: 6, bestPlayers: [3, 4] }),
    ).toEqual(["2–6 players · best at 3 or 4"]);
    expect(
      titleLine({ ...bare, designers: ["Ines Varga", "Tomas Reyes"] }),
    ).toBe("designed by Ines Varga and Tomas Reyes");
  });
});
