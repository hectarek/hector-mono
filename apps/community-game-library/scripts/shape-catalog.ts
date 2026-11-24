// Makes db/catalog.jsonl, the catalog's own dataset (docs/catalog-data.md, The plan), from
// Wikidata and the English, German and French Wikipedias' infoboxes, with free images from
// Wikimedia Commons for the best-known games, and prints what it holds. U24 loads the file.
//
//   cd apps/community-game-library
//   bun scripts/shape-catalog.ts
//
// It asks Wikimedia one request at a time, a second apart, with a User-Agent that names the
// project and where to reach it, as Wikimedia's policy asks (Hector, 2026-11-23). It reads no
// BoardGameGeek data, no Wikidata property that points at it, and no Wikidata value whose
// reference names it (D7).
import {
  BOARD_GAME,
  baseOf,
  type CatalogGame,
  type CommonsImage,
  gameId,
  type Infoboxes,
  type InfoboxFacts,
  imageFileFromText,
  imageFilesOf,
  infoboxFacts,
  isPublished,
  LANGUAGES,
  type Language,
  OTHER_GAME_CLASSES,
  orderGames,
  type Publisher,
  type Quantity,
  shapeGame,
  textOfHtml,
  toJsonLines,
  type WikidataItem,
  whyLeftOut,
  withImage,
} from "@/scripts/lib/catalog";
import { print } from "@/scripts/lib/terminal";

export const USER_AGENT = `CommunityGameLibraryCatalogBot/1.0 (https://github.com/hectarek/hector-mono) bun/${Bun.version}`;

const WIKIDATA_QUERY = "https://query.wikidata.org/sparql";
const wikipediaApi = (language: Language) =>
  `https://${language}.wikipedia.org/w/api.php`;
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";
const CATALOG_FILE = new URL("../db/catalog.jsonl", import.meta.url);

// BoardGameGeek's own Wikidata item. A statement whose reference names it, or links to its site,
// is left out, so none of BoardGameGeek's data reaches the catalog through Wikidata (D7).
const BOARDGAMEGEEK = "Q887528";

// The best-rank statements of `property` (what wdt: gives), each matched by `value`, a pattern on
// the statement, unless a reference names BoardGameGeek. `name` keeps each statement's variables
// apart.
const statement = (property: string, name: string, value: string) =>
  `?item p:${property} ?${name}St . ?${name}St a wikibase:BestRank ; ${value} .
    ${notFromBoardGameGeek(name)}`;
// The same for any of several properties, one UNION branch each. The query service answers 500
// ("Headless value factory should not be asked for its namespace") to a query that aggregates
// over a variable property or a statement itself, so neither appears outside its branch.
const anyStatement = (properties: string[], name: string, value: string) =>
  `${properties.map((p) => `{ ?item p:${p} ?${name}St . ?${name}St ps:${p} ${value} }`).join(" UNION ")}
    ?${name}St a wikibase:BestRank .
    ${notFromBoardGameGeek(name)}`;
const notFromBoardGameGeek = (name: string) =>
  `FILTER NOT EXISTS { ?${name}St prov:wasDerivedFrom ?${name}Ref .
      { ?${name}Ref pr:P248 wd:${BOARDGAMEGEEK} }
      UNION { ?${name}Ref pr:P854 ?${name}Url FILTER(CONTAINS(LCASE(STR(?${name}Url)), "boardgamegeek.com")) } }`;

// Items per detail query (500 took about 3 s on 2026-11-23, well inside the service's 60 s), and
// articles per Wikipedia request (the API's most for a client without a bot account).
const ITEMS_PER_QUERY = 500;
const ARTICLES_PER_REQUEST = 50;
const PAUSE_MS = 1000;
const ATTEMPTS = 4;

// The best-known games that get a free image (Hector, 2026-11-24: "the top games"), and the width
// asked of Commons: one of the widths Wikimedia's servers make, which refuse others to a link from
// outside (mediawiki.org, Common thumbnail sizes, 2026). It covers the 148px-high cover on a
// phone's screen.
const IMAGED_GAMES = 500;
const IMAGE_WIDTH = 500;

