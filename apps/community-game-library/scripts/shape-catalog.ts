// Makes db/catalog.jsonl, the catalog's own dataset (docs/catalog-data.md, The plan), from
// Wikidata and English Wikipedia's infoboxes, and prints what it holds. U24 loads the file.
//
//   cd apps/community-game-library
//   bun scripts/shape-catalog.ts
//
// It asks Wikimedia one request at a time, a second apart, with a User-Agent that names the
// project and where to reach it, as Wikimedia's policy asks (Hector, 2026-11-23). It reads no
// BoardGameGeek data, and no Wikidata property that points at it (D7).
import {
  BOARD_GAME,
  baseOf,
  type CatalogGame,
  gameId,
  type InfoboxFacts,
  infoboxFacts,
  OTHER_GAME_CLASSES,
  orderGames,
  type Publisher,
  type Quantity,
  shapeGame,
  toJsonLines,
  type WikidataItem,
  whyLeftOut,
} from "@/scripts/lib/catalog";
import { print } from "@/scripts/lib/terminal";

export const USER_AGENT = `CommunityGameLibraryCatalogBot/1.0 (https://github.com/hectarek/hector-mono) bun/${Bun.version}`;

const WIKIDATA_QUERY = "https://query.wikidata.org/sparql";
const WIKIPEDIA_API = "https://en.wikipedia.org/w/api.php";
const CATALOG_FILE = new URL("../db/catalog.jsonl", import.meta.url);

// Items per detail query (500 took about 3 s on 2026-11-23, well inside the service's 60 s), and
// articles per Wikipedia request (the API's most for a client without a bot account).
const ITEMS_PER_QUERY = 500;
const ARTICLES_PER_REQUEST = 50;
const PAUSE_MS = 1000;
const ATTEMPTS = 4;

// The candidates: board games and their subclasses, and the other game classes directly. Asked
// apart and joined here, since one query asking both with the details timed out (2026-11-23).
const BOARD_GAMES_QUERY = `SELECT DISTINCT ?item WHERE { ?item wdt:P31/wdt:P279* wd:${BOARD_GAME} }`;
const OTHER_GAMES_QUERY = `SELECT DISTINCT ?item WHERE {
  VALUES ?class { ${OTHER_GAME_CLASSES.map((qid) => `wd:${qid}`).join(" ")} } ?item wdt:P31 ?class
}`;

const values = (qids: string[]) => qids.map((qid) => `wd:${qid}`).join(" ");

// Each candidate's name, article, classes and the rest, and whether it's published: it has a
// publisher, a designer or a release date.
const itemsQuery = (
  qids: string[],
) => `SELECT ?item (SAMPLE(STR(?l)) AS ?label) (SAMPLE(STR(?en)) AS ?enwiki) (SAMPLE(?sl) AS ?sitelinks)
  (MAX(IF(BOUND(?made), 1, 0)) AS ?published)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?class), "entity/"); separator=" ") AS ?classes)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?genre), "entity/"); separator=" ") AS ?genres)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?country), "entity/"); separator=" ") AS ?countries)
  (GROUP_CONCAT(DISTINCT STRAFTER(STR(?base), "entity/"); separator=" ") AS ?expansionOf)
  (MIN(YEAR(?date)) AS ?year)
WHERE {
  VALUES ?item { ${values(qids)} }
  ?item wikibase:sitelinks ?sl .
  OPTIONAL { ?item wdt:P123|wdt:P287|wdt:P170|wdt:P178|wdt:P50|wdt:P577 ?made }
  OPTIONAL { ?item rdfs:label ?l FILTER(LANG(?l) = "en") }
  OPTIONAL { ?article schema:about ?item ; schema:isPartOf <https://en.wikipedia.org/> ; schema:name ?en }
  OPTIONAL { ?item wdt:P31 ?class }
  OPTIONAL { ?item wdt:P136 ?genre }
  OPTIONAL { ?item wdt:P495 ?country }
  OPTIONAL { ?item wdt:P8646 ?base }
  OPTIONAL { ?item wdt:P577 ?date }
} GROUP BY ?item`;

// Players, play time and age, each statement of the best rank with its unit.
const numbersQuery = (qids: string[]) => `SELECT ?item
  (GROUP_CONCAT(DISTINCT STR(?minP); separator=" ") AS ?minPlayers)
  (GROUP_CONCAT(DISTINCT STR(?maxP); separator=" ") AS ?maxPlayers)
  (GROUP_CONCAT(DISTINCT ?dur; separator=" ") AS ?durations)
  (GROUP_CONCAT(DISTINCT ?age; separator=" ") AS ?ages)
WHERE {
  VALUES ?item { ${values(qids)} }
  OPTIONAL { ?item wdt:P1872 ?minP }
  OPTIONAL { ?item wdt:P1873 ?maxP }
  OPTIONAL { ?item p:P2047 ?ds . ?ds a wikibase:BestRank ; psv:P2047 ?dv . ?dv wikibase:quantityAmount ?da ; wikibase:quantityUnit ?du .
    BIND(CONCAT(STR(?da), ":", STRAFTER(STR(?du), "entity/")) AS ?dur) }
  OPTIONAL { ?item p:P2899 ?as . ?as a wikibase:BestRank ; psv:P2899 ?av . ?av wikibase:quantityAmount ?aa ; wikibase:quantityUnit ?au .
    BIND(CONCAT(STR(?aa), ":", STRAFTER(STR(?au), "entity/")) AS ?age) }
} GROUP BY ?item`;

