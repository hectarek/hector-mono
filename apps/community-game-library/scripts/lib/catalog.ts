// The rules that shape the catalog's own dataset (docs/catalog-data.md, The plan): Wikidata's
// published board, card and party games, with the facts Wikidata lacks taken from the game's
// English Wikipedia infobox. scripts/shape-catalog.ts fetches the records; this file turns them
// into db/catalog.jsonl's lines, so the rules are tested without the network. No BoardGameGeek
// data is read, and no Wikidata property that points at it (D7).
import type { Game } from "@/src/entities/models/game.model";

// What the queries gather about one Wikidata item. Lists hold every value Wikidata gives, so a
// rule can tell one value from several.
export type WikidataItem = {
  qid: string;
  label: string | null;
  enwikiTitle: string | null;
  // How many Wikimedia sites have a page on it (the catalog's popularity).
  sitelinks: number;
  classes: string[];
  genres: string[];
  countries: string[];
  year: number | null;
  expansionOf: string[];
  minPlayers: number[];
  maxPlayers: number[];
  durations: Quantity[];
  minAges: Quantity[];
  publishers: Publisher[];
  // Designers who are people, by their English names.
  designers: string[];
};

// A Wikidata quantity: its amount and its unit's item, null when it has none.
export type Quantity = { amount: number; unit: string | null };

export type Publisher = {
  name: string;
  countries: string[];
  sitelinks: number;
};

// What a game's English Wikipedia infobox says.
type Bounds = { min: number | null; max: number | null };
export type InfoboxFacts = {
  players: Bounds;
  minutes: Bounds;
  minAge: number | null;
  designers: string[];
  publishers: string[];
};

// One line of db/catalog.jsonl: a games row (data-model.md) without the values the dataset
// doesn't fill (best counts, complexity, description, image, video), plus where it came from.
// A value the game lacks is left out of the line, and U24 writes it as null.
export type CatalogGame = {
  id: string;
  wikidataId: string;
  type: Game["type"];
  baseGameId?: string;
  title: string;
  year?: number;
  publishers?: string[];
  designers?: string[];
  minPlayers?: number;
  maxPlayers?: number;
  minMinutes?: number;
  maxMinutes?: number;
  minAge?: number;
  categories?: string[];
  popularity: number;
  // The values taken from English Wikipedia's infobox rather than Wikidata.
  wikipediaFields?: WikipediaField[];
};

type WikipediaField =
  | "publishers"
  | "designers"
  | "minPlayers"
  | "maxPlayers"
  | "minMinutes"
  | "maxMinutes"
  | "minAge";

// The items the queries start from: board games and their subclasses, and these classes
// directly (Wikidata, 2026-11-23). Each needs a publisher, a designer or a release date to count
// as a published game, which leaves out traditional games such as chess variants.
export const BOARD_GAME = "Q131436";
export const OTHER_GAME_CLASSES = [
  "Q142714", // card game
  "Q3177859", // dedicated deck card game
  "Q3244175", // tabletop game
  "Q1515156", // dice game
  "Q839864", // party game
  "Q1272194", // tile-based game
  "Q1191150", // trick-taking game
  "Q60474521", // board game expansion
] as const;

// An item that's also one of these isn't a game for the shelf.
const NOT_A_SHELF_GAME = new Set([
  "Q7889", // video game
  "Q19272838", // board video game
  "Q7397", // software
  "Q341", // free software
  "Q133935013", // chess playing software
  "Q1066707", // downloadable content
  "Q1643932", // tabletop role-playing game
  "Q160738", // role-playing game
  "Q642946", // gamebook
  "Q220659", // archaeological artefact
]);

// The catalog's category words, from the item's classes (P31) and genres (P136).
const CATEGORY_OF: Record<string, string> = {
  Q142714: "Card game",
  Q3177859: "Card game",
  Q1191150: "Card game",
  Q1783817: "Cooperative",
  Q1418321: "Cooperative",
  Q4931403: "War",
  Q1501543: "War",
  Q1788845: "War",
  Q3139142: "War",
  Q532716: "War",
  Q1509934: "Children's",
  Q1272194: "Tile-laying",
  Q1515156: "Dice",
  Q4686556: "Adventure",
  Q1265717: "Adventure",
  Q1150710: "Strategy",
  Q788553: "Strategy",
  Q21608615: "Economic",
  Q573573: "Abstract",
  Q12811949: "Abstract",
  Q5161688: "Abstract",
  Q60735876: "Roll-and-move",
  Q5188437: "Roll-and-move",
  Q1099522: "Racing",
  Q839864: "Party",
  Q17351672: "Party",
  Q10499647: "Trivia",
  Q85801811: "Social deduction",
  Q1182245: "Deduction",
  Q112966988: "Deduction",
  Q106869518: "Memory",
  Q15220419: "Word",
  Q48997832: "Legacy",
  Q17144589: "Trains",
  Q7620492: "Storytelling",
  Q132311: "Fantasy",
  Q24925: "Science fiction",
  Q186424: "Mystery",
  Q16575965: "Horror",
};

