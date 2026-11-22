import { describe, expect, it } from "bun:test";
import {
  activeFilters,
  countLine,
  countMatches,
  dropWords,
  EMPTY_VIEW,
  filterWords,
  type LibraryItem,
  type LibraryView,
  libraryViewSearch,
  listLibrary,
  noMatchLine,
  parseLibraryView,
  withoutFilter,
} from "@/src/entities/library-filters";
import { CAST, castRows } from "@/tests/_support/cast";

const { people } = CAST;
const rows = castRows();
const gameOf = (title: string) => {
  const game = rows.games.find((one) => one.title === title);
  if (!game) {
    throw new Error(`No game ${title}`);
  }
  return game;
};

// The circle's shelves as All friends sees them for You, with the picks-ups B12 counts.
const items: LibraryItem[] = (
  [
    ["Harbor Lights", [people.sam.id, people.alice.id], true, "2026-07-20", 2],
    ["Moss & Mortar", [people.sam.id], false, "2026-07-14", 1],
    ["Quarry Lane", [people.sam.id], true, "2026-08-03", 0],
    ["Night Market", [people.you.id], true, "2026-07-12", 0],
    ["Gull & Anchor", [people.you.id], false, "2026-07-12", 3],
    ["Paper Kites", [people.you.id], false, "2026-07-12", 0],
    ["Salt & Signal", [people.you.id, people.jo.id], true, "2026-09-01", 0],
    ["Tin Kettle Derby", [people.alice.id], true, "2026-07-20", 1],
    ["Fenwick Fair", [people.priya.id], false, "2026-07-25", 2],
  ] as const
).map(([title, ownerIds, availableNow, added, borrowed]) => ({
  game: gameOf(title),
  ownerIds,
  availableNow,
  addedAt: new Date(`${added}T12:00:00-04:00`),
  borrowed,
}));

const titles = (view: Partial<LibraryView>) =>
  listLibrary(items, { ...EMPTY_VIEW, ...view }).items.map(
    ({ game }) => game.title,
  );

describe("the library's address (R13)", () => {
  it("reads back the view it writes", () => {
    const view: LibraryView = {
      available: true,
      owners: [people.sam.id, people.alice.id],
      players: { fit: "plays-best-with", count: 4 },
      time: "1-hour",
      complexities: ["light", "medium"],
      categories: ["Family"],
      age: 10,
      sort: "most-borrowed",
    };
    const search = libraryViewSearch(view);
    const params = Object.fromEntries(
      [...new URLSearchParams(search)].reduce((map, [key, value]) => {
        map.set(key, [...(map.get(key) ?? []), value]);
        return map;
      }, new Map<string, string[]>()),
    );

    expect(parseLibraryView(params)).toEqual(view);
    expect(search).toBe(
      `?available=now&owner=${people.sam.id}&owner=${people.alice.id}&plays-best-with=4&time=1-hour&complexity=light&complexity=medium&category=Family&age=10&sort=most-borrowed`,
    );
  });

  it("writes nothing for the plain list, and drops what it doesn't know", () => {
    expect(libraryViewSearch(EMPTY_VIEW)).toBe("");
    expect(
      parseLibraryView({
        available: "maybe",
        "plays-with": "lots",
        time: "forever",
        complexity: "brutal",
        sort: "price",
        age: "-3",
      }),
    ).toEqual(EMPTY_VIEW);
  });
});