// Publishers with their country and how well known they are, and designers who are people.
const peopleQuery = (qids: string[]) => `SELECT ?item
  (GROUP_CONCAT(DISTINCT ?pub; separator="\\n") AS ?publishers)
  (GROUP_CONCAT(DISTINCT ?des; separator="\\n") AS ?designers)
WHERE {
  VALUES ?item { ${values(qids)} }
  OPTIONAL {
    ?item wdt:P123 ?p . ?p rdfs:label ?pl FILTER(LANG(?pl) = "en") ?p wikibase:sitelinks ?ps .
    OPTIONAL { ?p wdt:P17 ?pc }
    BIND(CONCAT(STR(?pl), "\\t", STR(?ps), "\\t", COALESCE(STRAFTER(STR(?pc), "entity/"), "")) AS ?pub)
  }
  OPTIONAL {
    ?item wdt:P287|wdt:P170|wdt:P178|wdt:P50 ?d . ?d wdt:P31 wd:Q5 ; rdfs:label ?dl FILTER(LANG(?dl) = "en")
    BIND(STR(?dl) AS ?des)
  }
} GROUP BY ?item`;

type Binding = Record<string, { value: string } | undefined>;

let lastRequestAt = 0;

// The answers that mean busy, worth asking again. The query service answers a query it can't run
// with 500, which asking again doesn't change.
const BUSY = new Set([429, 502, 503, 504]);

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
    if (!BUSY.has(response.status) || attempt === ATTEMPTS) {
      if (!response.ok) {
        const why =
          (await response.text()).match(/\w*Exception[^\n]{0,200}/g)?.at(-1) ??
          "";
        throw new Error(
          `${url.split("?")[0]} answered ${response.status} ${why}`,
        );
      }
      return response;
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

// The published games among the candidates, with everything the rules read.
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
      if (text(row, "published") !== "1") {
        continue;
      }
      const year = Number(text(row, "year"));
      items.set(qidOf(row), {
        qid: qidOf(row),
        label: text(row, "label") || null,
        enwikiTitle: text(row, "enwiki") || null,
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
      });
    }
  }
  for (const batch of batches([...items.keys()])) {
    for (const row of await query(numbersQuery(batch))) {
      const item = items.get(qidOf(row));
      if (item) {
        item.minPlayers = words(row, "minPlayers").map(Number);
        item.maxPlayers = words(row, "maxPlayers").map(Number);
        item.durations = quantities(row, "durations");
        item.minAges = quantities(row, "ages");
      }
    }
    for (const row of await query(peopleQuery(batch))) {
      const item = items.get(qidOf(row));
      if (item) {
        item.publishers = publishers(row);
        item.designers = text(row, "designers").split("\n").filter(Boolean);
      }
    }
  }
  return items;
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

// Each article's infobox facts, by the title Wikidata gave, reading only its lead section.
async function fetchInfoboxes(
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
      await request(`${WIKIPEDIA_API}?${params}`)
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
        facts.set(asked.get(page.title) ?? page.title, infoboxFacts(content));
      }
    }
  }
  return facts;
}

// The catalog's games from the fetched items: those left out with why, each expansion with its
// base game, and the infobox read for the values Wikidata lacks.
async function shapeCatalog(items: Map<string, WikidataItem>) {
  const leftOut = new Map<string, number>();
  const kept: WikidataItem[] = [];
  for (const item of items.values()) {
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
  const titles = shelved
    .map(({ enwikiTitle }) => enwikiTitle)
    .filter((title): title is string => title !== null);
  const infoboxes = await fetchInfoboxes([...new Set(titles)]);
  const games = shelved.map((item) => {
    const base = baseOf(item, baseGames);
    return shapeGame(
      item,
      item.enwikiTitle === null
        ? null
        : (infoboxes.get(item.enwikiTitle) ?? null),
      base === null ? null : gameId(base),
    );
  });
  return { games: orderGames(games), leftOut, articlesRead: infoboxes.size };
}

function summary(
  games: CatalogGame[],
  leftOut: Map<string, number>,
  articlesRead: number,
) {
  const count = (has: (game: CatalogGame) => boolean) =>
    games.filter(has).length;
  const fromWikipedia = (field: string) =>
    count(
      (game) => game.wikipediaFields?.some((name) => name === field) ?? false,
    );
  return [
    `${games.length} games: ${count((game) => game.type === "base-game")} base games and ${count((game) => game.type === "expansion")} expansions`,
    `players (both bounds) ${count((game) => game.minPlayers !== undefined && game.maxPlayers !== undefined)}, ${fromWikipedia("maxPlayers")} from Wikipedia`,
    `play time ${count((game) => game.minMinutes !== undefined)}, ${fromWikipedia("minMinutes")} from Wikipedia`,
    `minimum age ${count((game) => game.minAge !== undefined)}, ${fromWikipedia("minAge")} from Wikipedia`,
    `designers ${count((game) => game.designers !== undefined)}, ${fromWikipedia("designers")} from Wikipedia`,
    `publishers ${count((game) => game.publishers !== undefined)}, ${fromWikipedia("publishers")} from Wikipedia`,
    `year ${count((game) => game.year !== undefined)}, categories ${count((game) => game.categories !== undefined)}`,
    `English Wikipedia articles read: ${articlesRead}`,
    ...[...leftOut].map(([why, items]) => `left out, ${why}: ${items}`),
  ];
}

async function main(): Promise<number> {
  const items = await fetchItems();
  const { games, leftOut, articlesRead } = await shapeCatalog(items);
  await Bun.write(CATALOG_FILE, toJsonLines(games));
  print(`Wrote db/catalog.jsonl from ${items.size} Wikidata items.`);
  for (const line of summary(games, leftOut, articlesRead)) {
    print(line);
  }
  return 0;
}

if (import.meta.main) {
  process.exit(await main());
}
