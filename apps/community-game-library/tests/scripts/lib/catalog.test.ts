import { describe, expect, it } from "bun:test";
import {
  ageFromText,
  baseOf,
  type CatalogGame,
  type CommonsImage,
  categoriesFromText,
  categoriesOf,
  creditOf,
  gameId,
  type InfoboxFacts,
  imageFileFromText,
  imageFilesOf,
  infoboxFacts,
  infoboxParams,
  isPublished,
  minutesFromText,
  minutesFromWikidata,
  nameInCredit,
  namesFromText,
  orderGames,
  playersFromText,
  publishersOf,
  shapeGame,
  textOfHtml,
  toJsonLines,
  type WikidataItem,
  whyLeftOut,
  withImage,
  yearFromText,
} from "@/scripts/lib/catalog";
import { gameSchema } from "@/src/entities/models/game.model";

// Fictional records in Wikidata's shape, with the design canvas's games (R45). The ids are made
// up; the classes and units are Wikidata's own (Q131436 board game, Q7727 minute).
function item(overrides: Partial<WikidataItem> = {}): WikidataItem {
  return {
    qid: "Q900101",
    label: "Harbor Lights",
    enwikiTitle: "Harbor Lights (board game)",
    dewikiTitle: null,
    frwikiTitle: null,
    published: true,
    sitelinks: 4,
    classes: ["Q131436"],
    genres: [],
    countries: ["Q30"],
    year: 2019,
    expansionOf: [],
    minPlayers: [2],
    maxPlayers: [5],
    durations: [
      { amount: 45, unit: "Q7727" },
      { amount: 60, unit: "Q7727" },
    ],
    minAges: [{ amount: 10, unit: "Q577" }],
    publishers: [{ name: "Tidewater Games", countries: ["Q30"], sitelinks: 1 }],
    designers: ["Ines Varga"],
    image: null,
    ...overrides,
  };
}

const HARBOR_LIGHTS_ARTICLE = `'''Harbor Lights''' is a game.
{{Short description|Board game}}
{{Infobox game
| name = Harbor Lights
| image = Harbor Lights box.png
| designer = [[Ines Varga]] and Tom Reyes<ref>{{cite web|url=https://press.example/harbor|title=Designers}}</ref>
| publisher = [[Tidewater Games]] (US)<br />[[Fernhouse|Fernhouse Spiele]] (Germany)<br />Κάισσα
| players = {{ubl|2–5 (standard)|2–6 (with expansion)}}
| playing_time = {{nowrap|45–60}} minutes <!-- per the box -->
| ages = 10+
}}
'''Harbor Lights''' is a game about a fishing fleet.`;

// The same game's German and French articles, each infobox in its own language's names.
const HARBOR_LIGHTS_GERMAN = `{{Infobox Spiel
| Titel = Hafenlichter
| Art = [[Kartenspiel]], Legespiel
| Autor = [[Ines Varga]] und Tom Reyes
| Verlag = {{USA}}: [[Tidewater Games]],<br />[[Fernhouse]], u.&nbsp;a.
| Erscheinungsjahr = 2019<ref>{{Internetquelle |url=https://press.example/hafen |abruf=2024-05-01}}</ref>
| Mitspieler = 2 bis 5
| Dauer = ca. 45–60 Minuten
| Alter = ab 10 Jahren
| Bild = Hafenlichter_Spielbrett.jpg
}}
'''Hafenlichter''' ist ein Spiel.`;

const HARBOR_LIGHTS_FRENCH = `{{Infobox Jeu
| nom = Feux du port
| type = jeu de société
| auteur0 = Ines Varga
| auteur1 = Tom Reyes
| éditeur = {{lang|en|[[Tidewater Games]]}}
| année0 = 2019 (2020 en France)
| joueurs mini = 2
| joueurs maxi = 5 (6 avec l'extension)
| âge mini = 10
| durée = env. 1 h
| mécanisme1 = coopération
| thème1 = [[Science-fiction]]
| image = [[Fichier:feux du port.svg|200px]]
}}`;

// An infobox's facts with nothing in them but what a test names.
function facts(overrides: Partial<InfoboxFacts> = {}): InfoboxFacts {
  return {
    players: { min: null, max: null },
    minutes: { min: null, max: null },
    minAge: null,
    year: null,
    designers: [],
    publishers: [],
    categories: [],
    image: null,
    ...overrides,
  };
}