// The candidates: board games and their subclasses, and the other game classes directly. Asked
// apart and joined here, since one query asking both with the details timed out (2026-11-23).
const BOARD_GAMES_QUERY = `SELECT DISTINCT ?item WHERE { ?item wdt:P31/wdt:P279* wd:${BOARD_GAME} }`;
const OTHER_GAMES_QUERY = `SELECT DISTINCT ?item WHERE {
  VALUES ?class { ${OTHER_GAME_CLASSES.map((qid) => `wd:${qid}`).join(" ")} } ?item wdt:P31 ?class
}`;

const values = (qids: string[]) => qids.map((qid) => `wd:${qid}`).join(" ");

// The properties that make an item a published game: a publisher, a designer (four ways Wikidata
// names one) or a release date. Any statement of them counts, one whose reference names
// BoardGameGeek too: it says the game was published, while its value stays out of the catalog.
const DESIGNER_PROPERTIES = ["P287", "P170", "P178", "P50"];
const PUBLISHED_PROPERTIES = ["P123", ...DESIGNER_PROPERTIES, "P577"];

// Each candidate's name, articles, classes and the rest, and whether Wikidata shows it published.
const itemsQuery = (
  qids: string[],
) => `SELECT ?item (SAMPLE(STR(?l)) AS ?label) (SAMPLE(?sl) AS ?sitelinks)
  (SAMPLE(STR(?en)) AS ?enwiki) (SAMPLE(STR(?de)) AS ?dewiki) (SAMPLE(STR(?fr)) AS ?frwiki)
  (MAX(IF(BOUND(?made), 1, 0)) AS ?published)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?class), "entity/"); separator=" ") AS ?classes)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?genre), "entity/"); separator=" ") AS ?genres)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?country), "entity/"); separator=" ") AS ?countries)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?base), "entity/"); separator=" ") AS ?expansionOf)
  (MIN(YEAR(?date)) AS ?year)
WHERE {
  VALUES ?item { ${values(qids)} }
  ?item wikibase:sitelinks ?sl .
  OPTIONAL { ?item ${PUBLISHED_PROPERTIES.map((p) => `wdt:${p}`).join("|")} ?made }
  OPTIONAL { ?item rdfs:label ?l FILTER(LANG(?l) = "en") }
  OPTIONAL { ?enArticle schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?en }
  OPTIONAL { ?deArticle schema:about ?item ; schema:isPartOf <https://de.wikipedia.org/> ; schema:name ?de }
  OPTIONAL { ?frArticle schema:about ?item ; schema:isPartOf <https://fr.wikipedia.org/> ; schema:name ?fr }
  OPTIONAL { ?item wdt:P31 ?class }
  OPTIONAL { ?item wdt:P136 ?genre }
  OPTIONAL { ?item wdt:P495 ?country }
  OPTIONAL { ?item wdt:P8646 ?base }
  OPTIONAL { ${statement("P577", "date", "ps:P577 ?date")} }
} GROUP BY ?item`;

// Players, play time and age, each statement of the best rank with its unit, and the item's image
// (the first by name, so a run doesn't pick another of several).
const numbersQuery = (qids: string[]) => `SELECT ?item
  (MIN(STR(?image)) AS ?image)
  (GROUP_CONCAT(DISTINCT STR(?minP); separator=" ") AS ?minPlayers)
  (GROUP_CONCAT(DISTINCT STR(?maxP); separator=" ") AS ?maxPlayers)
  (GROUP_CONCAT(DISTINCT ?dur; separator=" ") AS ?durations)
  (GROUP_CONCAT(DISTINCT ?age; separator=" ") AS ?ages)
WHERE {
  VALUES ?item { ${values(qids)} }
  OPTIONAL { ?item wdt:P18 ?image }
  OPTIONAL { ${statement("P1872", "minP", "ps:P1872 ?minP")} }
  OPTIONAL { ${statement("P1873", "maxP", "ps:P1873 ?maxP")} }
  OPTIONAL { ${statement("P2047", "dur", "psv:P2047 ?dv . ?dv wikibase:quantityAmount ?da ; wikibase:quantityUnit ?du")}
    BIND(CONCAT(STR(?da), ":", STRAFTER(STR(?du), "entity/")) AS ?dur) }
  OPTIONAL { ${statement("P2899", "age", "psv:P2899 ?av . ?av wikibase:quantityAmount ?aa ; wikibase:quantityUnit ?au")}
    BIND(CONCAT(STR(?aa), ":", STRAFTER(STR(?au), "entity/")) AS ?age) }
} GROUP BY ?item`;