describe("the library's filters (R11)", () => {
  it("lists every game by title", () => {
    expect(titles({})).toEqual([
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
  });

  it("keeps a game when any value of one filter matches, and every filter", () => {
    expect(titles({ owners: [people.sam.id, people.priya.id] })).toEqual([
      "Fenwick Fair",
      "Harbor Lights",
      "Moss & Mortar",
      "Quarry Lane",
    ]);
    expect(
      titles({ owners: [people.sam.id, people.priya.id], available: true }),
    ).toEqual(["Harbor Lights", "Quarry Lane"]);
  });

  it("plays with N inside the range, and plays best with N on the best counts", () => {
    expect(titles({ players: { fit: "plays-with", count: 6 } })).toEqual([
      "Night Market",
      "Quarry Lane",
      "Tin Kettle Derby",
    ]);
    expect(titles({ players: { fit: "plays-best-with", count: 4 } })).toEqual([
      "Harbor Lights",
      "Paper Kites",
    ]);
  });

  it("takes seven as seven or more", () => {
    expect(titles({ players: { fit: "plays-with", count: 7 } })).toEqual([
      "Tin Kettle Derby",
    ]);
    expect(parseLibraryView({ "plays-with": "9" }).players).toEqual({
      fit: "plays-with",
      count: 7,
    });
  });

  // B2's button counts the sheet's choices as they change.
  it("counts what a view keeps, for Show 2 games", () => {
    const { inView } = listLibrary(items, EMPTY_VIEW);
    expect(
      countMatches(inView, {
        ...EMPTY_VIEW,
        available: true,
        players: { fit: "plays-with", count: 4 },
        time: "1-hour",
      }),
    ).toBe(2);
    // Without Available now, Paper Kites, which isn't lent, and Fenwick Fair and Gull & Anchor,
    // which are out, come back.
    expect(
      countMatches(inView, {
        ...EMPTY_VIEW,
        players: { fit: "plays-with", count: 4 },
        time: "1-hour",
      }),
    ).toBe(5);
  });

  it("caps play time at the game's longest play", () => {
    expect(titles({ time: "30-minutes" })).toEqual([
      "Paper Kites",
      "Salt & Signal",
      "Tin Kettle Derby",
    ]);
    expect(titles({ time: "1-hour" })).toEqual([
      "Fenwick Fair",
      "Gull & Anchor",
      "Harbor Lights",
      "Paper Kites",
      "Salt & Signal",
      "Tin Kettle Derby",
    ]);
  });

  it("filters by complexity, category and a player's age", () => {
    expect(titles({ complexities: ["heavy"] })).toEqual(["Moss & Mortar"]);
    expect(titles({ categories: ["Family"] })).toEqual([
      "Harbor Lights",
      "Night Market",
    ]);
    expect(titles({ age: 8 })).toEqual([
      "Fenwick Fair",
      "Gull & Anchor",
      "Paper Kites",
      "Tin Kettle Derby",
    ]);
  });

  // R11's revision: a filter shows only when some game in view has its value.
  it("offers only the values some game has", () => {
    const { offered } = listLibrary(items, EMPTY_VIEW);
    // Tin Kettle Derby plays with up to eight: B2's last die, 7+.
    expect(offered.players).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(offered.bestPlayers).toEqual([2, 3, 4, 5, 6]);
    expect(offered.times).toEqual(["30-minutes", "1-hour", "2-hours"]);
    expect(offered.complexities).toEqual(["light", "medium", "heavy"]);
    expect(offered.categories).toEqual(["Economic", "Family", "Nautical"]);
    expect(offered.ages).toEqual([8, 10, 12]);

    const light = listLibrary(
      items.filter(({ game }) => game.complexity === "light"),
      EMPTY_VIEW,
    ).offered;
    expect(light.categories).toEqual([]);
    expect(light.complexities).toEqual(["light"]);
  });

  // B4: the filter to drop, with how many games that brings back.
  it("names the filter whose dropping brings back the most", () => {
    const view: LibraryView = {
      ...EMPTY_VIEW,
      complexities: ["heavy"],
      time: "30-minutes",
    };
    const list = listLibrary(items, view);

    expect(list.items).toEqual([]);
    // Dropping heavy brings back the three short games; dropping the cap, only Moss & Mortar.
    expect(list.suggestion).toEqual({
      filter: { kind: "complexity", complexity: "heavy" },
      count: 3,
    });
    expect(listLibrary(items, EMPTY_VIEW).suggestion).toBeNull();
  });

  it("takes one filter off and keeps the rest", () => {
    const view: LibraryView = {
      ...EMPTY_VIEW,
      available: true,
      owners: [people.sam.id, people.alice.id],
    };
    const [available, sam] = activeFilters(view);
    expect(available).toEqual({ kind: "available" });
    expect(sam && withoutFilter(view, sam).owners).toEqual([people.alice.id]);
  });
});

describe("the library's sorts (R12)", () => {
  it("sorts by each, then by title", () => {
    expect(titles({ sort: "recently-added" }).slice(0, 3)).toEqual([
      "Salt & Signal",
      "Quarry Lane",
      "Fenwick Fair",
    ]);
    expect(titles({ sort: "complexity" }).slice(0, 3)).toEqual([
      "Paper Kites",
      "Salt & Signal",
      "Tin Kettle Derby",
    ]);
    expect(titles({ sort: "play-time" }).slice(0, 2)).toEqual([
      "Tin Kettle Derby",
      "Paper Kites",
    ]);
    expect(titles({ sort: "year" }).slice(0, 2)).toEqual([
      "Tin Kettle Derby",
      "Salt & Signal",
    ]);
    expect(titles({ sort: "most-borrowed" }).slice(0, 3)).toEqual([
      "Gull & Anchor",
      "Fenwick Fair",
      "Harbor Lights",
    ]);
  });
});

describe("the library's words (B1 to B4)", () => {
  const ownerWords = (userId: string) =>
    userId === people.you.id ? "Yours" : "Sam’s";

  it("words each chip as B3 and B4 do", () => {
    const view: LibraryView = {
      ...EMPTY_VIEW,
      players: { fit: "plays-with", count: 4 },
      complexities: ["heavy"],
      time: "30-minutes",
      available: true,
      owners: [people.you.id, people.sam.id],
    };
    expect(
      activeFilters(view).map((filter) => filterWords(filter, ownerWords)),
    ).toEqual([
      "4 players",
      "Complexity: heavy",
      "30 min or less",
      "Available now",
      "Yours",
      "Sam’s",
    ]);
    expect(
      filterWords(
        { kind: "players", fit: "plays-best-with", count: 7 },
        ownerWords,
      ),
    ).toBe("Best at 7+");
  });

  it("says the count, with the sort only while nothing filters it", () => {
    expect(countLine(9, EMPTY_VIEW)).toBe("9 games · by title");
    expect(countLine(2, { ...EMPTY_VIEW, available: true })).toBe("2 games");
    expect(countLine(1, { ...EMPTY_VIEW, sort: "year" })).toBe(
      "1 game · newest first",
    );
  });

  // B4's own example.
  it("says why nothing matches, and the way out", () => {
    const b4: LibraryView = {
      ...EMPTY_VIEW,
      players: { fit: "plays-with", count: 4 },
      complexities: ["heavy"],
      time: "30-minutes",
    };
    expect(noMatchLine(b4, "everyone")).toBe(
      "No one’s library has a heavy game for four that plays in 30 minutes or less.",
    );
    expect(noMatchLine(b4, "yours")).toBe(
      "Your library has no heavy game for four that plays in 30 minutes or less.",
    );
    expect(dropWords("30 min or less", 1)).toBe(
      "Without “30 min or less”: 1 game",
    );
    expect(
      noMatchLine({ ...EMPTY_VIEW, categories: ["Family"] }, "everyone"),
    ).toBe("No game in your library or your friends’ matches all of these.");
  });
});
