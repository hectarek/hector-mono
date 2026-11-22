import { GAME_COMPLEXITIES, type Game } from "@/src/entities/models/game.model";

// The library's filters and sorts (R11 to R13, B1 to B4, B12): what the page's address says, what
// each keeps, which to offer, B4's way out of a view that matches nothing, and their words. Within
// one filter any value matches; across filters, every one must. A filter keeps a game when any of
// its copies matches, and the game's card stays whole (B3's Harbor Lights).

// Play time is a cap (R11's audit line): the game's longest play fits under it.
export const PLAY_TIMES = [
  { value: "30-minutes", minutes: 30, words: "30 min or less" },
  { value: "1-hour", minutes: 60, words: "1 hour or less" },
  { value: "2-hours", minutes: 120, words: "2 hours or less" },
] as const;
export type PlayTime = (typeof PLAY_TIMES)[number]["value"];

// The player count starts on plays with (R11's audit line). B2's dice run to six, then 7+.
const PLAYER_FITS = ["plays-with", "plays-best-with"] as const;
export type PlayerFit = (typeof PLAYER_FITS)[number];
const MOST_PLAYERS = 7;

export const LIBRARY_SORTS = [
  "title",
  "recently-added",
  "complexity",
  "play-time",
  "year",
  "most-borrowed",
] as const;
export type LibrarySort = (typeof LIBRARY_SORTS)[number];

// Each sort in B12's words, on its button ("Sort: Title") and after the count ("9 games · by
// title", B1).
export const SORT_WORDS: Record<
  LibrarySort,
  { option: string; button: string; count: string }
> = {
  title: { option: "Title, A to Z", button: "Title", count: "by title" },
  "recently-added": {
    option: "Recently added",
    button: "Recently added",
    count: "recently added first",
  },
  complexity: {
    option: "Complexity, lightest first",
    button: "Complexity",
    count: "lightest first",
  },
  "play-time": {
    option: "Play time, shortest first",
    button: "Play time",
    count: "shortest first",
  },
  year: { option: "Year, newest first", button: "Year", count: "newest first" },
  "most-borrowed": {
    option: "Most borrowed",
    button: "Most borrowed",
    count: "most borrowed first",
  },
};

export type GameComplexity = (typeof GAME_COMPLEXITIES)[number];

export type LibraryView = {
  available: boolean;
  owners: string[];
  // A count from one to seven, seven meaning seven or more.
  players: { fit: PlayerFit; count: number } | null;
  time: PlayTime | null;
  complexities: GameComplexity[];
  categories: string[];
  // A player's age: the games whose minimum age is at or under it.
  age: number | null;
  sort: LibrarySort;
};

export const EMPTY_VIEW: LibraryView = {
  available: false,
  owners: [],
  players: null,
  time: null,
  complexities: [],
  categories: [],
  age: null,
  sort: "title",
};

// What a filter reads of a game, small enough to hand the filter sheet for its live count.
export type GameFacts = Pick<
  Game,
  | "minPlayers"
  | "maxPlayers"
  | "bestPlayers"
  | "minMinutes"
  | "maxMinutes"
  | "complexity"
  | "categories"
  | "minAge"
>;

export type FilterableItem = {
  game: GameFacts;
  ownerIds: readonly string[];
  availableNow: boolean;
};

// One thing in a library list, as the filters and sorts see it: a game in All friends, a copy in
// My library.
export type LibraryItem = FilterableItem & {
  game: Game;
  addedAt: Date;
  borrowed: number;
};

type Params = Record<string, string | string[] | undefined>;

const all = (params: Params, key: string): string[] => {
  const value = params[key];
  return (Array.isArray(value) ? value : value === undefined ? [] : [value])
    .flatMap((one) => one.split(","))
    .map((one) => one.trim())
    .filter((one) => one !== "");
};
const first = (params: Params, key: string) => all(params, key)[0];
const count = (text: string | undefined) => {
  const value = Number(text);
  return Number.isInteger(value) && value > 0 && value < 100 ? value : null;
};
const isOneOf = <T extends string>(
  list: readonly T[],
  value: unknown,
): value is T =>
  typeof value === "string" && (list as readonly string[]).includes(value);

// The address's values (R13). One the list doesn't know is left out, as if it weren't there:
// a link shared in the group chat may be older than the filters.
export function parseLibraryView(params: Params): LibraryView {
  const playsWith = count(first(params, "plays-with"));
  const playsBestWith = count(first(params, "plays-best-with"));
  const time = first(params, "time");
  const sort = first(params, "sort");
  return {
    available: first(params, "available") === "now",
    owners: [...new Set(all(params, "owner"))],
    players:
      playsBestWith !== null
        ? {
            fit: "plays-best-with",
            count: Math.min(playsBestWith, MOST_PLAYERS),
          }
        : playsWith !== null
          ? { fit: "plays-with", count: Math.min(playsWith, MOST_PLAYERS) }
          : null,
    time: PLAY_TIMES.find(({ value }) => value === time)?.value ?? null,
    complexities: GAME_COMPLEXITIES.filter((level) =>
      all(params, "complexity").includes(level),
    ),
    categories: [...new Set(all(params, "category"))],
    age: count(first(params, "age")),
    sort: isOneOf(LIBRARY_SORTS, sort) ? sort : "title",
  };
}