// Publishers with their country and how well known they are, and designers who are people.
const peopleQuery = (qids: string[]) => `SELECT ?item
  (GROUP_CONCAT(DISTINCT ?pub; separator="\\n") AS ?publishers)
  (GROUP_CONCAT(DISTINCT ?des; separator="\\n") AS ?designers)
WHERE {
  VALUES ?item { ${values(qids)} }
  OPTIONAL {
    ${statement("P123", "pub", "ps:P123 ?p")}
    ?p rdfs:label ?pl FILTER(LANG(?pl) = "en") ?p wikibase:sitelinks ?pLinks .
    OPTIONAL { ?p wdt:P17 ?pc }
    BIND(CONCAT(STR(?pl), "\\t", STR(?pLinks), "\\t", COALESCE(STRAFTER(STR(?pc), "entity/"), "")) AS ?pub)
  }
  OPTIONAL {
    ${anyStatement(DESIGNER_PROPERTIES, "des", "?d")}
    ?d wdt:P31 wd:Q5 ; rdfs:label ?dl FILTER(LANG(?dl) = "en")
    BIND(STR(?dl) AS ?des)
  }
} GROUP BY ?item`;

type Binding = Record<string, { value: string } | undefined>;

let lastRequestAt = 0;

// The answers that mean busy, worth asking again. The query service answers a query it can't run
// with 500, which asking again doesn't change, except one: its "Headless value factory" error came
// and went for a query that ran before and after it (2026-11-24), so that one is asked again too.
const BUSY = new Set([429, 502, 503, 504]);
const PASSING_ERROR = /Headless value factory/;

// One request at a time, a second apart, asked again when Wikimedia says it's busy.
async function request(url: string, init: RequestInit = {}): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const wait = lastRequestAt + PAUSE_MS - Date.now();
    if (wait > 0) {
      await Bun.sleep(wait);
    }
    lastRequestAt = Date.now();
    const response = await fetch(url, {
      ...init,
      headers: { ...init.headers, "User-Agent": USER_AGENT },
    });
    if (response.ok) {
      return response;
    }
    const body = await response.text();
    const again =
      BUSY.has(response.status) ||
      (response.status === 500 && PASSING_ERROR.test(body));
    if (!again || attempt === ATTEMPTS) {
      const why = body.match(/\w*Exception[^\n]{0,200}/g)?.at(-1) ?? "";
      throw new Error(
        `${url.split("?")[0]} answered ${response.status} ${why}`,
      );
    }
    const retryAfter = Number(response.headers.get("Retry-After"));
    await Bun.sleep(
      (Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter
        : 5 * attempt) * 1000,
    );
  }
}

async function query(sparql: string): Promise<Binding[]> {
  const response = await request(WIKIDATA_QUERY, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ query: sparql }),
  });
  const data = (await response.json()) as { results: { bindings: Binding[] } };
  return data.results.bindings;
}

const text = (binding: Binding, key: string) => binding[key]?.value ?? "";
const words = (binding: Binding, key: string) =>
  text(binding, key).split(" ").filter(Boolean);
const qidOf = (binding: Binding) =>
  text(binding, "item").split("/").pop() ?? "";

function quantities(binding: Binding, key: string): Quantity[] {
  return words(binding, key).map((value) => {
    const [amount, unit] = value.split(":");
    return { amount: Number(amount), unit: unit || null };
  });
}

function publishers(binding: Binding): Publisher[] {
  return text(binding, "publishers")
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [name = "", sitelinks = "0", country = ""] = line.split("\t");
      return {
        name,
        sitelinks: Number(sitelinks),
        countries: country ? [country] : [],
      };
    });
}

