// The rules that shape the catalog's own dataset (docs/catalog-data.md, The plan): Wikidata's
// published board, card and party games, with the facts Wikidata lacks taken from the game's
// English, then German, then French Wikipedia infobox. scripts/shape-catalog.ts fetches the
// records; this file turns them into db/catalog.jsonl's lines, so the rules are tested without the
// network. No BoardGameGeek data is read, and no Wikidata property that points at it (D7).
import type { Game } from "@/src/entities/models/game.model";

// The Wikipedias whose infoboxes fill what Wikidata lacks, in the order they're asked.
export const LANGUAGES = ["en", "de", "fr"] as const;
export type Language = (typeof LANGUAGES)[number];

// What the queries gather about one Wikidata item. Lists hold every value Wikidata gives, so a
// rule can tell one value from several.
export type WikidataItem = {
  qid: string;
  label: string | null;
  // The item's article on each Wikipedia, by its title.
  enwikiTitle: string | null;
  dewikiTitle: string | null;
  frwikiTitle: string | null;
  // Whether Wikidata names its publisher, a designer or a release date.
  published: boolean;
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
  // Wikidata's image of it, by its file name on Wikimedia Commons.
  image: string | null;
};

// A Wikidata quantity: its amount and its unit's item, null when it has none.
export type Quantity = { amount: number; unit: string | null };

export type Publisher = {
  name: string;
  countries: string[];
  sitelinks: number;
};

// What a game's Wikipedia infobox says, in the catalog's words: numbers, names and categories,
// never the article's text.
type Bounds = { min: number | null; max: number | null };
export type InfoboxFacts = {
  players: Bounds;
  minutes: Bounds;
  minAge: number | null;
  year: number | null;
  designers: string[];
  publishers: string[];
  categories: string[];
  // The infobox's image by its file name, which may be on Commons or only on that Wikipedia.
  image: string | null;
};

// A game's infoboxes, one per Wikipedia that has an article on it.
export type Infoboxes = Partial<Record<Language, InfoboxFacts>>;

// One line of db/catalog.jsonl: a games row (data-model.md) without the values the dataset
// doesn't fill (best counts, complexity, description, video), plus where it came from. A value
// the game lacks is left out of the line, and U24 writes it as null.
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
  // A free image from Wikimedia Commons with its credit and its page, on the best-known games
  // (withImage).
  imageUrl?: string;
  imageCredit?: string;
  imageSourceUrl?: string;
  popularity: number;
  // The values taken from a Wikipedia infobox rather than Wikidata.
  wikipediaFields?: WikipediaField[];
};

type WikipediaField =
  | "year"
  | "publishers"
  | "designers"
  | "minPlayers"
  | "maxPlayers"
  | "minMinutes"
  | "maxMinutes"
  | "minAge"
  | "categories";

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

