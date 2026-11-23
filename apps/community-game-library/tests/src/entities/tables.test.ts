import { describe, expect, it } from "bun:test";
import { splitTables } from "@/src/entities/tables";
import type { PlayGame } from "@/src/entities/what-to-play";

const game = (title: string, facts: Partial<PlayGame> = {}): PlayGame => ({
  id: title,
  title,
  minPlayers: 2,
  maxPlayers: 4,
  bestPlayers: null,
  minMinutes: 30,
  maxMinutes: 60,
  complexity: null,
  popularity: null,
  onTable: true,
  votes: 0,
  ...facts,
});
const party = (name: string, guests = 0) => ({ member: name, guests });
const seats = (table: { parties: { member: string; guests: number }[] }) =>
  table.parties.flatMap(({ member, guests }) => [
    member,
    ...Array.from({ length: guests }, () => `${member}’s guest`),
  ]);

// D9's night: you hosting, then Sam, Priya, Jo, and Ben with a guest.
const heavy = [
  party("You"),
  party("Sam"),
  party("Priya"),
  party("Jo"),
  party("Ben", 1),
];

describe("Split into tables (KTD23, R46)", () => {
  it("splits 6 into the fewest even tables, the host first and a guest beside their member, no game twice", () => {
    const { splits } = splitTables(
      heavy,
      [
        game("Quarry Lane", { votes: 4 }),
        game("Night Market", { votes: 3 }),
        game("Harbor Lights", { votes: 1 }),
      ],
      [],
      180,
    );
    const [first] = splits;
    expect(first?.map((table) => [table.fit.game.title, seats(table)])).toEqual(
      [
        ["Quarry Lane", ["You", "Sam", "Priya"]],
        ["Night Market", ["Jo", "Ben", "Ben’s guest"]],
      ],
    );
  });

  it("offers one table for all when a game seats everyone", () => {
    const { oneTable } = splitTables(
      heavy,
      [
        game("Night Market", { maxPlayers: 6, bestPlayers: [5] }),
        game("Harbor Lights"),
      ],
      [],
      180,
    );
    expect(oneTable?.game.title).toBe("Night Market");
    expect(oneTable?.players).toBe("Plays 6, best at 5");
  });

  it("moves to more tables when fewer don't fit a game, and lists each split that works", () => {
    // Games for 2 only: 6 people need 3 tables.
    const twos = ["A", "B", "C"].map((title) =>
      game(title, { minPlayers: 2, maxPlayers: 2 }),
    );
    const { splits, oneTable } = splitTables(heavy, twos, [], 180);
    expect(splits.map((split) => split.map((table) => table.size))).toEqual([
      [2, 2, 2],
    ]);
    expect(oneTable).toBeNull();
  });

  it("keeps a member and their guests at one table, even when the sizes can't be even", () => {
    const { splits } = splitTables(
      [party("You"), party("Ben", 2), party("Sam")],
      [game("Four"), game("Two", { maxPlayers: 2 }), game("Other")],
      [],
      180,
    );
    expect(splits[0]?.map((table) => seats(table))).toEqual([
      ["You", "Sam"],
      ["Ben", "Ben’s guest", "Ben’s guest"],
    ]);
  });

  it("uses all friends' games when nothing on the table fits, and says so", () => {
    const result = splitTables(
      heavy,
      [game("Salt & Signal", { minPlayers: 2, maxPlayers: 2 })],
      [
        game("Quarry Lane", { maxPlayers: 6 }),
        game("Night Market", { maxPlayers: 6 }),
      ],
      180,
    );
    expect(result.fromTable).toBe(false);
    expect(result.splits[0]?.map((table) => table.fit.game.title)).toEqual([
      "Night Market",
      "Quarry Lane",
    ]);
  });

  it("leaves out games that don't fit the time", () => {
    const { splits } = splitTables(
      heavy,
      [game("Long", { maxMinutes: 240 }), game("Short"), game("Also short")],
      [],
      90,
    );
    expect(splits[0]?.map((table) => table.fit.game.title)).toEqual([
      "Also short",
      "Short",
    ]);
  });
});
