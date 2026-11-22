// The design canvas's fictional cast (docs/build-plan.md KTD13, KTD21): the kit's world on its
// today, as the boards draw it. Its people and their pieces, who's friends with whom, the games
// with their facts and expansions, the copies, and the loans in their states. Tests put it in
// either backend with makeApp().makeCast() (tests/_support/app.ts), and scripts/seed.ts writes it
// to the test project, so a screen can be checked against its board with the same data.
// Fictional people only: the repo is public (R45). A unit that needs more of the boards' world
// (friend requests, nights, notices) adds it here with its writes, and the seed picks it up.
import { inArray } from "drizzle-orm";
import { games, loans, userGameExpansions, userGames } from "@/db/schema";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import { dueOn, type LoanStatus } from "@/src/entities/loan";
import type { Game } from "@/src/entities/models/game.model";
import type { Loan } from "@/src/entities/models/loan.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type { UserGame } from "@/src/entities/models/user-game.model";
import type { UserGameExpansion } from "@/src/entities/models/user-game-expansion.model";
import type { NewUserProfile } from "@/src/entities/models/user-profile.model";
import type { NewUserSettings } from "@/src/entities/models/user-settings.model";
import type { PieceColor, PieceShape } from "@/src/entities/piece";
import { toSearchTitle } from "@/src/entities/search-title";
import { unwrapDrizzleTx } from "@/src/infrastructure/services/transaction-manager.service";

// The canvas's today: Tuesday, November 10, 2026.
export const CAST_TODAY = "2026-11-10";

