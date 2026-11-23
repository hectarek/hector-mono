import { describe, expect, it } from "bun:test";
import {
  ageFromText,
  baseOf,
  type CatalogGame,
  categoriesOf,
  gameId,
  infoboxFacts,
  infoboxParams,
  minutesFromText,
  minutesFromWikidata,
  namesFromText,
  orderGames,
  playersFromText,
  publishersOf,
  shapeGame,
  toJsonLines,
  type WikidataItem,
  whyLeftOut,
} from "@/scripts/lib/catalog";
import { gameSchema } from "@/src/entities/models/game.model";

// Fictional records in Wikidata's shape, with the design canvas's games (R45). The ids are made
// up; the classes and units are Wikidata's own (Q131436 board game, Q7727 minute).
function item(overrides: Partial<WikidataItem> = {}): WikidataItem {
  return {
    qid: "Q900101",
    label: "Harbor Lights",
    enwikiTitle: "Harbor Lights (board game)",
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
    expect(infoboxFacts(HARBOR_LIGHTS_ARTICLE)).toEqual({
      players: { min: 2, max: 5 },
      minutes: { min: 45, max: 60 },
      minAge: 10,
      designers: ["Ines Varga", "Tom Reyes"],
      publishers: ["Tidewater Games", "Fernhouse Spiele"],
    });
  });

  it("gives nothing for parameters the infobox lacks", () => {
    expect(infoboxFacts("{{Infobox game\n| name = Salt & Signal\n}}")).toEqual({
      players: { min: null, max: null },
      minutes: { min: null, max: null },
      minAge: null,
      designers: [],
      publishers: [],
    });
  });
});

describe("playersFromText", () => {
  it.each([
    ["2–4", { min: 2, max: 4 }],
    ["2-6", { min: 2, max: 6 }],
    ["3 to 8", { min: 3, max: 8 }],
    ["2+", { min: 2, max: null }],
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
    ["5", { min: null, max: null }],
    ["about an hour", { min: null, max: null }],
  ])("reads %p", (text, minutes) => {
    expect(minutesFromText(text)).toEqual(minutes);
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

  it("takes the infobox's publishers, in its order, at most three", () => {
    expect(
      publishersOf(item({ publishers }), [
        "Fernhouse",
        "Tidewater Games",
        "Small Hours Press",
        "Lantern Row Games",
      ]),
    ).toEqual(["Fernhouse", "Tidewater Games", "Small Hours Press"]);
  });

  it("without an infobox, puts the game's own country first, then the best known", () => {
    expect(publishersOf(item({ publishers }), [])).toEqual([
      "Tidewater Games",
      "Lantern Row Games",
      "Fernhouse",
    ]);
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
    const game = shapeGame(item(), null, null);
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
      videoUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    expect(parsed.success).toBe(true);
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
      infoboxFacts(HARBOR_LIGHTS_ARTICLE),
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
      null,
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
    expect(shapeGame(item({ label: null }), null, null).title).toBe(
      "Harbor Lights",
    );
    expect(shapeGame(item({ label: "quarry lane" }), null, null).title).toBe(
      "Quarry lane",
    );
  });

  it("makes an expansion of the game it expands", () => {
    const game = shapeGame(
      item({ qid: "Q900112", label: "Harbor Lights: Night Tide" }),
      null,
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
        null,
        gameId("Q900101"),
      ),
      shapeGame(
        item({ qid: "Q900103", label: "Night Market", sitelinks: 2 }),
        null,
        null,
      ),
      shapeGame(
        item({ qid: "Q900102", label: "Moss & Mortar", sitelinks: 2 }),
        null,
        null,
      ),
      shapeGame(item({ qid: "Q900101", sitelinks: 4 }), null, null),
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