// The catalog's category words from the words an infobox uses: English Wikipedia's genre,
// German's Art, French's type, mécanisme and thème. Each Wikipedia's words match only its own
// infobox, since "course" is a race in French.
const CATEGORY_WORDS: Record<Language, [RegExp, string][]> = {
  en: [
    [/card game/i, "Card game"],
    [/war ?game|military|world war|wwii|napoleonic|civil war/i, "War"],
    [/co-?operative/i, "Cooperative"],
    [/children/i, "Children's"],
    [/tile-(?:based|laying|placement)/i, "Tile-laying"],
    [/dice game/i, "Dice"],
    // An abstract strategy game is Abstract alone, as Wikidata's class of that name is.
    [/(?<!abstract )strategy/i, "Strategy"],
    [/abstract/i, "Abstract"],
    [/party game/i, "Party"],
    [/trivia|quiz/i, "Trivia"],
    [/social deduction/i, "Social deduction"],
    [/deduction/i, "Deduction"],
    [/word game/i, "Word"],
    [/memory game/i, "Memory"],
    [/economic/i, "Economic"],
    [/roll-and-move|roll and move/i, "Roll-and-move"],
    [/racing/i, "Racing"],
    [/legacy/i, "Legacy"],
    [/storytelling/i, "Storytelling"],
    [/science fiction|sci-fi/i, "Science fiction"],
    [/fantasy/i, "Fantasy"],
    [/horror/i, "Horror"],
    [/mystery|detective/i, "Mystery"],
    [/railway|railroad|\btrains?\b/i, "Trains"],
  ],
  de: [
    [/kartenspiel|stichspiel/i, "Card game"],
    [/konfliktsimulation|kriegsspiel/i, "War"],
    [/kooperativ/i, "Cooperative"],
    [/kinderspiel/i, "Children's"],
    [/legespiel/i, "Tile-laying"],
    [/würfelspiel/i, "Dice"],
    [/strategiespiel/i, "Strategy"],
    [/abstrakt/i, "Abstract"],
    [/partyspiel/i, "Party"],
    [/quizspiel|wissensspiel/i, "Trivia"],
    [/deduktion/i, "Deduction"],
    [/wortspiel|buchstabenspiel/i, "Word"],
    [/gedächtnisspiel|merkspiel/i, "Memory"],
    [/wirtschaftsspiel|handelsspiel/i, "Economic"],
    [/laufspiel/i, "Roll-and-move"],
    [/rennspiel/i, "Racing"],
    [/legacy/i, "Legacy"],
    [/erzählspiel/i, "Storytelling"],
    [/krimi|detektiv/i, "Mystery"],
    [/eisenbahn/i, "Trains"],
  ],
  fr: [
    [/jeu de cartes|levées/i, "Card game"],
    [/jeu de guerre|wargame|figurines/i, "War"],
    [/coopérati|coopération/i, "Cooperative"],
    [/enfant/i, "Children's"],
    [/tuiles/i, "Tile-laying"],
    [/jeu de dés/i, "Dice"],
    [/stratégie/i, "Strategy"],
    [/abstrait/i, "Abstract"],
    [/ambiance/i, "Party"],
    [/déduction/i, "Deduction"],
    [/jeu de lettres|jeu de mots/i, "Word"],
    [/mémoire/i, "Memory"],
    [/gestion|économi/i, "Economic"],
    [/course/i, "Racing"],
    [/legacy/i, "Legacy"],
    [/science-fiction/i, "Science fiction"],
    [/fantastique|fantasy/i, "Fantasy"],
    [/horreur|cthulhu/i, "Horror"],
    [/enquête|policier/i, "Mystery"],
    [/chemin de fer|ferroviaire/i, "Trains"],
  ],
};

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
// The kind of game in brackets that some labels carry, as Wikipedia's titles do: "Memory (game)",
// "Insecta (board game)". An edition or a year in brackets stays.
const KIND_IN_BRACKETS = /\s*\((?:[a-z-]+ )?game\)$/i;