// A fixed id for each row, readable in a failing test: people end in 1 to 9, games in 1xx,
// copies in 2xx and loans in 3xx. No account has one.
const castId = (n: number) =>
  `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

// The people, as the kit's world names them.
export const CAST_NAMES = [
  "you",
  "alice",
  "sam",
  "priya",
  "jo",
  "ben",
  "mei",
  "dev",
  "noor",
] as const;
export type CastName = (typeof CAST_NAMES)[number];

type CastPerson = {
  id: string;
  name: string;
  pieceShape: PieceShape;
  pieceColor: PieceColor;
  phone?: string;
  // My library's switch (B6), and so each of their copies'.
  defaultPassAlong?: boolean;
};

const PEOPLE: Record<CastName, CastPerson> = {
  // The person holding the phone (E5), and the admin (E5's Admin row).
  you: {
    id: castId(1),
    name: "Robin Vale",
    pieceShape: "pawn",
    pieceColor: "mustard",
    phone: "555 0199",
  },
  alice: {
    id: castId(2),
    name: "Alice",
    pieceShape: "house",
    pieceColor: "brick",
  },
  // He lets friends pass his games along.
  sam: {
    id: castId(3),
    name: "Sam",
    pieceShape: "house",
    pieceColor: "ocean",
    phone: "555 0142",
    defaultPassAlong: true,
  },
  priya: {
    id: castId(4),
    name: "Priya",
    pieceShape: "cone",
    pieceColor: "moss",
  },
  jo: {
    id: castId(5),
    name: "Jo",
    pieceShape: "cone",
    pieceColor: "plum",
    phone: "555 0117",
  },
  ben: { id: castId(6), name: "Ben", pieceShape: "pawn", pieceColor: "bone" },
  // Alice's friend, who has asked to be yours (E1).
  mei: { id: castId(7), name: "Mei", pieceShape: "cone", pieceColor: "rose" },
  // Alice's friend, whom you've asked (E1).
  dev: {
    id: castId(8),
    name: "Dev",
    pieceShape: "pawn",
    pieceColor: "charcoal",
  },
  // Sam's friend, someone you may know (E1).
  noor: { id: castId(9), name: "Noor", pieceShape: "ship", pieceColor: "teal" },
};

// The circle of six are all friends with each other (E1, E6, A5), and Mei and Dev are Alice's
// friends and Noor is Sam's, so You may know them (E1).
const CIRCLE: CastName[] = ["you", "alice", "sam", "priya", "jo", "ben"];
const FRIENDSHIPS: [CastName, CastName][] = [
  ...CIRCLE.flatMap((one, index) =>
    CIRCLE.slice(index + 1).map((other): [CastName, CastName] => [one, other]),
  ),
  ["alice", "mei"],
  ["alice", "dev"],
  ["sam", "noor"],
];

type GameFacts = Pick<
  Game,
  | "year"
  | "publishers"
  | "designers"
  | "minPlayers"
  | "maxPlayers"
  | "bestPlayers"
  | "minMinutes"
  | "maxMinutes"
  | "minAge"
  | "complexity"
  | "categories"
  | "description"
  | "videoUrl"
>;
type CastGame = { id: string; title: string } & Partial<GameFacts>;

// The kit's games, with the facts its world and the boards give, and the two catalog games search
// finds (B10). Complexity is the kit's weight as a word: under 2 light, then medium, and heavy
// from 3 (B5, B11 and D8 say the words).
const GAMES = {
  harborLights: {
    id: castId(101),
    title: "Harbor Lights",
    year: 2019,
    publishers: ["Tidewater Games"],
    designers: ["Ines Varga"],
    minPlayers: 2,
    maxPlayers: 5,
    bestPlayers: [4],
    minMinutes: 45,
    maxMinutes: 60,
    minAge: 10,
    complexity: "medium",
    categories: ["Nautical", "Family"],
    description:
      "Light a path home for the fishing fleet before the storm rolls in. Lay harbor tiles, collect sets of lanterns, and bring in more boats than anyone else. Each round the storm moves one space closer.",
    videoUrl: "https://video.example/harbor-lights-how-to-play",
  },
  mossAndMortar: {
    id: castId(102),
    title: "Moss & Mortar",
    year: 2021,
    publishers: ["Fernhouse"],
    minPlayers: 1,
    maxPlayers: 4,
    bestPlayers: [3],
    minMinutes: 60,
    maxMinutes: 90,
    minAge: 12,
    complexity: "heavy",
  },
  nightMarket: {
    id: castId(103),
    title: "Night Market",
    year: 2018,
    publishers: ["Lantern Row Games"],
    minPlayers: 3,
    maxPlayers: 6,
    bestPlayers: [5],
    minMinutes: 60,
    maxMinutes: 90,
    minAge: 10,
    complexity: "medium",
    categories: ["Economic", "Family"],
    description:
      "Run a stall in a crowded night market. Trade goods with the other stallholders and sell full sets before the lanterns go out.",
  },
  gullAndAnchor: {
    id: castId(104),
    title: "Gull & Anchor",
    year: 2020,
    publishers: ["Tidewater Games"],
    minPlayers: 2,
    maxPlayers: 4,
    bestPlayers: [2],
    minMinutes: 30,
    maxMinutes: 45,
    minAge: 8,
    complexity: "medium",
  },
  saltAndSignal: {
    id: castId(105),
    title: "Salt & Signal",
    year: 2022,
    publishers: ["Fernhouse"],
    minPlayers: 2,
    maxPlayers: 2,
    minMinutes: 30,
    maxMinutes: 30,
    minAge: 10,
    complexity: "light",
  },
  quarryLane: {
    id: castId(106),
    title: "Quarry Lane",
    year: 2017,
    publishers: ["Bellwether & Co."],
    minPlayers: 2,
    maxPlayers: 6,
    bestPlayers: [5],
    minMinutes: 90,
    maxMinutes: 90,
    minAge: 12,
    complexity: "medium",
  },
  tinKettleDerby: {
    id: castId(107),
    title: "Tin Kettle Derby",
    year: 2023,
    publishers: ["Lantern Row Games"],
    minPlayers: 3,
    maxPlayers: 8,
    bestPlayers: [6],
    minMinutes: 20,
    maxMinutes: 20,
    minAge: 8,
    complexity: "light",
  },
  fenwickFair: {
    id: castId(108),
    title: "Fenwick Fair",
    year: 2020,
    publishers: ["Bellwether & Co."],
    minPlayers: 2,
    maxPlayers: 4,
    bestPlayers: [3],
    minMinutes: 40,
    maxMinutes: 40,
    minAge: 8,
    complexity: "medium",
  },
  paperKites: {
    id: castId(109),
    title: "Paper Kites",
    year: 2016,
    publishers: ["Bellwether & Co."],
    minPlayers: 2,
    maxPlayers: 4,
    bestPlayers: [4],
    minMinutes: 30,
    maxMinutes: 30,
    minAge: 8,
    complexity: "light",
  },
  // In the catalog, on nobody's shelf (B10).
  harborMaster: {
    id: castId(110),
    title: "Harbor Master",
    year: 1998,
    publishers: ["Bellwether & Co."],
  },
  safeHarbor: {
    id: castId(111),
    title: "Safe Harbor",
    year: 2011,
    publishers: ["Small Hours Press"],
  },
} satisfies Record<string, CastGame>;
type GameKey = keyof typeof GAMES;

const EXPANSIONS = {
  // B5 and B10.
  nightTide: {
    id: castId(112),
    baseGame: "harborLights",
    title: "Harbor Lights: Night Tide",
    year: 2021,
  },
  // In your copy's box (B7).
  lowTide: {
    id: castId(113),
    baseGame: "gullAndAnchor",
    title: "Gull & Anchor: Low Tide",
  },
} satisfies Record<string, CastGame & { baseGame: GameKey }>;
type ExpansionKey = keyof typeof EXPANSIONS;

type CastCopy = {
  id: string;
  owner: CastName;
  game: GameKey;
  condition?: UserGame["condition"];
  conditionNote?: string;
  // Off for a copy its owner keeps at home.
  lendable?: boolean;
  expansions?: ExpansionKey[];
  addedAt: string;
};

// Every copy on the circle's shelves: All friends lists their 9 games (B1), and My library your 4
// (B6). E1 counts the rest: Alice 2, Sam 3, Priya 1, Jo 1, Ben none.
const COPIES = {
  samsHarborLights: {
    id: castId(201),
    owner: "sam",
    game: "harborLights",
    conditionNote: "1 part missing",
    expansions: ["nightTide"],
    addedAt: "2026-07-14T12:00:00-04:00",
  },
  alicesHarborLights: {
    id: castId(202),
    owner: "alice",
    game: "harborLights",
    condition: "like-new",
    addedAt: "2026-07-20T12:00:00-04:00",
  },
  samsMossAndMortar: {
    id: castId(203),
    owner: "sam",
    game: "mossAndMortar",
    conditionNote: "Box corner is split.",
    addedAt: "2026-07-14T12:05:00-04:00",
  },
  samsQuarryLane: {
    id: castId(204),
    owner: "sam",
    game: "quarryLane",
    addedAt: "2026-08-03T12:00:00-04:00",
  },
  yourNightMarket: {
    id: castId(205),
    owner: "you",
    game: "nightMarket",
    addedAt: "2026-07-12T12:00:00-04:00",
  },
  yourGullAndAnchor: {
    id: castId(206),
    owner: "you",
    game: "gullAndAnchor",
    conditionNote: "One blue anchor token is missing.",
    expansions: ["lowTide"],
    addedAt: "2026-07-12T12:05:00-04:00",
  },
  // A signed copy you keep at home: friends see it stamped Not lent.
  yourPaperKites: {
    id: castId(207),
    owner: "you",
    game: "paperKites",
    lendable: false,
    addedAt: "2026-07-12T12:10:00-04:00",
  },
  yourSaltAndSignal: {
    id: castId(208),
    owner: "you",
    game: "saltAndSignal",
    addedAt: "2026-08-20T12:00:00-04:00",
  },
  josSaltAndSignal: {
    id: castId(209),
    owner: "jo",
    game: "saltAndSignal",
    addedAt: "2026-09-01T12:00:00-04:00",
  },
  alicesTinKettleDerby: {
    id: castId(210),
    owner: "alice",
    game: "tinKettleDerby",
    addedAt: "2026-07-20T12:05:00-04:00",
  },
  priyasFenwickFair: {
    id: castId(211),
    owner: "priya",
    game: "fenwickFair",
    addedAt: "2026-07-25T12:00:00-04:00",
  },
} satisfies Record<string, CastCopy>;
type CopyKey = keyof typeof COPIES;

type CastLoan = {
  id: string;
  copy: CopyKey;
  borrower: CastName;
  status: LoanStatus;
  askedAt: string;
  requestNote?: string;
  // The owner's yes, and the day it was picked up: its due date is that day plus the period (D5).
  answeredAt?: string;
  pickedUpOn?: string;
  periodDays?: number;
  returnedOn?: string;
  moreTime?: { dueOn: string; note: string; askedAt: string };
};

// The loans in the states the boards show on the canvas's today, then the ones that ended (B7,
// C12). Times are Eastern.
const LOANS = {
  // Alice's Harbor Lights is out to Ben until Nov 20, with Jo 1st in line (B5, C10).
  benHasAlicesHarborLights: {
    id: castId(301),
    copy: "alicesHarborLights",
    borrower: "ben",
    status: "out",
    askedAt: "2026-11-03T18:30:00-05:00",
    answeredAt: "2026-11-04T08:10:00-05:00",
    pickedUpOn: "2026-11-06",
    periodDays: 14,
  },
  joAskedForAlicesHarborLights: {
    id: castId(302),
    copy: "alicesHarborLights",
    borrower: "jo",
    status: "requested",
    askedAt: "2026-11-07T10:00:00-05:00",
  },
  // You have Sam's Moss & Mortar for a week from Fri Nov 6, due Fri Nov 13, and Jo joined its
  // line at 7:15 this morning (C5, F1).
  youHaveMossAndMortar: {
    id: castId(303),
    copy: "samsMossAndMortar",
    borrower: "you",
    status: "out",
    askedAt: "2026-11-04T20:00:00-05:00",
    answeredAt: "2026-11-05T09:00:00-05:00",
    pickedUpOn: "2026-11-06",
    periodDays: 7,
  },
  joAskedForMossAndMortar: {
    id: castId(304),
    copy: "samsMossAndMortar",
    borrower: "jo",
    status: "requested",
    askedAt: "2026-11-10T07:15:00-05:00",
  },
  // Priya asked for your Night Market 20 minutes ago (C2, F1).
  priyaAskedForNightMarket: {
    id: castId(305),
    copy: "yourNightMarket",
    borrower: "priya",
    status: "requested",
    askedAt: "2026-11-10T09:20:00-05:00",
    requestNote: "Can I grab it Friday?",
  },
  // Jo has your Gull & Anchor for a week from Mon Nov 2, due Mon Nov 9, so a day overdue. She
  // asked at 8 this morning for more time, and Ben is 1st in line since Sunday (C7, C13).
  joHasGullAndAnchor: {
    id: castId(306),
    copy: "yourGullAndAnchor",
    borrower: "jo",
    status: "out",
    askedAt: "2026-10-31T16:00:00-04:00",
    answeredAt: "2026-11-01T10:00:00-05:00",
    pickedUpOn: "2026-11-02",
    periodDays: 7,
    moreTime: {
      dueOn: "2026-11-13",
      note: "Out of town until Thursday.",
      askedAt: "2026-11-10T08:00:00-05:00",
    },
  },
  benAskedForGullAndAnchor: {
    id: castId(307),
    copy: "yourGullAndAnchor",
    borrower: "ben",
    status: "requested",
    askedAt: "2026-11-08T15:00:00-05:00",
  },
  // You asked for Sam's Quarry Lane this morning, and he hasn't answered (C4, E3).
  youAskedForQuarryLane: {
    id: castId(308),
    copy: "samsQuarryLane",
    borrower: "you",
    status: "requested",
    askedAt: "2026-11-10T07:40:00-05:00",
  },
  // Priya's Fenwick Fair is out to Ben for a month, until Nov 24, and you're 1st in line (C4).
  benHasFenwickFair: {
    id: castId(309),
    copy: "priyasFenwickFair",
    borrower: "ben",
    status: "out",
    askedAt: "2026-10-23T19:00:00-04:00",
    answeredAt: "2026-10-24T09:00:00-04:00",
    pickedUpOn: "2026-10-25",
    periodDays: 30,
  },
  youAskedForFenwickFair: {
    id: castId(310),
    copy: "priyasFenwickFair",
    borrower: "you",
    status: "requested",
    askedAt: "2026-10-30T12:00:00-04:00",
  },
  // Your Gull & Anchor's history (B7): Priya Sep 12 to Sep 26, Sam Aug 1 to Aug 15.
  priyaHadGullAndAnchor: {
    id: castId(311),
    copy: "yourGullAndAnchor",
    borrower: "priya",
    status: "returned",
    askedAt: "2026-09-10T18:00:00-04:00",
    answeredAt: "2026-09-11T08:00:00-04:00",
    pickedUpOn: "2026-09-12",
    periodDays: 14,
    returnedOn: "2026-09-26",
  },
  samHadGullAndAnchor: {
    id: castId(312),
    copy: "yourGullAndAnchor",
    borrower: "sam",
    status: "returned",
    askedAt: "2026-07-30T18:00:00-04:00",
    answeredAt: "2026-07-31T08:00:00-04:00",
    pickedUpOn: "2026-08-01",
    periodDays: 14,
    returnedOn: "2026-08-15",
  },
  // Your past loans (C12): Harbor Lights from Sam, given back on time (F1), Tin Kettle Derby
  // from Alice, and Fenwick Fair from Priya, to a date she picked, Aug 27, and 3 days late.
  youHadHarborLights: {
    id: castId(313),
    copy: "samsHarborLights",
    borrower: "you",
    status: "returned",
    askedAt: "2026-10-12T19:00:00-04:00",
    answeredAt: "2026-10-13T08:00:00-04:00",
    pickedUpOn: "2026-10-14",
    periodDays: 14,
    returnedOn: "2026-10-28",
  },
  youHadTinKettleDerby: {
    id: castId(314),
    copy: "alicesTinKettleDerby",
    borrower: "you",
    status: "returned",
    askedAt: "2026-09-03T18:00:00-04:00",
    answeredAt: "2026-09-04T08:00:00-04:00",
    pickedUpOn: "2026-09-05",
    periodDays: 7,
    returnedOn: "2026-09-12",
  },
  youHadFenwickFair: {
    id: castId(315),
    copy: "priyasFenwickFair",
    borrower: "you",
    status: "returned",
    askedAt: "2026-07-31T18:00:00-04:00",
    answeredAt: "2026-08-01T08:00:00-04:00",
    pickedUpOn: "2026-08-02",
    periodDays: 25,
    returnedOn: "2026-08-30",
  },
} satisfies Record<string, CastLoan>;

// What tests name: a person, game, copy or loan by its key (CAST.copies.yourGullAndAnchor.id).
export const CAST = {
  people: PEOPLE,
  games: { ...GAMES, ...EXPANSIONS },
  copies: COPIES,
  loans: LOANS,
};

// When the games came into the catalog.
const CATALOGUED = "2026-07-01T12:00:00-04:00";

function gameRow(game: CastGame, baseGameId: string | null): Game {
  return {
    id: game.id,
    type: baseGameId ? "expansion" : "base-game",
    baseGameId,
    title: game.title,
    searchTitle: toSearchTitle(game.title),
    year: game.year ?? null,
    publishers: game.publishers ?? null,
    designers: game.designers ?? null,
    minPlayers: game.minPlayers ?? null,
    maxPlayers: game.maxPlayers ?? null,
    bestPlayers: game.bestPlayers ?? null,
    minMinutes: game.minMinutes ?? null,
    maxMinutes: game.maxMinutes ?? null,
    minAge: game.minAge ?? null,
    complexity: game.complexity ?? null,
    categories: game.categories ?? null,
    description: game.description ?? null,
    imageUrl: null,
    videoUrl: game.videoUrl ?? null,
    popularity: null,
    createdAt: new Date(CATALOGUED),
    updatedAt: new Date(CATALOGUED),
  };
}

const latest = (...times: (string | undefined)[]): Date =>
  new Date(
    Math.max(
      ...times.flatMap((time) => (time ? [new Date(time).getTime()] : [])),
    ),
  );

function loanRow(loan: CastLoan, borrowerUserId: string): Loan {
  return {
    id: loan.id,
    userGameId: COPIES[loan.copy].id,
    borrowerUserId,
    previousLoanId: null,
    status: loan.status,
    requestNote: loan.requestNote ?? null,
    periodDays: loan.periodDays ?? null,
    dueOn:
      loan.pickedUpOn && loan.periodDays
        ? dueOn(loan.pickedUpOn, loan.periodDays)
        : null,
    pickedUpOn: loan.pickedUpOn ?? null,
    returnedOn: loan.returnedOn ?? null,
    moreTimeDueOn: loan.moreTime?.dueOn ?? null,
    moreTimeNote: loan.moreTime?.note ?? null,
    moreTimeAskedAt: loan.moreTime ? new Date(loan.moreTime.askedAt) : null,
    calledBackAt: null,
    answeredAt: loan.answeredAt ? new Date(loan.answeredAt) : null,
    createdAt: new Date(loan.askedAt),
    updatedAt: latest(loan.askedAt, loan.answeredAt, loan.moreTime?.askedAt),
  };
}

// The cast's rows, each member as the account given for them, or as the cast's own id.
export function castRows(accounts: Partial<Record<CastName, string>> = {}) {
  const userIds = Object.fromEntries(
    CAST_NAMES.map((name) => [name, accounts[name] ?? PEOPLE[name].id]),
  ) as Record<CastName, string>;
  const copies = Object.values<CastCopy>(COPIES);
  return {
    userIds,
    profiles: CAST_NAMES.map(
      (name): NewUserProfile => ({
        userId: userIds[name],
        name: PEOPLE[name].name,
        pieceShape: PEOPLE[name].pieceShape,
        pieceColor: PEOPLE[name].pieceColor,
        phone: PEOPLE[name].phone ?? null,
      }),
    ),
    settings: CAST_NAMES.map(
      (name): NewUserSettings => ({
        userId: userIds[name],
        defaultPassAlong: PEOPLE[name].defaultPassAlong ?? false,
      }),
    ),
    friendships: FRIENDSHIPS.map(([one, other]): [string, string] => [
      userIds[one],
      userIds[other],
    ]),
    // Base games before their expansions.
    games: [
      ...Object.values<CastGame>(GAMES).map((game) => gameRow(game, null)),
      ...Object.values<CastGame & { baseGame: GameKey }>(EXPANSIONS).map(
        (expansion) => gameRow(expansion, GAMES[expansion.baseGame].id),
      ),
    ],
    copies: copies.map(
      (copy): UserGame => ({
        id: copy.id,
        userId: userIds[copy.owner],
        gameId: GAMES[copy.game].id,
        condition: copy.condition ?? "good",
        conditionNote: copy.conditionNote ?? null,
        lendable: copy.lendable ?? true,
        passAlong: PEOPLE[copy.owner].defaultPassAlong ?? false,
        createdAt: new Date(copy.addedAt),
        updatedAt: new Date(copy.addedAt),
      }),
    ),
    expansions: copies.flatMap((copy) =>
      (copy.expansions ?? []).map(
        (key): UserGameExpansion => ({
          userGameId: copy.id,
          gameId: EXPANSIONS[key].id,
        }),
      ),
    ),
    loans: Object.values<CastLoan>(LOANS).map((loan) =>
      loanRow(loan, userIds[loan.borrower]),
    ),
  };
}
type CastRows = ReturnType<typeof castRows>;

// How many of a kind of row the cast has, and how many of them a database already holds.
export type CastTally = { what: string; toWrite: number; there: number };

async function tally<T>(
  what: string,
  rows: readonly T[],
  isThere: (row: T) => boolean | Promise<boolean>,
  write: (missing: T[]) => Promise<unknown>,
  commit: boolean,
): Promise<CastTally> {
  const missing: T[] = [];
  for (const row of rows) {
    if (!(await isThere(row))) {
      missing.push(row);
    }
  }
  if (commit && missing.length > 0) {
    await write(missing);
  }
  return {
    what,
    toWrite: missing.length,
    there: rows.length - missing.length,
  };
}

async function eachInTurn<T>(
  rows: readonly T[],
  write: (row: T) => Promise<unknown>,
): Promise<void> {
  for (const row of rows) {
    await write(row);
  }
}

type PeopleRepositories = {
  userProfiles: IUserProfilesRepository;
  userSettings: IUserSettingsRepository;
  friendships: IFriendshipsRepository;
};

// The cast's people through the repositories that write them, on either backend: each member's
// profile and settings, and each friendship. What's there already stays as it is. With
// `commit: false` it only counts.
export async function writeCastPeople(
  rows: CastRows,
  repositories: PeopleRepositories,
  tx: ITransaction,
  { commit }: { commit: boolean },
): Promise<CastTally[]> {
  const { userProfiles, userSettings, friendships } = repositories;
  return [
    await tally(
      "Profiles",
      rows.profiles,
      async ({ userId }) =>
        (await userProfiles.getByUserId(userId, tx)) !== undefined,
      (missing) => eachInTurn(missing, (row) => userProfiles.create(row, tx)),
      commit,
    ),
    await tally(
      "Settings",
      rows.settings,
      async ({ userId }) =>
        (await userSettings.getByUserId(userId, tx)) !== undefined,
      (missing) => eachInTurn(missing, (row) => userSettings.create(row, tx)),
      commit,
    ),
    await tally(
      "Friendships",
      rows.friendships,
      ([one, other]) => friendships.areFriends(one, other, tx),
      (missing) =>
        eachInTurn(missing, ([one, other]) => friendships.add(one, other, tx)),
      commit,
    ),
  ];
}

// The cast's rows in the tables no repository writes yet, straight through drizzle in the caller's
// transaction: the games, the copies, the expansions in their boxes and the loans. Only the real
// database takes them; the mocks get what their reads need from makeCast.
export async function insertCastRows(
  rows: CastRows,
  tx: ITransaction,
  { commit }: { commit: boolean },
): Promise<CastTally[]> {
  const db = unwrapDrizzleTx(tx);
  const idsIn = async (
    found: Promise<{ id: string }[]>,
  ): Promise<Set<string>> => new Set((await found).map(({ id }) => id));

  const gamesThere = await idsIn(
    db
      .select({ id: games.id })
      .from(games)
      .where(
        inArray(
          games.id,
          rows.games.map(({ id }) => id),
        ),
      ),
  );
  const copyIds = rows.copies.map(({ id }) => id);
  const copiesThere = await idsIn(
    db
      .select({ id: userGames.id })
      .from(userGames)
      .where(inArray(userGames.id, copyIds)),
  );
  const expansionsThere = new Set(
    (
      await db
        .select()
        .from(userGameExpansions)
        .where(inArray(userGameExpansions.userGameId, copyIds))
    ).map(({ userGameId, gameId }) => `${userGameId} ${gameId}`),
  );
  const loansThere = await idsIn(
    db
      .select({ id: loans.id })
      .from(loans)
      .where(
        inArray(
          loans.id,
          rows.loans.map(({ id }) => id),
        ),
      ),
  );

  return [
    await tally(
      "Games",
      rows.games,
      ({ id }) => gamesThere.has(id),
      (missing) => db.insert(games).values(missing).onConflictDoNothing(),
      commit,
    ),
    await tally(
      "Copies",
      rows.copies,
      ({ id }) => copiesThere.has(id),
      (missing) => db.insert(userGames).values(missing).onConflictDoNothing(),
      commit,
    ),
    await tally(
      "Expansions in boxes",
      rows.expansions,
      ({ userGameId, gameId }) =>
        expansionsThere.has(`${userGameId} ${gameId}`),
      (missing) =>
        db.insert(userGameExpansions).values(missing).onConflictDoNothing(),
      commit,
    ),
    await tally(
      "Loans",
      rows.loans,
      ({ id }) => loansThere.has(id),
      (missing) => db.insert(loans).values(missing).onConflictDoNothing(),
      commit,
    ),
  ];
}