// Wikidata gives "card game" as the genre of many board games that use cards (Catan, Wingspan),
// so it makes a card game only as the item's class.
const CLASS_ONLY_CATEGORIES = new Set(["Q142714"]);

const MINUTE = "Q7727";
const HOUR = "Q25235";
const UNITLESS = "Q199";
const YEAR_UNITS = new Set(["Q577", "Q1092296", "Q24564698"]);

// Values outside these are taken as mistakes and left out (DBpedia's infoboxes had a negative
// play time and an age of 440 million, catalog-data.md).
const MOST_PLAYERS = 100;
const MOST_MINUTES = 24 * 60;
const OLDEST_MIN_AGE = 21;
const MOST_PUBLISHERS = 3;

// A game's id, the same every time the dataset is made: a UUID v5 of its Wikidata address, so
// U24 can load the file twice and a later run keeps every id.
export function gameId(qid: string): string {
  return Bun.randomUUIDv5(`https://www.wikidata.org/entity/${qid}`, "url");
}

// Why an item stays out of the catalog, or null when it's in.
export function whyLeftOut(item: WikidataItem): string | null {
  if (titleOf(item) === null) {
    return "no English name";
  }
  if (item.classes.some((klass) => NOT_A_SHELF_GAME.has(klass))) {
    return "not a tabletop game";
  }
  return null;
}

// The English label, or the English article's title without its "(board game)". A label all in
// lower case, as Wikidata writes a common noun ("mahjong"), starts with a capital.
function titleOf(item: WikidataItem): string | null {
  const name =
    item.label?.trim() ||
    item.enwikiTitle?.replace(/\s*\([^)]*\)$/, "").trim() ||
    null;
  if (name === null) {
    return null;
  }
  return name === name.toLowerCase()
    ? `${name.charAt(0).toUpperCase()}${name.slice(1)}`
    : name;
}

// One value from Wikidata, or none when it gives none or several that disagree.
function single(values: number[]): number | null {
  const distinct = [...new Set(values)];
  return distinct.length === 1 ? (distinct[0] ?? null) : null;
}

function within(value: number | null, low: number, high: number) {
  return value !== null &&
    Number.isInteger(value) &&
    value >= low &&
    value <= high
    ? value
    : null;
}

const NO_BOUNDS: Bounds = { min: null, max: null };

// Wikidata's play time in minutes: one value is both bounds, two are the range, and anything else
// is left to Wikipedia. A value with no unit counts as minutes from 10 up.
export function minutesFromWikidata(durations: Quantity[]): Bounds {
  const minutes = durations.map(({ amount, unit }) => {
    if (unit === MINUTE) {
      return amount;
    }
    if (unit === HOUR) {
      return amount * 60;
    }
    return (unit === null || unit === UNITLESS) && amount >= 10 ? amount : null;
  });
  if (minutes.some((value) => value === null)) {
    return NO_BOUNDS;
  }
  const sorted = [...new Set(minutes as number[])].sort((a, b) => a - b);
  if (sorted.length < 1 || sorted.length > 2) {
    return NO_BOUNDS;
  }
  return ordered(
    Math.round(sorted[0] ?? 0),
    Math.round(sorted.at(-1) ?? 0),
    MOST_MINUTES,
  );
}

function ageFromWikidata(ages: Quantity[]): number | null {
  const years = ages
    .filter(
      ({ unit }) => unit === null || unit === UNITLESS || YEAR_UNITS.has(unit),
    )
    .map(({ amount }) => amount);
  return years.length === ages.length
    ? within(single(years), 1, OLDEST_MIN_AGE)
    : null;
}