function titleOf(item: WikidataItem): string | null {
  const name =
    item.label?.replace(KIND_IN_BRACKETS, "").trim() ||
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
      // {{lang|en|Goliath Games}}: a name marked with its language, in French infoboxes.
      if (kind === "lang") {
        return args.at(-1) ?? "";
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

// A range in English, German ("2 bis 4") or French ("2 à 7").
const RANGE = /(\d+)\s*(?:–|—|-|to|bis|à)\s*(\d+)/i;
const AT_LEAST =
  /(\d+)\s*(?:\+|or more|and up|und mehr|oder mehr|et plus|ou plus)/i;

// "2–4" is 2 to 4, "2+" is 2 or more, and "2" is exactly 2.
export function playersFromText(text: string): Bounds {
  const range = RANGE.exec(text);
  if (range) {
    return ordered(Number(range[1]), Number(range[2]), MOST_PLAYERS);
  }
  const atLeast = AT_LEAST.exec(text);
  if (atLeast) {
    return { min: within(Number(atLeast[1]), 1, MOST_PLAYERS), max: null };
  }
  const one = /^\D*(\d+)\b/.exec(text);
  const count = within(one ? Number(one[1]) : null, 1, MOST_PLAYERS);
  return { min: count, max: count };
}

// French gives the fewest and the most players apart ("joueurs mini", "joueurs maxi"). Without
// the most, a single fewest says nothing about the top.
function playersFromBounds(fewest: string, most: string): Bounds {
  const low = playersFromText(fewest);
  const high = playersFromText(most);
  const max =
    most === ""
      ? RANGE.test(fewest)
        ? low.max
        : null
      : (high.max ?? high.min);
  return low.min !== null && max !== null && low.min > max
    ? NO_BOUNDS
    : { min: low.min, max };
}

// The units a play time is written in, in English, German and French. A word's hours unless it's
// one of the minutes'.
const TIME_UNIT =
  /(\d+(?:[.,]\d+)?)\s*(minuten|minutes?|mins?|stunden|stunde|std|heures?|hours?|hrs?|h)?\.?(?![a-zäöüßàâçéèêëîïôûùü])/gi;
const MINUTE_UNITS = new Set(["minuten", "minute", "minutes", "min", "mins"]);

// "30–60 minutes", "1–2 hours", "45 min", "30 bis 45 Minuten" or "2 à 3h": a number takes the
// unit written after it, or after the next number, and with no unit at all it counts as minutes
// from 10 up.
export function minutesFromText(text: string): Bounds {
  const tokens = [...text.matchAll(TIME_UNIT)].slice(0, 2).map((match) => ({
    amount: Number(match[1]?.replace(",", ".")),
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
    return MINUTE_UNITS.has(written) ? amount : amount * 60;
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

// "10+", "8 and up", "ab 8 Jahren" or "12": the first number.
export function ageFromText(text: string): number | null {
  const first = /^\D*(\d+)\b/.exec(text);
  return within(first ? Number(first[1]) : null, 1, OLDEST_MIN_AGE);
}

// The earliest year a date line names: "2000", "{{Start date|1995}}", "1972 (1976 en France)".
// A reference's dates (when it was read) don't count.
export function yearFromText(value: string): number | null {
  const text = value
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<ref[^>]*\/>/gi, "")
    .replace(/<ref[^>]*>[\s\S]*?<\/ref>/gi, "");
  const years = [...text.matchAll(/\b(1\d{3}|20\d{2})\b/g)].map((match) =>
    Number(match[1]),
  );
  return years.length > 0 ? Math.min(...years) : null;
}

// A name in the Latin alphabet, which the catalog shows: Wikidata and the infoboxes also give an
// edition's publisher in its own script ("Κάισσα").
const LATIN_NAME = /^[\p{Script=Latin}\p{N}\p{P}\p{S}\s]+$/u;

// The word that joins two people's names in each language.
const AND: Record<Language, string> = { en: "and", de: "und", fr: "et" };

// What an infobox writes where it names nobody, or nobody else ("u. a." is German for "among
// others"), in each language.
const NOBODY =
  /^(?:various|unknown|n\/a|none|self-published|et al\.?|and others|etc\.?|diverse|unbekannt|eigenverlag|u\.\s?a\.?|usw\.?|divers|inconnu|auto-édition|entre autres)$/i;

// The names in a designer or publisher line: one to a line, or joined by commas or the language's
// "and", without bracketed notes ("Days of Wonder (US)") or what a country's flag left in front
// ("{{USA}}: Avalon Hill"). A part of more than six words isn't a name, and neither is a person's
// with a digit in it; a company's may have one ("999 Games"). People joined by "and" stay apart
// ("Inka und Markus Brand" is Inka and Markus Brand), which a game's page joins again with "and".
export function namesFromText(
  text: string,
  kind: "people" | "companies",
  language: Language = "en",
): string[] {
  const separators =
    kind === "people"
      ? new RegExp(`\\n|,|;|&|\\b${AND[language]}\\b`, "i")
      : /\n|,|;/;
  return [
    ...new Set(
      text
        .replace(/\([^)]*\)/g, "")
        .split(separators)
        .map((part) =>
          part
            .replace(/^[\s:–-]+/, "")
            .replace(/\s+(?:u\.\s?a\.?|usw\.?|etc\.?|et al\.?)$/i, "")
            .trim(),
        )
        .filter(
          (part) =>
            LATIN_NAME.test(part) &&
            (kind === "companies" || !/\d/.test(part)) &&
            part.split(/\s+/).length <= 6 &&
            !NOBODY.test(part),
        ),
    ),
  ];
}

function ordered(low: number, high: number, most: number): Bounds {
  const min = within(low, 1, most);
  const max = within(high, 1, most);
  return min === null || max === null || min > max ? NO_BOUNDS : { min, max };
}

// The lines an infobox's facts are read from, before they're parsed.
type InfoboxLines = {
  players: Bounds;
  minutes: string;
  age: string;
  year: string;
  designers: string;
  publishers: string;
  genre: string;
  image: string;
};

// What a game's infobox says about its players, play time, age, year, designers, publishers and
// category. Each Wikipedia's game infobox names its parameters in its own language: English's
// {{Infobox game}}, German's {{Infobox Spiel}} and French's {{Infobox Jeu}}, which numbers its
// authors and years (auteur0, auteur1, année0).
export function infoboxFacts(
  wikitext: string,
  language: Language = "en",
): InfoboxFacts {
  const params = infoboxParams(wikitext);
  const param = (name: string) => params.get(name) ?? "";
  const numbered = (prefix: string) =>
    [...params]
      .filter(([key]) => new RegExp(`^${prefix}\\d*$`).test(key))
      .map(([, value]) => value)
      .join("\n");
  const read = (lines: InfoboxLines): InfoboxFacts => ({
    players: lines.players,
    minutes: minutesFromText(firstValue(lines.minutes)),
    minAge: ageFromText(firstValue(lines.age)),
    year: yearFromText(lines.year),
    designers: namesFromText(plainText(lines.designers), "people", language),
    publishers: namesFromText(
      plainText(lines.publishers),
      "companies",
      language,
    ),
    categories: categoriesFromText(plainText(lines.genre), language),
    image: imageFileFromText(lines.image),
  });
  if (language === "de") {
    return read({
      players: playersFromText(firstValue(param("mitspieler"))),
      minutes: param("dauer"),
      age: param("alter"),
      year: param("erscheinungsjahr"),
      designers: param("autor"),
      publishers: param("verlag"),
      genre: param("art"),
      image: param("bild"),
    });
  }
  if (language === "fr") {
    return read({
      players: playersFromBounds(
        firstValue(param("joueurs mini")),
        firstValue(param("joueurs maxi")),
      ),
      minutes: param("durée"),
      age: param("âge mini"),
      year: numbered("année"),
      designers: numbered("auteur"),
      publishers: param("éditeur"),
      genre: [param("type"), numbered("mécanisme"), numbered("thème")].join(
        "\n",
      ),
      image: param("image"),
    });
  }
  return read({
    players: playersFromText(firstValue(param("players"))),
    minutes: param("playing_time"),
    age: param("ages"),
    year: [param("date"), param("years"), param("released")].join("\n"),
    designers: param("designer"),
    publishers: param("publisher"),
    genre: param("genre"),
    image: param("image") || param("image_link"),
  });
}

// A game counts as published when Wikidata names its publisher, a designer or a release date, or
// its English infobox names a designer or a publisher. A traditional game such as chess has only
// a date there, so it stays out.
export function isPublished(
  item: WikidataItem,
  english: InfoboxFacts | undefined,
): boolean {
  return (
    item.published ||
    (english !== undefined &&
      (english.designers.length > 0 || english.publishers.length > 0))
  );
}

// A value counts when it's there and, for a list, not empty.
function filled<T>(value: T | null | undefined): value is T {
  return (
    value !== null &&
    value !== undefined &&
    !(Array.isArray(value) && value.length === 0)
  );
}

// The first value an infobox gives, asking English, then German, then French (or the languages
// named).
function firstInfobox<T>(
  infoboxes: Infoboxes,
  read: (facts: InfoboxFacts) => T | null,
  languages: readonly Language[] = LANGUAGES,
): T | null {
  for (const language of languages) {
    const facts = infoboxes[language];
    const value = facts === undefined ? null : read(facts);
    if (filled(value)) {
      return value;
    }
  }
  return null;
}

// The publishers a search row and a game's page show, at most three. Wikidata lists every
// edition's publisher with none marked as the original, and the original is what tells
// same-named games apart (R2). So the English infobox's publishers come first, in its order. Then
// Wikidata's: those from the game's own country, then the best known (most Wikimedia pages). Last,
// the German or French infobox's, which can name their own country's edition first.
export function publishersOf(
  item: WikidataItem,
  infoboxes: Infoboxes,
): string[] {
  const english = infoboxes.en?.publishers ?? [];
  if (english.length > 0) {
    return english.slice(0, MOST_PUBLISHERS);
  }
  const wikidata = wikidataPublishers(item);
  if (wikidata.length > 0) {
    return wikidata;
  }
  return (
    firstInfobox(infoboxes, (facts) => facts.publishers, ["de", "fr"]) ?? []
  ).slice(0, MOST_PUBLISHERS);
}

// Wikidata's publishers in the Latin alphabet: the game's own country's first, then the best known.
function wikidataPublishers(item: WikidataItem): string[] {
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

// The catalog's category words an infobox's genre line names, in its own language.
export function categoriesFromText(text: string, language: Language): string[] {
  const words = CATEGORY_WORDS[language]
    .filter(([pattern]) => pattern.test(text))
    .map(([, word]) => word);
  return [...new Set(words)].sort((a, b) => a.localeCompare(b, "en"));
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

// The player count from Wikidata where it gives one value for a bound, else the first infobox
// with that bound. Bounds from two sources that cross (fewest above most) give way to
// Wikidata's alone.
function playersOf(item: WikidataItem, infoboxes: Infoboxes) {
  const wikidata = {
    min: within(single(item.minPlayers), 1, MOST_PLAYERS),
    max: within(single(item.maxPlayers), 1, MOST_PLAYERS),
  };
  const min = wikidata.min ?? firstInfobox(infoboxes, (f) => f.players.min);
  const max = wikidata.max ?? firstInfobox(infoboxes, (f) => f.players.max);
  const players =
    min !== null && max !== null && min > max ? wikidata : { min, max };
  const fromWikipedia: WikipediaField[] = [];
  if (players.min !== null && wikidata.min === null) {
    fromWikipedia.push("minPlayers");
  }
  if (players.max !== null && wikidata.max === null) {
    fromWikipedia.push("maxPlayers");
  }
  const crossed =
    players.min !== null && players.max !== null && players.min > players.max;
  return crossed
    ? { ...NO_BOUNDS, fromWikipedia: [] }
    : { ...players, fromWikipedia };
}

// A catalog game from its Wikidata item and the infoboxes of its English, German and French
// articles. Wikidata's value wins where it has exactly one, and the infoboxes fill the rest in
// that order, except the publishers, where the English infobox names the original (publishersOf).
export function shapeGame(
  item: WikidataItem,
  infoboxes: Infoboxes,
  baseGameId: string | null,
): CatalogGame {
  const fromWikipedia: WikipediaField[] = [];
  // Wikidata's value, else the first infobox's, noting the fields an infobox filled.
  const pick = <T>(
    wikidata: T | null,
    read: (facts: InfoboxFacts) => T | null,
    fields: WikipediaField[],
  ): T | null => {
    if (filled(wikidata)) {
      return wikidata;
    }
    const value = firstInfobox(infoboxes, read);
    if (value !== null) {
      fromWikipedia.push(...fields);
    }
    return value;
  };
  const year = pick(within(item.year, 1, 9999), (f) => f.year, ["year"]);
  const publishers = publishersOf(item, infoboxes);
  if (
    filled(infoboxes.en?.publishers) ||
    (wikidataPublishers(item).length === 0 && publishers.length > 0)
  ) {
    fromWikipedia.push("publishers");
  }
  const designers = pick(
    [...new Set(item.designers)].sort(byName),
    (f) => f.designers,
    ["designers"],
  );
  const players = playersOf(item, infoboxes);
  fromWikipedia.push(...players.fromWikipedia);
  const wikidataMinutes = minutesFromWikidata(item.durations);
  const minutes = pick(
    wikidataMinutes.min === null ? null : wikidataMinutes,
    (f) => (f.minutes.min === null ? null : f.minutes),
    ["minMinutes", "maxMinutes"],
  );
  const minAge = pick(ageFromWikidata(item.minAges), (f) => f.minAge, [
    "minAge",
  ]);
  const categories = pick(categoriesOf(item), (f) => f.categories, [
    "categories",
  ]);
  const game: CatalogGame = {
    id: gameId(item.qid),
    wikidataId: item.qid,
    type: baseGameId === null ? "base-game" : "expansion",
    ...(baseGameId === null ? {} : { baseGameId }),
    title: titleOf(item) ?? item.qid,
    ...optional("year", year),
    ...optional("publishers", publishers),
    ...optional("designers", designers),
    ...optional("minPlayers", players.min),
    ...optional("maxPlayers", players.max),
    ...optional("minMinutes", minutes?.min ?? null),
    ...optional("maxMinutes", minutes?.max ?? null),
    ...optional("minAge", minAge),
    ...optional("categories", categories),
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

// A Commons file's name from an infobox's image parameter or Wikidata's address for the file:
// "[[File:harbor_lights.jpg|250px]]" and ".../Special:FilePath/Harbor%20Lights.jpg" both name
// "Harbor lights.jpg", spaced and capitalized as Commons names it. Anything else is no image.
export function imageFileFromText(value: string): string | null {
  const address = value.match(/Special:FilePath\/(.+)$/)?.[1];
  let name = value;
  if (address !== undefined) {
    try {
      name = decodeURIComponent(address);
    } catch {
      return null;
    }
  }
  name = (
    name
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/^\s*\[\[/, "")
      .split("|")[0] ?? ""
  )
    .replace(/\]\]\s*$/, "")
    .replace(/^\s*(?:file|image|datei|bild|fichier)\s*:/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!/^[^/{}<>[\]]+\.(?:jpe?g|png|gif|svg|webp|tiff?)$/i.test(name)) {
    return null;
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// A game's images in the order they're tried: Wikidata's, then its English, German and French
// infoboxes'. English Wikipedia's are often box art it keeps under fair use, which Commons lacks.
export function imageFilesOf(
  item: WikidataItem,
  infoboxes: Infoboxes,
): string[] {
  const files = [
    item.image,
    ...LANGUAGES.map((language) => infoboxes[language]?.image ?? null),
  ];
  return [...new Set(files.filter((file): file is string => file !== null))];
}

// What Wikimedia Commons says of an image file: its address at the width the script asked for,
// its page, its type, and the credit its page asks for, as plain text.
export type CommonsImage = {
  url: string;
  pageUrl: string;
  mime: string;
  artist: string | null;
  attribution: string | null;
  licence: string | null;
  attributionRequired: boolean;
};

// The longest credit that reads as a line under a cover.
const CREDIT_LENGTH = 100;

// Commons gives its credit fields as HTML: their text on one line, with their entities read and
// any hidden part left out.
export function textOfHtml(html: string): string {
  const named: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return html
    .replace(/<(\w+)[^>]*display:\s*none[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (entity, body: string) => {
      if (body.startsWith("#")) {
        const code =
          body[1] === "x" || body[1] === "X"
            ? Number.parseInt(body.slice(2), 16)
            : Number(body.slice(1));
        return Number.isFinite(code) ? String.fromCodePoint(code) : entity;
      }
      return named[body.toLowerCase()] ?? entity;
    })
    .replace(/\s+/g, " ")
    .trim();
}

// The name in a credit without Commons' boilerplate and wiki links around it: "No machine-readable
// author provided. Ines assumed (based on copyright claims)." is Ines, "en:User:Ines Ines" is
// Ines, "Ines (talk) 10:39, 28 October 2009 (UTC)" is Ines, and "myself (User:Ines)" is Ines. A
// last word's full stop goes, but not an initial's.
export function nameInCredit(who: string): string {
  const name = who
    .replace(
      /^No machine-readable author provided\. (.+?) assumed \(based on copyright claims\)\.?$/i,
      "$1",
    )
    .replace(/^[^:]*\.(?:jpe?g|png|gif|svg|tiff?):\s*/i, "")
    .replace(/\b(?:[a-z]{1,3}:)?User(?:[ _]talk)?:/gi, "")
    .replace(/\s*\((?:talk|uploads|contribs)\)/gi, "")
    .replace(/\s*\d{1,2}:\d{2}, \d{1,2} \p{L}+ \d{4} \(UTC\)/giu, "")
    .replace(/^(?:myself|self|own work)\s*\((.+)\)$/i, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/(\p{L}{3,})\.$/u, "$1");
  return name.replace(/^(.+) \1$/, "$1");
}

// The credit an image asks for, on one line: who made it, then its licence ("Ines Varga, CC BY-SA
// 4.0"). An image whose licence doesn't ask for a name and that gives none is credited by its
// licence alone ("Public domain"), and one under Commons' Attribution licence, which asks only
// for the name, by its name. The catalog doesn't use an image without a licence, under the GFDL
// alone (which asks for its whole text to go with the image), without the name its licence asks
// for, with an email address in its credit, or with a credit too long for a line.
export function creditOf(image: CommonsImage): string | null {
  const { licence } = image;
  if (licence === null || licence === "" || /^GFDL\b/i.test(licence)) {
    return null;
  }
  const who = image.attribution ?? image.artist;
  if (who !== null && /@|\[at\]/i.test(who)) {
    return null;
  }
  const name = who === null ? "" : nameInCredit(who);
  if (name === "" || /^unknown\b/i.test(name)) {
    return image.attributionRequired ? null : licence;
  }
  const credit =
    licence === "Attribution" || name.includes(licence)
      ? name
      : `${name}, ${licence}`;
  return credit.length <= CREDIT_LENGTH ? credit : null;
}

// The game with the first of its images that Commons has as a picture with a credit, its fields
// set before its popularity, in the games model's order. A game none of whose images will do
// stays as it was, and shows its token (Y1).
export function withImage(
  game: CatalogGame,
  files: readonly string[],
  commons: ReadonlyMap<string, CommonsImage>,
): CatalogGame {
  for (const file of files) {
    const image = commons.get(file);
    const credit = image?.mime.startsWith("image/") ? creditOf(image) : null;
    if (image === undefined || credit === null) {
      continue;
    }
    const { popularity, wikipediaFields, ...facts } = game;
    return {
      ...facts,
      imageUrl: image.url,
      imageCredit: credit,
      imageSourceUrl: image.pageUrl,
      popularity,
      ...(wikipediaFields === undefined ? {} : { wikipediaFields }),
    };
  }
  return game;
}