describe("infoboxParams", () => {
  it("splits the first infobox's parameters, not at a pipe inside a template or a link", () => {
    const params = infoboxParams(HARBOR_LIGHTS_ARTICLE);
    expect(params.get("players")).toBe(
      "{{ubl|2–5 (standard)|2–6 (with expansion)}}",
    );
    expect(params.get("publisher")).toContain("[[Fernhouse|Fernhouse Spiele]]");
    expect(params.has("short description")).toBe(false);
  });

  it("is empty for an article with no infobox", () => {
    expect(infoboxParams("'''Night Market''' is a game.").size).toBe(0);
  });
});

describe("infoboxFacts", () => {
  it("reads the base game's players, the play time, the age, the designers and the publishers", () => {
    expect(infoboxFacts(HARBOR_LIGHTS_ARTICLE)).toEqual(
      facts({
        players: { min: 2, max: 5 },
        minutes: { min: 45, max: 60 },
        minAge: 10,
        designers: ["Ines Varga", "Tom Reyes"],
        publishers: ["Tidewater Games", "Fernhouse Spiele"],
        image: "Harbor Lights box.png",
      }),
    );
  });

  it("reads the English infobox's year and genre", () => {
    expect(
      infoboxFacts(
        "{{Infobox game\n| date = {{Start date|2019}}\n| genre = [[Board game]]<br />[[Abstract strategy game]]\n}}",
      ),
    ).toEqual(facts({ year: 2019, categories: ["Abstract"] }));
  });

  it("reads a German infobox in German", () => {
    expect(infoboxFacts(HARBOR_LIGHTS_GERMAN, "de")).toEqual({
      players: { min: 2, max: 5 },
      minutes: { min: 45, max: 60 },
      minAge: 10,
      year: 2019,
      designers: ["Ines Varga", "Tom Reyes"],
      publishers: ["Tidewater Games", "Fernhouse"],
      categories: ["Card game", "Tile-laying"],
      image: "Hafenlichter Spielbrett.jpg",
    });
  });

  it("reads a French infobox, with its players apart and its authors and years numbered", () => {
    expect(infoboxFacts(HARBOR_LIGHTS_FRENCH, "fr")).toEqual({
      players: { min: 2, max: 5 },
      minutes: { min: 60, max: 60 },
      minAge: 10,
      year: 2019,
      designers: ["Ines Varga", "Tom Reyes"],
      publishers: ["Tidewater Games"],
      categories: ["Cooperative", "Science fiction"],
      image: "Feux du port.svg",
    });
  });

  it("gives nothing for parameters the infobox lacks", () => {
    expect(infoboxFacts("{{Infobox game\n| name = Salt & Signal\n}}")).toEqual(
      facts(),
    );
    expect(
      infoboxFacts(
        "{{Infobox Jeu\n| nom = Sel et signal\n| joueurs mini = 2\n}}",
        "fr",
      ),
    ).toEqual(facts({ players: { min: 2, max: null } }));
  });
});

describe("isPublished", () => {
  it("counts what Wikidata shows published, or what the English infobox gives a designer or publisher", () => {
    expect(isPublished(item(), undefined)).toBe(true);
    expect(
      isPublished(
        item({ published: false }),
        facts({ designers: ["Ines Varga"] }),
      ),
    ).toBe(true);
    expect(
      isPublished(
        item({ published: false }),
        facts({ publishers: ["Fernhouse"] }),
      ),
    ).toBe(true);
  });

  it("leaves out a game whose infobox has only a date, as a traditional game's does", () => {
    expect(isPublished(item({ published: false }), facts({ year: 1890 }))).toBe(
      false,
    );
    expect(isPublished(item({ published: false }), undefined)).toBe(false);
  });
});

describe("playersFromText", () => {
  it.each([
    ["2–4", { min: 2, max: 4 }],
    ["2-6", { min: 2, max: 6 }],
    ["3 to 8", { min: 3, max: 8 }],
    ["2+", { min: 2, max: null }],
    ["2 bis 4", { min: 2, max: 4 }],
    ["2 à 7", { min: 2, max: 7 }],
    ["2 et plus", { min: 2, max: null }],
    ["3 und mehr", { min: 3, max: null }],
    ["2", { min: 2, max: 2 }],
    ["Two", { min: null, max: null }],
    ["4–2", { min: null, max: null }],
    ["2–500", { min: null, max: null }],
  ])("reads %p", (text, players) => {
    expect(playersFromText(text)).toEqual(players);
  });
});