// The infobox's parameters, from the first {{Infobox …}} template in an article's wikitext. A
// pipe inside a nested template or a link doesn't split a parameter.
export function infoboxParams(wikitext: string): Map<string, string> {
  const params = new Map<string, string>();
  const start = wikitext.search(/\{\{\s*infobox\b/i);
  if (start < 0) {
    return params;
  }
  const parts: string[] = [];
  let current = "";
  let templates = 0;
  let links = 0;
  for (let index = start; index < wikitext.length; index++) {
    const pair = wikitext.slice(index, index + 2);
    if (pair === "{{" || pair === "}}") {
      templates += pair === "{{" ? 1 : -1;
      if (templates === 0) {
        parts.push(current);
        break;
      }
      if (templates > 1 || pair === "}}") {
        current += pair;
      }
      index++;
      continue;
    }
    if (pair === "[[" || pair === "]]") {
      links = Math.max(0, links + (pair === "[[" ? 1 : -1));
      current += pair;
      index++;
      continue;
    }
    const character = wikitext[index];
    if (character === "|" && templates === 1 && links === 0) {
      parts.push(current);
      current = "";
      continue;
    }
    current += character;
  }
  for (const part of parts.slice(1)) {
    const equals = part.indexOf("=");
    if (equals > 0) {
      params.set(
        part.slice(0, equals).trim().toLowerCase(),
        part.slice(equals + 1).trim(),
      );
    }
  }
  return params;
}

// Templates that hold a list, one item to a line ({{ubl|1–5 (standard)|1–7 (with expansion)}}),
// and templates that only wrap their text.
const LIST_TEMPLATES = new Set([
  "ubl",
  "ublist",
  "unbulleted list",
  "plainlist",
  "plain list",
  "flatlist",
  "hlist",
  "bulleted list",
  "bulleted",
]);
const WRAPPING_TEMPLATES = new Set(["nowrap", "nobr", "small", "abbr"]);
const DASH_TEMPLATES = new Set(["ndash", "snd", "spaced ndash", "–"]);

// Templates from the innermost out: a list becomes its lines, a wrapper its text, a dash a dash,
// and any other template (a reference, a date) goes.
function expandTemplates(text: string): string {
  let previous: string;
  let current = text;
  do {
    previous = current;
    current = current.replace(/\{\{([^{}]*)\}\}/g, (_, body: string) => {
      const [name = "", ...args] = body.split("|");
      const kind = name.trim().toLowerCase();
      if (LIST_TEMPLATES.has(kind)) {
        return args
          .filter((arg) => !/^\s*\w+\s*=/.test(arg))
          .map((arg) => arg.trim())
          .join("\n");
      }
      if (WRAPPING_TEMPLATES.has(kind)) {
        return args[0] ?? "";
      }
      return DASH_TEMPLATES.has(kind) ? "–" : "";
    });
  } while (current !== previous);
  return current;
}

// A parameter's text as a reader sees it, line by line.
function plainText(value: string): string {
  const withoutMarkup = value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, "$1");
  return expandTemplates(withoutMarkup)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;/g, "–")
    .split("\n")
    .map((line) => line.replace(/^\s*\*\s*/, "").trim())
    .filter(Boolean)
    .join("\n");
}

