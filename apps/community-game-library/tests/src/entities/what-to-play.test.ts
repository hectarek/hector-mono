import { describe, expect, it } from "bun:test";
import {
  leftOutWords,
  offersComplexity,
  type PlayGame,
  startingTime,
  whatToPlay,
} from "@/src/entities/what-to-play";

describe("leftOutWords (Hector, 2026-11-25)", () => {
  const reasons = (count: number) =>
    Array.from({ length: count }, (_, index) => ({
      reason: `Game ${index + 1} seats 2.`,
    }));

  it("gives every reason while three or fewer are left out", () => {
    expect(leftOutWords(reasons(3))).toBe(
      "Game 1 seats 2. Game 2 seats 2. Game 3 seats 2.",
    );
    expect(leftOutWords(reasons(1))).toBe("Game 1 seats 2.");
  });

  it("gives the first three, then how many more", () => {
    expect(leftOutWords(reasons(4))).toBe(
      "Game 1 seats 2. Game 2 seats 2. Game 3 seats 2. And 1 more game is left out.",
    );
    expect(leftOutWords(reasons(23))).toBe(
      "Game 1 seats 2. Game 2 seats 2. Game 3 seats 2. And 20 more games are left out.",
    );
  });
});

describe("offersComplexity (R11, U24)", () => {
  it("offers the choice while a game has a complexity, or while one is picked", () => {
    expect(
      offersComplexity([{ complexity: null }, { complexity: "light" }], null),
    ).toBe(true);
    expect(offersComplexity([{ complexity: "heavy" }], "new-players")).toBe(
      true,
    );
  });

  it("leaves it out when no game has one, as with the catalog's own games, until one is picked", () => {
    expect(offersComplexity([{ complexity: null }], null)).toBe(false);
    expect(offersComplexity([], null)).toBe(false);
    // Picked on the table, then From moved to games with none: it stays, to be cleared.
    expect(offersComplexity([{ complexity: null }], "medium")).toBe(true);
  });
});

const game = (title: string, facts: Partial<PlayGame> = {}): PlayGame => ({
  id: title,
  title,
  minPlayers: 2,
  maxPlayers: 6,
  bestPlayers: null,
  minMinutes: 30,
  maxMinutes: 60,
  complexity: "medium",
  popularity: null,
  onTable: false,
  votes: 0,
  ...facts,
});
const titles = (fits: { game: PlayGame }[]) =>
  fits.map(({ game }) => game.title);

describe("What should we play? (KTD23, R37)", () => {
  it("AE6: with 5 people and 90 minutes, best at 4 to 5 in 60 minutes ranks above best at 3, and longer than 90 doesn't fit", () => {
    const { fits, leftOut } = whatToPlay(
      [
        game("Plays at 5, best at 3", { bestPlayers: [3] }),
        game("Best at 4 to 5", { bestPlayers: [4, 5], maxMinutes: 60 }),
        game("Too long", { bestPlayers: [5], maxMinutes: 120 }),
      ],
      { people: 5, minutes: 90, complexity: null },
    );
    expect(titles(fits)).toEqual(["Best at 4 to 5", "Plays at 5, best at 3"]);
    expect(leftOut).toEqual([
      {
        game: expect.objectContaining({ title: "Too long" }),
        reason: "Too long takes 120 min.",
      },
    ]);
  });

  const leftOutFor = (
    facts: Partial<PlayGame>,
    complexity: "light" | "medium" | "heavy" | "new-players" | null = null,
  ) =>
    whatToPlay([game("Gull & Anchor", facts)], {
      people: 6,
      minutes: 90,
      complexity,
    }).leftOut[0]?.reason ?? null;

  it.each([
    [
      "seats fewer, with a range",
      { maxPlayers: 5 },
      null,
      "Gull & Anchor seats 5 at most.",
    ],
    [
      "seats exactly fewer",
      { minPlayers: 2, maxPlayers: 2 },
      null,
      "Gull & Anchor seats 2.",
    ],
    [
      "needs more",
      { minPlayers: 8, maxPlayers: 10 },
      null,
      "Gull & Anchor needs 8 at least.",
    ],
    [
      "has no player count",
      { minPlayers: null },
      null,
      "Gull & Anchor has no player count.",
    ],
    ["takes longer", { maxMinutes: 120 }, null, "Gull & Anchor takes 120 min."],
    [
      "has only a shortest time, too long",
      { minMinutes: 100, maxMinutes: null },
      null,
      "Gull & Anchor takes 100 min.",
    ],
    [
      "has no play time",
      { minMinutes: null, maxMinutes: null },
      null,
      "Gull & Anchor has no play time.",
    ],
    [
      "is another complexity",
      { complexity: "heavy" },
      "light",
      "Gull & Anchor is heavy.",
    ],
    [
      "isn't light for new players",
      { complexity: "medium" },
      "new-players",
      "Gull & Anchor is medium.",
    ],
    [
      "has no complexity when one is picked",
      { complexity: null },
      "medium",
      "Gull & Anchor has no complexity.",
    ],
    [
      "fits with no complexity when none is picked",
      { complexity: null },
      null,
      null,
    ],
    [
      "fits light for new players",
      { complexity: "light" },
      "new-players",
      null,
    ],
  ] as const)("a game that %s", (_label, facts, complexity, reason) => {
    expect(leftOutFor(facts, complexity)).toBe(reason);
  });

  it("orders the fits: best at the count, then more votes, then popularity, then the title", () => {
    const { fits } = whatToPlay(
      [
        game("Zebra", { popularity: 10 }),
        game("Alpha"),
        game("Voted", { votes: 2, onTable: true }),
        game("Popular", { popularity: 50 }),
        game("Best", { bestPlayers: [4] }),
      ],
      { people: 4, minutes: 90, complexity: null },
    );
    expect(titles(fits)).toEqual([
      "Best",
      "Voted",
      "Popular",
      "Zebra",
      "Alpha",
    ]);
  });

  it("says why each fits, from the facts the game has", () => {
    const [fit] = whatToPlay(
      [
        game("Quarry Lane", {
          bestPlayers: [5],
          minMinutes: 90,
          maxMinutes: 90,
        }),
      ],
      { people: 6, minutes: 180, complexity: null },
    ).fits;
    expect(fit).toMatchObject({
      players: "Plays 6, best at 5",
      facts: "90 min · medium",
    });
    const [bare] = whatToPlay(
      [game("Bare", { complexity: null, minMinutes: 20, maxMinutes: 20 })],
      { people: 3, minutes: 60, complexity: null },
    ).fits;
    expect(bare).toMatchObject({ players: "Plays 3", facts: "20 min" });
  });

  it("starts with the longest time that fits the night, or 2 hours with no end", () => {
    const at = (time: string) => new Date(`2026-11-20T${time}:00-05:00`);
    expect(startingTime(at("19:00"), at("22:30"))).toBe(180);
    expect(startingTime(at("19:00"), at("21:00"))).toBe(120);
    expect(startingTime(at("19:00"), at("20:40"))).toBe(90);
    expect(startingTime(at("19:00"), at("19:45"))).toBe(60);
    expect(startingTime(at("19:00"), null)).toBe(120);
  });
});