const batches = (qids: string[]) =>
  Array.from({ length: Math.ceil(qids.length / ITEMS_PER_QUERY) }, (_, index) =>
    qids.slice(index * ITEMS_PER_QUERY, (index + 1) * ITEMS_PER_QUERY),
  );

// The candidates Wikidata shows published, and those with an English article whose infobox might,
// with everything the rules read but their numbers and people (fetchDetails).
async function fetchItems(): Promise<Map<string, WikidataItem>> {
  const candidates = new Set<string>();
  for (const sparql of [BOARD_GAMES_QUERY, OTHER_GAMES_QUERY]) {
    for (const row of await query(sparql)) {
      candidates.add(qidOf(row));
    }
  }
  const items = new Map<string, WikidataItem>();
  for (const batch of batches([...candidates].sort())) {
    for (const row of await query(itemsQuery(batch))) {
      const published = text(row, "published") === "1";
      const enwikiTitle = text(row, "enwiki") || null;
      if (!(published || enwikiTitle)) {
        continue;
      }
      const year = Number(text(row, "year"));
      items.set(qidOf(row), {
        qid: qidOf(row),
        label: text(row, "label") || null,
        enwikiTitle,
        dewikiTitle: text(row, "dewiki") || null,
        frwikiTitle: text(row, "frwiki") || null,
        published,
        sitelinks: Number(text(row, "sitelinks")),
        classes: words(row, "classes"),
        genres: words(row, "genres"),
        countries: words(row, "countries"),
        year: text(row, "year") && Number.isFinite(year) ? year : null,
        expansionOf: words(row, "expansionOf"),
        minPlayers: [],
        maxPlayers: [],
        durations: [],
        minAges: [],
        publishers: [],
        designers: [],
        image: null,
      });
    }
  }
  return items;
}

// Each item's players, play time, age, image, publishers and designers.
async function fetchDetails(items: WikidataItem[]): Promise<void> {
  const byQid = new Map(items.map((item) => [item.qid, item]));
  for (const batch of batches([...byQid.keys()])) {
    for (const row of await query(numbersQuery(batch))) {
      const item = byQid.get(qidOf(row));
      if (item) {
        item.minPlayers = words(row, "minPlayers").map(Number);
        item.maxPlayers = words(row, "maxPlayers").map(Number);
        item.durations = quantities(row, "durations");
        item.minAges = quantities(row, "ages");
        item.image = imageFileFromText(text(row, "image"));
      }
    }
    for (const row of await query(peopleQuery(batch))) {
      const item = byQid.get(qidOf(row));
      if (item) {
        item.publishers = publishers(row);
        item.designers = text(row, "designers").split("\n").filter(Boolean);
      }
    }
  }
}

type Page = {
  title: string;
  missing?: boolean;
  revisions?: { slots: { main: { content: string } } }[];
};
type ArticlesAnswer = {
  query?: { normalized?: { from: string; to: string }[]; pages: Page[] };
  error?: { code: string; info: string };
};

// Each article's infobox facts on one Wikipedia, by the title Wikidata gave, reading only its lead
// section.
async function fetchInfoboxes(
  language: Language,
  titles: string[],
): Promise<Map<string, InfoboxFacts>> {
  const facts = new Map<string, InfoboxFacts>();
  for (let start = 0; start < titles.length; start += ARTICLES_PER_REQUEST) {
    const batch = titles.slice(start, start + ARTICLES_PER_REQUEST);
    const params = new URLSearchParams({
      action: "query",
      prop: "revisions",
      rvprop: "content",
      rvslots: "main",
      rvsection: "0",
      format: "json",
      formatversion: "2",
      maxlag: "5",
      titles: batch.join("|"),
    });
    const answer = (await (
      await request(`${wikipediaApi(language)}?${params}`)
    ).json()) as ArticlesAnswer;
    if (answer.error || !answer.query) {
      throw new Error(
        `Wikipedia answered ${answer.error?.code ?? "nothing"}: ${answer.error?.info ?? ""}`,
      );
    }
    const asked = new Map(
      answer.query.normalized?.map(({ from, to }) => [to, from]) ?? [],
    );
    for (const page of answer.query.pages) {
      const content = page.revisions?.[0]?.slots.main.content;
      if (content !== undefined) {
        facts.set(
          asked.get(page.title) ?? page.title,
          infoboxFacts(content, language),
        );
      }
    }
  }
  return facts;
}