// The first line up to its first bracket: "1–5 (standard)" reads as "1–5", the base game's.
function firstValue(value: string): string {
  return plainText(value).split(/[\n(]/)[0]?.trim() ?? "";
}

const RANGE = /(\d+)\s*(?:–|—|-|to)\s*(\d+)/;

// "2–4" is 2 to 4, "2+" is 2 or more, and "2" is exactly 2.
export function playersFromText(text: string): Bounds {
  const range = RANGE.exec(text);
  if (range) {
    return ordered(Number(range[1]), Number(range[2]), MOST_PLAYERS);
  }
  const atLeast = /(\d+)\s*\+/.exec(text);
  if (atLeast) {
    return { min: within(Number(atLeast[1]), 1, MOST_PLAYERS), max: null };
  }
  const one = /^\D*(\d+)\b/.exec(text);
  const count = within(one ? Number(one[1]) : null, 1, MOST_PLAYERS);
  return { min: count, max: count };
}

// "30–60 minutes", "1–2 hours" or "45 min": a number takes the unit written after it, or after
// the next number, and with no unit at all it counts as minutes from 10 up.
export function minutesFromText(text: string): Bounds {
  const tokens = [
    ...text.matchAll(/(\d+(?:\.\d+)?)\s*(minutes?|mins?|hours?|hrs?|h)?\b/gi),
  ]
    .slice(0, 2)
    .map((match) => ({
      amount: Number(match[1]),
      unit: match[2]?.toLowerCase() ?? null,
    }));
  if (tokens.length === 0) {
    return NO_BOUNDS;
  }
  const lastUnit =
    tokens
      .map(({ unit }) => unit)
      .filter(Boolean)
      .at(-1) ?? null;
  const minutes = tokens.map(({ amount, unit }) => {
    const written = unit ?? lastUnit;
    if (written === null) {
      return amount >= 10 ? amount : null;
    }
    return written.startsWith("h") ? amount * 60 : amount;
  });
  if (minutes.some((value) => value === null)) {
    return NO_BOUNDS;
  }
  const [low, high] = minutes as number[];
  return ordered(
    Math.round(low ?? 0),
    Math.round(high ?? low ?? 0),
    MOST_MINUTES,
  );
}

// "10+", "8 and up" or "12": the first number.
export function ageFromText(text: string): number | null {
  const first = /^\D*(\d+)\b/.exec(text);
  return within(first ? Number(first[1]) : null, 1, OLDEST_MIN_AGE);
}

// A name in the Latin alphabet, which the catalog shows: Wikidata and the infoboxes also give an
// edition's publisher in its own script ("Κάισσα").
const LATIN_NAME = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;

// The names in a designer or publisher line: one to a line, or joined by commas or "and", without
// bracketed notes ("Days of Wonder (US)"). A part of more than six words isn't a name, and
// neither is a person's with a digit in it; a company's may have one ("999 Games").
export function namesFromText(
  text: string,
  kind: "people" | "companies",
): string[] {
  const separators = kind === "people" ? /\n|,|;|\band\b|&/ : /\n|,|;/;
  return [
    ...new Set(
      text
        .replace(/\([^)]*\)/g, "")
        .split(separators)
        .map((part) => part.trim())
        .filter(
          (part) =>
            LATIN_NAME.test(part) &&
            (kind === "companies" || !/\d/.test(part)) &&
            part.split(/\s+/).length <= 6 &&
            !/^(?:various|unknown|n\/a|none|self-published)$/i.test(part),
        ),
    ),
  ];
}

function ordered(low: number, high: number, most: number): Bounds {
  const min = within(low, 1, most);
  const max = within(high, 1, most);
  return min === null || max === null || min > max ? NO_BOUNDS : { min, max };
}

// What a game's infobox says about its players, play time, age, designers and publisher.
export function infoboxFacts(wikitext: string): InfoboxFacts {
  const params = infoboxParams(wikitext);
  const param = (name: string) => params.get(name) ?? "";
  return {
    players: playersFromText(firstValue(param("players"))),
    minutes: minutesFromText(firstValue(param("playing_time"))),
    minAge: ageFromText(firstValue(param("ages"))),
    designers: namesFromText(plainText(param("designer")), "people"),
    publishers: namesFromText(plainText(param("publisher")), "companies"),
  };
}

// The publishers a search row and a game's page show, at most three. Wikidata lists every
// edition's publisher with none marked as the original, and the original is what tells
// same-named games apart (R2). So the English infobox's publishers come first, in its order, and
// without an infobox, Wikidata's: those from the game's own country, then the best known (most
// Wikimedia pages).
export function publishersOf(
  item: WikidataItem,
  infoboxPublishers: string[],
): string[] {
  if (infoboxPublishers.length > 0) {
    return infoboxPublishers.slice(0, MOST_PUBLISHERS);
  }
  const merged = new Map<string, Publisher>();
  for (const publisher of item.publishers.filter(({ name }) =>
    LATIN_NAME.test(name),
  )) {
    const seen = merged.get(publisher.name);
    merged.set(publisher.name, {
      name: publisher.name,
      countries: [
        ...new Set([...(seen?.countries ?? []), ...publisher.countries]),
      ],
      sitelinks: Math.max(seen?.sitelinks ?? 0, publisher.sitelinks),
    });
  }
  const home = (publisher: Publisher) =>
    publisher.countries.some((country) => item.countries.includes(country))
      ? 0
      : 1;
  return [...merged.values()]
    .sort(
      (a, b) =>
        home(a) - home(b) ||
        b.sitelinks - a.sitelinks ||
        a.name.localeCompare(b.name, "en"),
    )
    .slice(0, MOST_PUBLISHERS)
    .map(({ name }) => name);
}