describe("minutesFromText", () => {
  it.each([
    ["30–60 minutes", { min: 30, max: 60 }],
    ["1–2 hours", { min: 60, max: 120 }],
    ["45 min", { min: 45, max: 45 }],
    ["60 minutes – 2 hours", { min: 60, max: 120 }],
    ["90", { min: 90, max: 90 }],
    ["ca. 45 Minuten", { min: 45, max: 45 }],
    ["2 bis 3 Stunden", { min: 120, max: 180 }],
    ["1,5 Stunden", { min: 90, max: 90 }],
    ["2 à 3h", { min: 120, max: 180 }],
    ["30 min à 1h", { min: 30, max: 60 }],
    ["5", { min: null, max: null }],
    ["about an hour", { min: null, max: null }],
  ])("reads %p", (text, minutes) => {
    expect(minutesFromText(text)).toEqual(minutes);
  });
});

describe("yearFromText", () => {
  it.each([
    ["{{Start date|1995}}", 1995],
    ["1972 (1976 en France)", 1972],
    ["2001<ref>{{cite web|access-date=2019-01-01}}</ref>", 2001],
    ["unknown", null],
  ])("reads %p", (text, year) => {
    expect(yearFromText(text)).toBe(year);
  });
});

describe("categoriesFromText", () => {
  it("maps each language's own words to the catalog's", () => {
    expect(categoriesFromText("Strategy, Economic", "en")).toEqual([
      "Economic",
      "Strategy",
    ]);
    expect(categoriesFromText("Kartenspiel", "de")).toEqual(["Card game"]);
    expect(categoriesFromText("course", "fr")).toEqual(["Racing"]);
  });

  it("reads a word only in its own language", () => {
    expect(categoriesFromText("course", "en")).toEqual([]);
  });
});

describe("ageFromText", () => {
  it.each([
    ["10+", 10],
    ["8 and up", 8],
    ["Ages 12", 12],
    ["99", null],
    ["all ages", null],
  ])("reads %p", (text, age) => {
    expect(ageFromText(text)).toBe(age);
  });
});

describe("namesFromText", () => {
  it("splits people at a line, a comma or 'and', and leaves out what isn't a name", () => {
    expect(
      namesFromText(
        "Ines Varga, Tom Reyes and Mei Lin\nVarious\n2 people",
        "people",
      ),
    ).toEqual(["Ines Varga", "Tom Reyes", "Mei Lin"]);
  });

  it("keeps a company's digits and its 'and', and drops bracketed notes and other scripts", () => {
    expect(
      namesFromText(
        "Bellwether and Co. (US, Canada)\n999 Tides\nΚάισσα",
        "companies",
      ),
    ).toEqual(["Bellwether and Co.", "999 Tides"]);
  });

  it("splits people at the language's 'and', and drops what a flag left and 'among others'", () => {
    expect(namesFromText("Ines Varga und Tom Reyes", "people", "de")).toEqual([
      "Ines Varga",
      "Tom Reyes",
    ]);
    expect(namesFromText("Ines Varga et Tom Reyes", "people", "fr")).toEqual([
      "Ines Varga",
      "Tom Reyes",
    ]);
    expect(
      namesFromText(": Tidewater Games\nFernhouse\nu. a.", "companies", "de"),
    ).toEqual(["Tidewater Games", "Fernhouse"]);
    expect(namesFromText("Fernhouse u. a.", "companies", "de")).toEqual([
      "Fernhouse",
    ]);
  });
});