type ImagePage = {
  title: string;
  imageinfo?: {
    url: string;
    thumburl?: string;
    descriptionurl: string;
    mime: string;
    extmetadata?: Record<string, { value: string } | undefined>;
  }[];
};
type ImagesAnswer = {
  query?: {
    normalized?: { from: string; to: string }[];
    redirects?: { from: string; to: string }[];
    pages: ImagePage[];
  };
  error?: { code: string; info: string };
};

// What Commons says of each file, by the name asked for: its address IMAGE_WIDTH wide, its page,
// and its credit. A file Commons lacks, such as box art English Wikipedia keeps under fair use,
// isn't in the map.
async function fetchCommonsImages(
  files: string[],
): Promise<Map<string, CommonsImage>> {
  const images = new Map<string, CommonsImage>();
  for (let start = 0; start < files.length; start += ARTICLES_PER_REQUEST) {
    const batch = files.slice(start, start + ARTICLES_PER_REQUEST);
    const params = new URLSearchParams({
      action: "query",
      prop: "imageinfo",
      iiprop: "url|mime|extmetadata",
      iiurlwidth: `${IMAGE_WIDTH}`,
      iiextmetadatafilter:
        "Artist|Attribution|AttributionRequired|LicenseShortName",
      iiextmetadatalanguage: "en",
      redirects: "1",
      format: "json",
      formatversion: "2",
      maxlag: "5",
      titles: batch.map((file) => `File:${file}`).join("|"),
    });
    const answer = (await (
      await request(`${COMMONS_API}?${params}`)
    ).json()) as ImagesAnswer;
    if (answer.error || !answer.query) {
      throw new Error(
        `Commons answered ${answer.error?.code ?? "nothing"}: ${answer.error?.info ?? ""}`,
      );
    }
    // A page's title back to the name asked for, through a redirect and Commons' spelling.
    const back = new Map(
      [
        ...(answer.query.redirects ?? []),
        ...(answer.query.normalized ?? []),
      ].map(({ from, to }) => [to, from]),
    );
    const askedFor = (title: string) => {
      let name = title;
      for (let step = 0; step < 3 && back.has(name); step++) {
        name = back.get(name) ?? name;
      }
      return name.replace(/^File:/, "");
    };
    for (const page of answer.query.pages) {
      const info = page.imageinfo?.[0];
      if (info === undefined) {
        continue;
      }
      const field = (name: string) => {
        const value = info.extmetadata?.[name]?.value;
        return value === undefined ? null : textOfHtml(value);
      };
      images.set(askedFor(page.title), {
        url: info.thumburl ?? info.url,
        pageUrl: info.descriptionurl,
        mime: info.mime,
        artist: field("Artist"),
        attribution: field("Attribution"),
        licence: field("LicenseShortName"),
        attributionRequired: field("AttributionRequired") !== "false",
      });
    }
  }
  return images;
}

const titleIn = (item: WikidataItem, language: Language) =>
  ({ en: item.enwikiTitle, de: item.dewikiTitle, fr: item.frwikiTitle })[
    language
  ];

// The articles the items have on one Wikipedia, each title once.
const titlesIn = (items: WikidataItem[], language: Language) => [
  ...new Set(
    items
      .map((item) => titleIn(item, language))
      .filter((title): title is string => title !== null),
  ),
];