// The address for a view: only what differs from the plain list, in a fixed order, so the same
// view always has the same address.
export function libraryViewSearch(view: LibraryView): string {
  const params = new URLSearchParams();
  if (view.available) {
    params.append("available", "now");
  }
  for (const owner of view.owners) {
    params.append("owner", owner);
  }
  if (view.players) {
    params.append(view.players.fit, `${view.players.count}`);
  }
  if (view.time) {
    params.append("time", view.time);
  }
  for (const level of view.complexities) {
    params.append("complexity", level);
  }
  for (const category of view.categories) {
    params.append("category", category);
  }
  if (view.age !== null) {
    params.append("age", `${view.age}`);
  }
  if (view.sort !== "title") {
    params.append("sort", view.sort);
  }
  const search = params.toString();
  return search === "" ? "" : `?${search}`;
}

// The filters a view has on, each on its own (B3's chips), in the chips' order: players,
// complexity, play time and available now as B3 and B4 draw them, then owners, categories and age.
// Taking one off keeps the rest.
export type ActiveFilter =
  | { kind: "players"; fit: PlayerFit; count: number }
  | { kind: "complexity"; complexity: GameComplexity }
  | { kind: "time"; time: PlayTime }
  | { kind: "available" }
  | { kind: "owner"; userId: string }
  | { kind: "category"; category: string }
  | { kind: "age"; age: number };

export function activeFilters(view: LibraryView): ActiveFilter[] {
  return [
    ...(view.players ? [{ kind: "players", ...view.players } as const] : []),
    ...view.complexities.map(
      (complexity) => ({ kind: "complexity", complexity }) as const,
    ),
    ...(view.time ? [{ kind: "time", time: view.time } as const] : []),
    ...(view.available ? [{ kind: "available" } as const] : []),
    ...view.owners.map((userId) => ({ kind: "owner", userId }) as const),
    ...view.categories.map(
      (category) => ({ kind: "category", category }) as const,
    ),
    ...(view.age !== null ? [{ kind: "age", age: view.age } as const] : []),
  ];
}

export function withoutFilter(
  view: LibraryView,
  filter: ActiveFilter,
): LibraryView {
  switch (filter.kind) {
    case "players":
      return { ...view, players: null };
    case "complexity":
      return {
        ...view,
        complexities: view.complexities.filter(
          (level) => level !== filter.complexity,
        ),
      };
    case "time":
      return { ...view, time: null };
    case "available":
      return { ...view, available: false };
    case "owner":
      return {
        ...view,
        owners: view.owners.filter((id) => id !== filter.userId),
      };
    case "category":
      return {
        ...view,
        categories: view.categories.filter(
          (category) => category !== filter.category,
        ),
      };
    case "age":
      return { ...view, age: null };
  }
}

export const withoutFilters = (view: LibraryView): LibraryView => ({
  ...EMPTY_VIEW,
  sort: view.sort,
});

// The game's longest play, or its only one.
const longest = (game: GameFacts) => game.maxMinutes ?? game.minMinutes;

function fits(game: GameFacts, players: { fit: PlayerFit; count: number }) {
  if (players.fit === "plays-best-with") {
    return (game.bestPlayers ?? []).some((best) =>
      players.count === MOST_PLAYERS
        ? best >= MOST_PLAYERS
        : best === players.count,
    );
  }
  if (game.minPlayers === null) {
    return false;
  }
  const max = game.maxPlayers ?? game.minPlayers;
  return players.count === MOST_PLAYERS
    ? max >= MOST_PLAYERS
    : game.minPlayers <= players.count && max >= players.count;
}

function keeps(item: FilterableItem, view: LibraryView): boolean {
  const { game } = item;
  const cap = PLAY_TIMES.find(({ value }) => value === view.time)?.minutes;
  return (
    (!view.available || item.availableNow) &&
    (view.owners.length === 0 ||
      item.ownerIds.some((id) => view.owners.includes(id))) &&
    (view.players === null || fits(game, view.players)) &&
    (cap === undefined || (longest(game) ?? Number.POSITIVE_INFINITY) <= cap) &&
    (view.complexities.length === 0 ||
      (game.complexity !== null &&
        view.complexities.includes(game.complexity))) &&
    (view.categories.length === 0 ||
      (game.categories ?? []).some((category) =>
        view.categories.includes(category),
      )) &&
    (view.age === null || (game.minAge !== null && game.minAge <= view.age))
  );
}