describe("minutesFromWikidata", () => {
  it("takes one value as both bounds and two as the range, in hours or minutes", () => {
    expect(minutesFromWikidata([{ amount: 75, unit: "Q7727" }])).toEqual({
      min: 75,
      max: 75,
    });
    expect(
      minutesFromWikidata([
        { amount: 2, unit: "Q25235" },
        { amount: 1, unit: "Q25235" },
      ]),
    ).toEqual({ min: 60, max: 120 });
  });

  it("counts a value with no unit as minutes from 10 up", () => {
    expect(minutesFromWikidata([{ amount: 40, unit: "Q199" }])).toEqual({
      min: 40,
      max: 40,
    });
    expect(minutesFromWikidata([{ amount: 2, unit: "Q199" }])).toEqual({
      min: null,
      max: null,
    });
  });

  it("leaves three values, or a unit it doesn't know, to Wikipedia", () => {
    expect(
      minutesFromWikidata([
        { amount: 30, unit: "Q7727" },
        { amount: 45, unit: "Q7727" },
        { amount: 90, unit: "Q7727" },
      ]),
    ).toEqual({ min: null, max: null });
    expect(minutesFromWikidata([{ amount: 1, unit: "Q573" }])).toEqual({
      min: null,
      max: null,
    });
  });
});

describe("whyLeftOut", () => {
  it("keeps a game with an English name", () => {
    expect(whyLeftOut(item())).toBeNull();
  });

  it("leaves out an item with no English name or article", () => {
    expect(whyLeftOut(item({ label: null, enwikiTitle: null }))).toBe(
      "no English name",
    );
  });

  it("leaves out a video game of a board game", () => {
    expect(whyLeftOut(item({ classes: ["Q131436", "Q7889"] }))).toBe(
      "not a tabletop game",
    );
  });
});

describe("publishersOf", () => {
  const publishers = [
    { name: "Lantern Row Games", countries: ["Q183"], sitelinks: 9 },
    { name: "Tidewater Games", countries: ["Q30"], sitelinks: 1 },
    { name: "Fernhouse", countries: ["Q142"], sitelinks: 3 },
    { name: "Small Hours Press", countries: [], sitelinks: 0 },
    { name: "Κάισσα", countries: ["Q41"], sitelinks: 20 },
  ];

  it("takes the English infobox's publishers, in its order, at most three", () => {
    expect(
      publishersOf(item({ publishers }), {
        en: facts({
          publishers: [
            "Fernhouse",
            "Tidewater Games",
            "Small Hours Press",
            "Lantern Row Games",
          ],
        }),
        de: facts({ publishers: ["Lantern Row Games"] }),
      }),
    ).toEqual(["Fernhouse", "Tidewater Games", "Small Hours Press"]);
  });

  it("without the English infobox's, puts the game's own country first, then the best known", () => {
    expect(
      publishersOf(item({ publishers }), {
        de: facts({ publishers: ["Lantern Row Games"] }),
      }),
    ).toEqual(["Tidewater Games", "Lantern Row Games", "Fernhouse"]);
  });

  it("takes the German, then the French infobox's when neither English nor Wikidata names one", () => {
    expect(
      publishersOf(item({ publishers: [] }), {
        de: facts({ publishers: ["Fernhouse"] }),
        fr: facts({ publishers: ["Tidewater Games"] }),
      }),
    ).toEqual(["Fernhouse"]);
    expect(publishersOf(item({ publishers: [] }), {})).toEqual([]);
  });
});

describe("categoriesOf", () => {
  it("names the classes and genres it knows, a card game only by its class", () => {
    expect(
      categoriesOf(
        item({
          classes: ["Q131436", "Q1783817"],
          genres: ["Q142714", "Q132311", "Q999999"],
        }),
      ),
    ).toEqual(["Cooperative", "Fantasy"]);
    expect(categoriesOf(item({ classes: ["Q142714"] }))).toEqual(["Card game"]);
  });
});