// The catalog's games from the fetched items: the published ones, those left out with why, each
// expansion with its base game, and each game's infoboxes read for the values Wikidata lacks.
async function shapeCatalog(items: Map<string, WikidataItem>) {
  const read: Partial<Record<Language, Map<string, InfoboxFacts>>> = {
    en: await fetchInfoboxes("en", titlesIn([...items.values()], "en")),
  };
  const infoboxesOf = (item: WikidataItem): Infoboxes => {
    const found: Infoboxes = {};
    for (const language of LANGUAGES) {
      const title = titleIn(item, language);
      const facts = title === null ? undefined : read[language]?.get(title);
      if (facts) {
        found[language] = facts;
      }
    }
    return found;
  };
  const published = [...items.values()].filter((item) =>
    isPublished(item, infoboxesOf(item).en),
  );
  await fetchDetails(published);
  const leftOut = new Map<string, number>();
  const kept: WikidataItem[] = [];
  for (const item of published) {
    const why = whyLeftOut(item);
    if (why === null) {
      kept.push(item);
    } else {
      leftOut.set(why, (leftOut.get(why) ?? 0) + 1);
    }
  }
  const baseGames = new Set(
    kept
      .filter(({ expansionOf }) => expansionOf.length === 0)
      .map(({ qid }) => qid),
  );
  const shelved = kept.filter(
    (item) => item.expansionOf.length === 0 || baseOf(item, baseGames) !== null,
  );
  const noBase = kept.length - shelved.length;
  if (noBase > 0) {
    leftOut.set("an expansion of a game not in the catalog", noBase);
  }
  read.de = await fetchInfoboxes("de", titlesIn(shelved, "de"));
  read.fr = await fetchInfoboxes("fr", titlesIn(shelved, "fr"));
  const games = orderGames(
    shelved.map((item) => {
      const base = baseOf(item, baseGames);
      return shapeGame(
        item,
        infoboxesOf(item),
        base === null ? null : gameId(base),
      );
    }),
  );
  // The best-known games' images, each game's tried in order (imageFilesOf).
  const imageFiles = new Map(
    games.slice(0, IMAGED_GAMES).flatMap((game) => {
      const item = items.get(game.wikidataId);
      return item ? [[game.id, imageFilesOf(item, infoboxesOf(item))]] : [];
    }),
  );
  const commons = await fetchCommonsImages([
    ...new Set([...imageFiles.values()].flat()),
  ]);
  return {
    games: games.map((game) =>
      withImage(game, imageFiles.get(game.id) ?? [], commons),
    ),
    leftOut,
    byEnglishInfobox: shelved.filter((item) => !item.published).length,
    articlesRead: [
      `English ${read.en?.size ?? 0}`,
      `German ${read.de.size}`,
      `French ${read.fr.size}`,
    ].join(", "),
  };
}

function summary({
  games,
  leftOut,
  byEnglishInfobox,
  articlesRead,
}: Awaited<ReturnType<typeof shapeCatalog>>) {
  const count = (has: (game: CatalogGame) => boolean) =>
    games.filter(has).length;
  const filled = (field: keyof CatalogGame, from = field) =>
    `${count((game) => game[field] !== undefined)}, ${count((game) => game.wikipediaFields?.some((name) => name === from) ?? false)} from Wikipedia`;
  return [
    `${games.length} games: ${count((game) => game.type === "base-game")} base games and ${count((game) => game.type === "expansion")} expansions, ${byEnglishInfobox} published by their English infobox alone`,
    `players (both bounds) ${count((game) => game.minPlayers !== undefined && game.maxPlayers !== undefined)}, ${count((game) => game.wikipediaFields?.includes("maxPlayers") ?? false)} from Wikipedia`,
    `play time ${filled("minMinutes")}`,
    `minimum age ${filled("minAge")}`,
    `year ${filled("year")}`,
    `designers ${filled("designers")}`,
    `publishers ${filled("publishers")}`,
    `categories ${filled("categories")}`,
    `images ${count((game) => game.imageUrl !== undefined)}, all among the ${IMAGED_GAMES} best known`,
    `Wikipedia articles read: ${articlesRead}`,
    ...[...leftOut].map(([why, items]) => `left out, ${why}: ${items}`),
  ];
}

async function main(): Promise<number> {
  const items = await fetchItems();
  const shaped = await shapeCatalog(items);
  await Bun.write(CATALOG_FILE, toJsonLines(shaped.games));
  print(`Wrote db/catalog.jsonl from ${items.size} Wikidata items.`);
  for (const line of summary(shaped)) {
    print(line);
  }
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