export function categoriesOf(item: WikidataItem): string[] {
  const words = [
    ...item.classes.map((klass) => CATEGORY_OF[klass]),
    ...item.genres
      .filter((genre) => !CLASS_ONLY_CATEGORIES.has(genre))
      .map((genre) => CATEGORY_OF[genre]),
  ].filter((word): word is string => word !== undefined);
  return [...new Set(words)].sort((a, b) => a.localeCompare(b, "en"));
}

const byName = (a: string, b: string) => a.localeCompare(b, "en");

// A catalog game from its Wikidata item and, when it has an English article, that article's
// infobox. Wikidata's value wins where it has exactly one, and the infobox fills the rest, except
// the publishers, where the infobox names the original (publishersOf).
export function shapeGame(
  item: WikidataItem,
  infobox: InfoboxFacts | null,
  baseGameId: string | null,
): CatalogGame {
  const fromWikipedia: WikipediaField[] = [];
  const pick = (
    wikidata: number | null,
    wikipedia: number | null,
    field: WikipediaField,
  ) => {
    if (wikidata !== null) {
      return wikidata;
    }
    if (wikipedia !== null) {
      fromWikipedia.push(field);
    }
    return wikipedia;
  };
  const wikidataMinutes = minutesFromWikidata(item.durations);
  const minutes =
    wikidataMinutes.min === null
      ? (infobox?.minutes ?? NO_BOUNDS)
      : wikidataMinutes;
  if (wikidataMinutes.min === null && minutes.min !== null) {
    fromWikipedia.push("minMinutes", "maxMinutes");
  }
  const wikidataDesigners = [...new Set(item.designers)].sort(byName);
  const designers =
    wikidataDesigners.length > 0
      ? wikidataDesigners
      : (infobox?.designers ?? []);
  if (wikidataDesigners.length === 0 && designers.length > 0) {
    fromWikipedia.push("designers");
  }
  const infoboxPublishers = infobox?.publishers ?? [];
  if (infoboxPublishers.length > 0) {
    fromWikipedia.push("publishers");
  }
  const game: CatalogGame = {
    id: gameId(item.qid),
    wikidataId: item.qid,
    type: baseGameId === null ? "base-game" : "expansion",
    ...(baseGameId === null ? {} : { baseGameId }),
    title: titleOf(item) ?? item.qid,
    ...optional("year", within(item.year, 1, 9999)),
    ...optional("publishers", publishersOf(item, infoboxPublishers)),
    ...optional("designers", designers),
    ...optional(
      "minPlayers",
      pick(
        within(single(item.minPlayers), 1, MOST_PLAYERS),
        infobox?.players.min ?? null,
        "minPlayers",
      ),
    ),
    ...optional(
      "maxPlayers",
      pick(
        within(single(item.maxPlayers), 1, MOST_PLAYERS),
        infobox?.players.max ?? null,
        "maxPlayers",
      ),
    ),
    ...optional("minMinutes", minutes.min),
    ...optional("maxMinutes", minutes.max),
    ...optional(
      "minAge",
      pick(ageFromWikidata(item.minAges), infobox?.minAge ?? null, "minAge"),
    ),
    ...optional("categories", categoriesOf(item)),
    popularity: item.sitelinks,
  };
  return fromWikipedia.length > 0
    ? { ...game, wikipediaFields: fromWikipedia }
    : game;
}

// A field only when it has a value: an empty list or a missing number stays out of the line.
function optional<K extends keyof CatalogGame>(
  key: K,
  value: CatalogGame[K] | null,
) {
  if (
    value === null ||
    value === undefined ||
    (Array.isArray(value) && value.length === 0)
  ) {
    return {};
  }
  return { [key]: value } as Pick<CatalogGame, K>;
}

// The base game an item expands, when that game is in the catalog as a base game itself.
export function baseOf(
  item: WikidataItem,
  baseGames: ReadonlySet<string>,
): string | null {
  const bases = item.expansionOf.filter((qid) => baseGames.has(qid));
  return bases.length === 1 ? (bases[0] ?? null) : null;
}

// The catalog's games, base games first (an expansion's row needs its base game's), then the
// best known, then by title and id, so a new run changes only the lines that changed.
export function orderGames(games: CatalogGame[]): CatalogGame[] {
  return [...games].sort(
    (a, b) =>
      Number(a.type === "expansion") - Number(b.type === "expansion") ||
      b.popularity - a.popularity ||
      a.title.localeCompare(b.title, "en") ||
      a.id.localeCompare(b.id),
  );
}

export function toJsonLines(games: CatalogGame[]): string {
  return games.map((game) => `${JSON.stringify(game)}\n`).join("");
}