describe("shapeGame", () => {
  it("takes Wikidata's values where it has one each, and fits the games model", () => {
    const game = shapeGame(item(), {}, null);
    expect(game).toEqual({
      id: gameId("Q900101"),
      wikidataId: "Q900101",
      type: "base-game",
      title: "Harbor Lights",
      year: 2019,
      publishers: ["Tidewater Games"],
      designers: ["Ines Varga"],
      minPlayers: 2,
      maxPlayers: 5,
      minMinutes: 45,
      maxMinutes: 60,
      minAge: 10,
      popularity: 4,
    });
    const parsed = gameSchema.safeParse({
      ...game,
      baseGameId: null,
      searchTitle: "harbor lights",
      bestPlayers: null,
      complexity: null,
      categories: null,
      description: null,
      imageUrl: null,
      imageCredit: null,
      imageSourceUrl: null,
      videoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(parsed.success).toBe(true);
  });

  it("drops the kind of game a label carries in brackets, and keeps an edition", () => {
    const titleFor = (label: string) =>
      shapeGame(item({ label }), {}, null).title;
    expect(titleFor("Lantern Row (board game)")).toBe("Lantern Row");
    expect(titleFor("Lantern Row (game)")).toBe("Lantern Row");
    expect(titleFor("Lantern Row (2nd Edition)")).toBe(
      "Lantern Row (2nd Edition)",
    );
  });

  it("fills from the infobox what Wikidata lacks or gives more than once, and says so", () => {
    const game = shapeGame(
      item({
        maxPlayers: [5, 6, 7],
        durations: [],
        minAges: [],
        designers: [],
        publishers: [],
      }),
      { en: infoboxFacts(HARBOR_LIGHTS_ARTICLE) },
      null,
    );
    expect(game).toMatchObject({
      minPlayers: 2,
      maxPlayers: 5,
      minMinutes: 45,
      maxMinutes: 60,
      minAge: 10,
      designers: ["Ines Varga", "Tom Reyes"],
      publishers: ["Tidewater Games", "Fernhouse Spiele"],
    });
    expect([...(game.wikipediaFields ?? [])].sort()).toEqual([
      "designers",
      "maxMinutes",
      "maxPlayers",
      "minAge",
      "minMinutes",
      "publishers",
    ]);
  });

  it("fills what English leaves empty from the German, then the French infobox", () => {
    const game = shapeGame(
      item({
        year: null,
        maxPlayers: [],
        durations: [],
        minAges: [],
        designers: [],
        publishers: [],
      }),
      {
        en: facts({ players: { min: 2, max: 4 } }),
        de: infoboxFacts(HARBOR_LIGHTS_GERMAN, "de"),
        fr: infoboxFacts(HARBOR_LIGHTS_FRENCH, "fr"),
      },
      null,
    );
    expect(game).toMatchObject({
      year: 2019,
      publishers: ["Tidewater Games", "Fernhouse"],
      designers: ["Ines Varga", "Tom Reyes"],
      minPlayers: 2,
      maxPlayers: 4,
      minMinutes: 45,
      maxMinutes: 60,
      minAge: 10,
      categories: ["Card game", "Tile-laying"],
    });
    expect([...(game.wikipediaFields ?? [])].sort()).toEqual([
      "categories",
      "designers",
      "maxMinutes",
      "maxPlayers",
      "minAge",
      "minMinutes",
      "publishers",
      "year",
    ]);
  });

  it("keeps Wikidata's player bound alone where an infobox's would cross it", () => {
    const game = shapeGame(
      item({ minPlayers: [4], maxPlayers: [] }),
      { en: facts({ players: { min: 1, max: 3 } }) },
      null,
    );
    expect(game.minPlayers).toBe(4);
    expect(game.maxPlayers).toBeUndefined();
    expect(game.wikipediaFields ?? []).not.toContain("maxPlayers");
  });

  it("leaves out of the line what neither source has", () => {
    const game = shapeGame(
      item({
        year: null,
        minPlayers: [],
        maxPlayers: [],
        durations: [],
        minAges: [],
        publishers: [],
        designers: [],
      }),
      {},
      null,
    );
    expect(Object.keys(game).sort()).toEqual([
      "id",
      "popularity",
      "title",
      "type",
      "wikidataId",
    ]);
  });

  it("names a game from its article when it has no English label, and capitalizes a lower-case label", () => {
    expect(shapeGame(item({ label: null }), {}, null).title).toBe(
      "Harbor Lights",
    );
    expect(shapeGame(item({ label: "quarry lane" }), {}, null).title).toBe(
      "Quarry lane",
    );
  });

  it("makes an expansion of the game it expands", () => {
    const game = shapeGame(
      item({ qid: "Q900112", label: "Harbor Lights: Night Tide" }),
      {},
      gameId("Q900101"),
    );
    expect(game.type).toBe("expansion");
    expect(game.baseGameId).toBe(gameId("Q900101"));
  });
});

describe("baseOf", () => {
  it("finds the one base game in the catalog an item expands", () => {
    const bases = new Set(["Q900101"]);
    expect(baseOf(item({ expansionOf: ["Q900101"] }), bases)).toBe("Q900101");
    expect(baseOf(item({ expansionOf: ["Q900555"] }), bases)).toBeNull();
    expect(baseOf(item({ expansionOf: [] }), bases)).toBeNull();
  });
});

describe("gameId", () => {
  it("is the same UUID every run for the same item, and another for another", () => {
    expect(gameId("Q900101")).toBe(gameId("Q900101"));
    expect(gameId("Q900101")).not.toBe(gameId("Q900102"));
    expect(gameId("Q900101")).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe("orderGames and toJsonLines", () => {
  it("puts base games first, then the best known, then by title, one game a line", () => {
    const games: CatalogGame[] = [
      shapeGame(
        item({
          qid: "Q900112",
          label: "Harbor Lights: Night Tide",
          sitelinks: 9,
        }),
        {},
        gameId("Q900101"),
      ),
      shapeGame(
        item({ qid: "Q900103", label: "Night Market", sitelinks: 2 }),
        {},
        null,
      ),
      shapeGame(
        item({ qid: "Q900102", label: "Moss & Mortar", sitelinks: 2 }),
        {},
        null,
      ),
      shapeGame(item({ qid: "Q900101", sitelinks: 4 }), {}, null),
    ];
    const ordered = orderGames(games);
    expect(ordered.map(({ title }) => title)).toEqual([
      "Harbor Lights",
      "Moss & Mortar",
      "Night Market",
      "Harbor Lights: Night Tide",
    ]);
    const lines = toJsonLines(ordered).split("\n");
    expect(lines).toHaveLength(5);
    expect(lines.at(-1)).toBe("");
    expect(JSON.parse(lines[0] ?? "")).toEqual(ordered[0]);
  });
});

describe("imageFileFromText", () => {
  it.each([
    ["Harbor_Lights box.png", "Harbor Lights box.png"],
    ["[[File:harbor lights.jpg|250px|The box]]", "Harbor lights.jpg"],
    ["[[Datei:Hafenlichter.JPG]]", "Hafenlichter.JPG"],
    ["Fichier:Feux du port.svg <!-- the 2020 box -->", "Feux du port.svg"],
    [
      "http://commons.wikimedia.org/wiki/Special:FilePath/Harbor%20Lights%20%28game%29.jpg",
      "Harbor Lights (game).jpg",
    ],
  ])("reads %p as %p", (value, file) => {
    expect(imageFileFromText(value)).toBe(file);
  });

  it.each([
    "",
    "Harbor Lights",
    "{{Multiple image|image1=A.jpg|image2=B.jpg}}",
    "http://commons.wikimedia.org/wiki/Special:FilePath/%E0%A4%A.jpg",
    "Harbor Lights.pdf",
  ])("reads no image in %p", (value) => {
    expect(imageFileFromText(value)).toBeNull();
  });
});

describe("imageFilesOf", () => {
  it("tries Wikidata's image, then the English, German and French infoboxes', each once", () => {
    expect(
      imageFilesOf(item({ image: "Harbor Lights table.jpg" }), {
        fr: facts({ image: "Feux du port.svg" }),
        de: facts({ image: "Harbor Lights table.jpg" }),
        en: facts({ image: "Harbor Lights box.png" }),
      }),
    ).toEqual([
      "Harbor Lights table.jpg",
      "Harbor Lights box.png",
      "Feux du port.svg",
    ]);
    expect(imageFilesOf(item(), {})).toEqual([]);
  });
});

describe("textOfHtml", () => {
  it("reads Commons' HTML as one line of text, its entities read and hidden parts left out", () => {
    expect(
      textOfHtml(
        '<bdi><a href="//commons.example/wiki/User:Ines" title="User:Ines">Ines&nbsp;Varga</a></bdi>\n &amp; <span style="display: none;">Ines Varga</span>Tom&#32;Reyes &#x2013; Fernhouse',
      ),
    ).toBe("Ines Varga & Tom Reyes – Fernhouse");
  });
});

// A Commons image as fetchCommonsImages gives it, with only what a test sets.
function commonsImage(overrides: Partial<CommonsImage> = {}): CommonsImage {
  return {
    url: "https://images.example/thumb/Harbor_Lights_table.jpg/500px-Harbor_Lights_table.jpg",
    pageUrl: "https://images.example/wiki/File:Harbor_Lights_table.jpg",
    mime: "image/jpeg",
    artist: "Ines Varga",
    attribution: null,
    licence: "CC BY-SA 4.0",
    attributionRequired: true,
    ...overrides,
  };
}

describe("nameInCredit", () => {
  it.each([
    ["User_talk:Ines Varga", "Ines Varga"],
    ["myself (User:Ines Varga)", "Ines Varga"],
    [
      "Harbor_lights.jpg: Tom Reyes derivative work: Ines (talk)",
      "Tom Reyes derivative work: Ines",
    ],
    ["Ines Varga", "Ines Varga"],
    ["en:User:Ines Ines", "Ines"],
    ["Ines (talk) 10:39, 28 October 2009 (UTC)", "Ines"],
    ["Ines (talk) (Uploads)", "Ines"],
    [
      "Original image by w:User:Tom Reyes, vectorized by User:InesV.",
      "Original image by Tom Reyes, vectorized by InesV",
    ],
    ["Ines V.", "Ines V."],
  ])("reads %p as %p", (who, name) => {
    expect(nameInCredit(who)).toBe(name);
  });
});

describe("creditOf", () => {
  it.each([
    ["names who made it and the licence", {}, "Ines Varga, CC BY-SA 4.0"],
    [
      "takes the credit a page asks for over its author",
      { attribution: "Photo: Tom Reyes" },
      "Photo: Tom Reyes, CC BY-SA 4.0",
    ],
    [
      "doesn't repeat a licence the credit names",
      { attribution: "Tom Reyes / CC BY-SA 4.0" },
      "Tom Reyes / CC BY-SA 4.0",
    ],
    [
      "names only the author under Commons' Attribution licence",
      { licence: "Attribution" },
      "Ines Varga",
    ],
    [
      "takes the name out of Commons' boilerplate",
      {
        artist:
          "No machine-readable author provided. Ines Varga assumed (based on copyright claims).",
      },
      "Ines Varga, CC BY-SA 4.0",
    ],
    [
      "takes the name out of a wiki link",
      { artist: "Photo by en:User:Ines_V (talk)" },
      "Photo by Ines_V, CC BY-SA 4.0",
    ],
    [
      "gives the licence alone when it asks for no name and has none",
      {
        artist: "Unknown author",
        licence: "Public domain",
        attributionRequired: false,
      },
      "Public domain",
    ],
  ])("%s", (_case, overrides, credit) => {
    expect(creditOf(commonsImage(overrides))).toBe(credit);
  });

  it.each([
    ["has no licence", { licence: null }],
    ["is under the GFDL alone", { licence: "GFDL 1.2" }],
    [
      "has an email address in its credit",
      { artist: "ines [at] example.test" },
    ],
    ["asks for a name it doesn't give", { artist: null }],
    [
      "has a credit too long for a line",
      {
        artist:
          "Ines Varga, Tom Reyes, Mei Lin, Dev Patel, Noor Haddad, Ben Ortiz and Jo Park of the Harbor Lights club",
      },
    ],
  ])("is none when the image %s", (_case, overrides) => {
    expect(creditOf(commonsImage(overrides))).toBeNull();
  });
});

describe("withImage", () => {
  const game = shapeGame(
    item(),
    { en: infoboxFacts(HARBOR_LIGHTS_ARTICLE) },
    null,
  );

  it("takes the first image Commons has as a picture with a credit, before the popularity", () => {
    const commons = new Map([
      ["Harbor Lights rules.pdf", commonsImage({ mime: "application/pdf" })],
      ["Harbor Lights table.jpg", commonsImage()],
    ]);
    const imaged = withImage(
      game,
      [
        "Harbor Lights box.png",
        "Harbor Lights rules.pdf",
        "Harbor Lights table.jpg",
      ],
      commons,
    );
    expect(imaged).toMatchObject({
      imageUrl: commonsImage().url,
      imageCredit: "Ines Varga, CC BY-SA 4.0",
      imageSourceUrl: commonsImage().pageUrl,
    });
    expect(Object.keys(imaged).slice(-5)).toEqual([
      "imageUrl",
      "imageCredit",
      "imageSourceUrl",
      "popularity",
      "wikipediaFields",
    ]);
  });

  it("leaves a game none of whose images will do as it was", () => {
    expect(
      withImage(
        game,
        ["Harbor Lights table.jpg"],
        new Map([["Harbor Lights table.jpg", commonsImage({ artist: null })]]),
      ),
    ).toBe(game);
  });
});