// How many a view keeps: the filter sheet's "Show 2 games" as choices change.
export const countMatches = (
  items: readonly FilterableItem[],
  view: LibraryView,
): number => items.filter((item) => keeps(item, view)).length;

const compare = (a: string | number, b: string | number) =>
  a < b ? -1 : a > b ? 1 : 0;
const complexityRank = (level: GameComplexity | null) =>
  level === null ? GAME_COMPLEXITIES.length : GAME_COMPLEXITIES.indexOf(level);

// Each sort's order, a game without the sort's value last (rule 14), then the title as search
// sorts it (code-point order).
function sorter(sort: LibrarySort) {
  const byTitle = (a: LibraryItem, b: LibraryItem) =>
    compare(a.game.searchTitle, b.game.searchTitle) ||
    compare(a.game.id, b.game.id);
  const then =
    (order: (a: LibraryItem, b: LibraryItem) => number) =>
    (a: LibraryItem, b: LibraryItem) =>
      order(a, b) || byTitle(a, b);
  switch (sort) {
    case "title":
      return byTitle;
    // Its newest copy on a shelf first.
    case "recently-added":
      return then((a, b) => b.addedAt.getTime() - a.addedAt.getTime());
    case "complexity":
      return then(
        (a, b) =>
          complexityRank(a.game.complexity) - complexityRank(b.game.complexity),
      );
    case "play-time":
      return then(
        (a, b) =>
          (longest(a.game) ?? Number.POSITIVE_INFINITY) -
          (longest(b.game) ?? Number.POSITIVE_INFINITY),
      );
    case "year":
      return then(
        (a, b) =>
          (b.game.year ?? Number.NEGATIVE_INFINITY) -
          (a.game.year ?? Number.NEGATIVE_INFINITY),
      );
    // Pick-ups of its copies, the one out now included.
    case "most-borrowed":
      return then((a, b) => b.borrowed - a.borrowed);
  }
}

// What the filter sheet offers: only values some game in view has (R11's revision), so a filter
// with none doesn't show. Player counts run to seven, seven meaning seven or more.
export type OfferedFilters = {
  available: boolean;
  owners: string[];
  players: number[];
  bestPlayers: number[];
  times: PlayTime[];
  complexities: GameComplexity[];
  categories: string[];
  ages: number[];
};

function offeredFilters(items: readonly FilterableItem[]): OfferedFilters {
  const games = items.map(({ game }) => game);
  const sorted = (values: Iterable<number>) =>
    [...new Set(values)].sort((a, b) => a - b);
  const capped = (value: number) => Math.min(value, MOST_PLAYERS);
  return {
    available: items.some((item) => item.availableNow),
    owners: [...new Set(items.flatMap((item) => item.ownerIds))],
    players: sorted(
      games.flatMap(({ minPlayers: min, maxPlayers }) => {
        if (min === null) {
          return [];
        }
        const max = capped(maxPlayers ?? min);
        return Array.from({ length: max - capped(min) + 1 }, (_, index) =>
          capped(min + index),
        );
      }),
    ),
    bestPlayers: sorted(
      games.flatMap((game) => (game.bestPlayers ?? []).map(capped)),
    ),
    times: PLAY_TIMES.filter(({ minutes }) =>
      games.some(
        (game) => (longest(game) ?? Number.POSITIVE_INFINITY) <= minutes,
      ),
    ).map(({ value }) => value),
    complexities: GAME_COMPLEXITIES.filter((level) =>
      games.some((game) => game.complexity === level),
    ),
    categories: [
      ...new Set(games.flatMap((game) => game.categories ?? [])),
    ].sort((a, b) => a.localeCompare(b)),
    ages: sorted(
      games.flatMap((game) => (game.minAge === null ? [] : [game.minAge])),
    ),
  };
}

// B4: when nothing matches, the one filter whose dropping brings back the most, and how many.
export type DropSuggestion = { filter: ActiveFilter; count: number };

export type LibraryList<T extends LibraryItem> = {
  items: T[];
  // How many were in view before the filters.
  total: number;
  // Every game in view's facts, for the filter sheet's live count.
  inView: FilterableItem[];
  offered: OfferedFilters;
  suggestion: DropSuggestion | null;
};

export function listLibrary<T extends LibraryItem>(
  items: readonly T[],
  view: LibraryView,
): LibraryList<T> {
  const kept = items.filter((item) => keeps(item, view));
  let suggestion: DropSuggestion | null = null;
  if (kept.length === 0) {
    for (const filter of activeFilters(view)) {
      const found = countMatches(items, withoutFilter(view, filter));
      if (found > (suggestion?.count ?? 0)) {
        suggestion = { filter, count: found };
      }
    }
  }
  return {
    items: kept.sort(sorter(view.sort)),
    total: items.length,
    inView: items.map(({ game, ownerIds, availableNow }) => ({
      game: {
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
        bestPlayers: game.bestPlayers,
        minMinutes: game.minMinutes,
        maxMinutes: game.maxMinutes,
        complexity: game.complexity,
        categories: game.categories,
        minAge: game.minAge,
      },
      ownerIds,
      availableNow,
    })),
    offered: offeredFilters(items),
    suggestion,
  };
}

// The words: B2's dice and B3's chips, and B4's line.

const NUMBERS = ["one", "two", "three", "four", "five", "six"];
const games = (count: number) => `${count} ${count === 1 ? "game" : "games"}`;

// "4 players", "1 player", "7+ players"; for B2's dice "7 or more players".
export const playersWords = (count: number, spelled = false) =>
  count >= MOST_PLAYERS
    ? spelled
      ? `${MOST_PLAYERS} or more players`
      : `${MOST_PLAYERS}+ players`
    : `${count} ${count === 1 ? "player" : "players"}`;

// An owner as a card's owner line names them, for their chip: "Yours", "Sam’s".
export const ownerWordsFor =
  (owners: readonly { userId: string; name: string }[], viewerId: string) =>
  (userId: string): string => {
    if (userId === viewerId) {
      return "Yours";
    }
    const owner = owners.find((one) => one.userId === userId);
    return owner ? `${owner.name}’s` : "Someone’s";
  };

// A chip's words (B3, B4; ABF-12's "Complexity: heavy"). `ownerWords` names an owner as their
// line does: "Yours", "Sam’s".
export function filterWords(
  filter: ActiveFilter,
  ownerWords: (userId: string) => string,
): string {
  switch (filter.kind) {
    case "players":
      return filter.fit === "plays-best-with"
        ? `Best at ${filter.count >= MOST_PLAYERS ? `${MOST_PLAYERS}+` : filter.count}`
        : playersWords(filter.count);
    case "complexity":
      return `Complexity: ${filter.complexity}`;
    case "time":
      return PLAY_TIMES.find(({ value }) => value === filter.time)?.words ?? "";
    case "available":
      return "Available now";
    case "owner":
      return ownerWords(filter.userId);
    case "category":
      return `Category: ${filter.category}`;
    case "age":
      return `Age ${filter.age} or under`;
  }
}

// The count line: "9 games · by title" while nothing filters it (B1), "2 games" once something
// does (B3). My library's has no sort in it (B6).
export const countLine = (shown: number, view: LibraryView, withSort = true) =>
  withSort && activeFilters(view).length === 0
    ? `${games(shown)} · ${SORT_WORDS[view.sort].count}`
    : games(shown);

// B4's line, from the filters on: "No one’s library has a heavy game for four that plays in 30
// minutes or less." A view filtered by owner, category or age, which that sentence can't say,
// gets a plainer line. `whose` is "everyone" on All friends and "yours" on My library.
// Whose library a list is: All friends' (everyone's), My library (yours), or a friend's (E3).
export type LibraryWhose = "everyone" | "yours" | { friend: string };

export function noMatchLine(view: LibraryView, whose: LibraryWhose): string {
  if (view.owners.length || view.categories.length || view.age !== null) {
    return whose === "everyone"
      ? "No game in your library or your friends’ matches all of these."
      : whose === "yours"
        ? "No game in your library matches all of these."
        : `No game in ${whose.friend}’s library matches all of these.`;
  }
  const kinds = view.complexities.join(" or ");
  const players = view.players;
  const spelled = (value: number) =>
    value >= MOST_PLAYERS
      ? "seven or more"
      : (NUMBERS[value - 1] ?? `${value}`);
  const clauses = [
    players?.fit === "plays-best-with"
      ? `is best at ${spelled(players.count)}`
      : null,
    view.time === "30-minutes"
      ? "plays in 30 minutes or less"
      : view.time === "1-hour"
        ? "plays in an hour or less"
        : view.time === "2-hours"
          ? "plays in two hours or less"
          : null,
    view.available ? "is available now" : null,
  ].filter((clause) => clause !== null);
  const game = [
    kinds,
    "game",
    players?.fit === "plays-with" ? `for ${spelled(players.count)}` : "",
    clauses.length ? `that ${clauses.join(" and ")}` : "",
  ]
    .filter((part) => part !== "")
    .join(" ");
  return whose === "everyone"
    ? `No one’s library has a ${game}.`
    : whose === "yours"
      ? `Your library has no ${game}.`
      : `${whose.friend}’s library has no ${game}.`;
}

// B4's way out: "Without “30 min or less”: 1 game".
export const dropWords = (words: string, count: number) =>
  `Without “${words}”: ${games(count)}`;
