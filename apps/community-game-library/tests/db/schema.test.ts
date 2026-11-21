import { beforeEach, describe, expect, it } from "bun:test";
import { eq, getTableColumns } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import type { ZodObject } from "zod";
import {
  friendLinks,
  friendRequests,
  friendships,
  gameNightAttendees,
  gameNightGames,
  gameNights,
  gameNightVotes,
  gameSuggestions,
  games,
  loans,
  notices,
  removedUsers,
  userGameExpansions,
  userGames,
  userProfiles,
  userSettings,
} from "@/db/schema";
import { LOAN_STATUSES, PICKED_UP_STATUSES } from "@/src/entities/loan";
import {
  type FriendLink,
  friendLinkSchema,
} from "@/src/entities/models/friend-link.model";
import {
  FRIEND_REQUEST_STATUSES,
  type FriendRequest,
  friendRequestSchema,
} from "@/src/entities/models/friend-request.model";
import {
  type Friendship,
  friendshipSchema,
} from "@/src/entities/models/friendship.model";
import {
  GAME_COMPLEXITIES,
  GAME_TYPES,
  type Game,
  gameSchema,
} from "@/src/entities/models/game.model";
import {
  GAME_NIGHT_AUDIENCES,
  type GameNight,
  gameNightSchema,
} from "@/src/entities/models/game-night.model";
import {
  GAME_NIGHT_ATTENDEE_STATUSES,
  type GameNightAttendee,
  gameNightAttendeeSchema,
} from "@/src/entities/models/game-night-attendee.model";
import {
  type GameNightGame,
  gameNightGameSchema,
} from "@/src/entities/models/game-night-game.model";
import {
  type GameNightVote,
  gameNightVoteSchema,
} from "@/src/entities/models/game-night-vote.model";
import {
  GAME_SUGGESTION_STATUSES,
  type GameSuggestion,
  gameSuggestionSchema,
} from "@/src/entities/models/game-suggestion.model";
import { type Loan, loanSchema } from "@/src/entities/models/loan.model";
import { type Notice, noticeSchema } from "@/src/entities/models/notice.model";
import {
  type RemovedUser,
  removedUserSchema,
} from "@/src/entities/models/removed-user.model";
import {
  USER_GAME_CONDITIONS,
  type UserGame,
  userGameSchema,
} from "@/src/entities/models/user-game.model";
import {
  type UserGameExpansion,
  userGameExpansionSchema,
} from "@/src/entities/models/user-game-expansion.model";
import {
  type UserProfile,
  userProfileSchema,
} from "@/src/entities/models/user-profile.model";
import {
  type UserSettings,
  userSettingsSchema,
} from "@/src/entities/models/user-settings.model";
import { NOTICE_GROUPS, NOTICE_TYPES } from "@/src/entities/notice-types";
import { PIECE_COLORS, PIECE_SHAPES } from "@/src/entities/piece";
import { resetDatabase, sql, testDb } from "@/tests/_support/database";

// What the tables refuse on their own, whatever path a row comes by (docs/data-model.md, KTD22):
// on PGlite, with the real migration.

// The canvas's cast (KTD13).
const SAM = "00000000-0000-4000-8000-000000000001";
const BEN = "00000000-0000-4000-8000-000000000002";
const JO = "00000000-0000-4000-8000-000000000003";
const PRIYA = "00000000-0000-4000-8000-000000000004";

type Row = Record<string, unknown>;

// Inserts one row and returns it.
async function insert(table: string, values: Row): Promise<Row> {
  const names = Object.keys(values);
  const [row] = await sql<Row>(
    `insert into ${table} (${names.join(", ")}) values (${names.map((_, index) => `$${index + 1}`).join(", ")}) returning *`,
    Object.values(values),
  );
  if (!row) {
    throw new Error(`Nothing was inserted into ${table}`);
  }
  return row;
}

// What Postgres says when a row breaks a constraint: its code and the constraint's name.
const CHECK = "23514";
const UNIQUE = "23505";
const refusedBy = (code: string, constraint: string) => ({ code, constraint });

const count = async (table: string) =>
  (await sql<{ rows: number }>(`select count(*)::int as rows from ${table}`))[0]
    ?.rows;

const aGame = (values: Row = {}) =>
  insert("games", {
    title: "Harbor Lights",
    search_title: "harbor lights",
    ...values,
  });

async function aCopy(values: Row = {}): Promise<Row> {
  const game = await aGame();
  return insert("user_games", { user_id: SAM, game_id: game.id, ...values });
}

// A loan of a copy, with the pick-up day and the due date a loan from 'out' on carries.
const aLoan = (copy: Row, values: Row = {}) =>
  insert("loans", {
    user_game_id: copy.id,
    borrower_user_id: BEN,
    status: "out",
    period_days: 7,
    picked_up_on: "2026-11-06",
    due_on: "2026-11-13",
    ...values,
  });

const aNight = (values: Row = {}) =>
  insert("game_nights", {
    created_by: SAM,
    title: "Saturday game night",
    starts_at: "2026-11-14T19:00:00-05:00",
    place: "Sam's",
    capacity: 6,
    ...values,
  });

describe("the tables [postgres]", () => {
  beforeEach(resetDatabase);

  describe("hold each fixed set of values to its list", () => {
    // Each column, with a row that holds a given value there.
    const unions: [
      string,
      string,
      readonly string[],
      (value: string) => Promise<Row>,
    ][] = [
      [
        "games",
        "type",
        GAME_TYPES,
        async (type) =>
          type === "expansion"
            ? aGame({ type, base_game_id: (await aGame()).id })
            : aGame({ type }),
      ],
      [
        "games",
        "complexity",
        GAME_COMPLEXITIES,
        (complexity) => aGame({ complexity }),
      ],
      [
        "user_games",
        "condition",
        USER_GAME_CONDITIONS,
        (condition) => aCopy({ condition }),
      ],
      [
        "game_suggestions",
        "status",
        GAME_SUGGESTION_STATUSES,
        (status) =>
          insert("game_suggestions", {
            created_by: BEN,
            title: "Fog Lantern",
            status,
          }),
      ],
      [
        "user_profiles",
        "piece_shape",
        PIECE_SHAPES,
        (piece_shape) =>
          insert("user_profiles", {
            user_id: crypto.randomUUID(),
            name: "Priya",
            piece_shape,
            piece_color: "moss",
          }),
      ],
      [
        "user_profiles",
        "piece_color",
        PIECE_COLORS,
        (piece_color) =>
          insert("user_profiles", {
            user_id: crypto.randomUUID(),
            name: "Priya",
            piece_shape: "cone",
            piece_color,
          }),
      ],
      [
        "user_settings",
        "notices_off",
        NOTICE_GROUPS,
        (group) =>
          insert("user_settings", {
            user_id: crypto.randomUUID(),
            notices_off: [group],
          }),
      ],
      [
        "friend_requests",
        "status",
        FRIEND_REQUEST_STATUSES,
        (status) =>
          insert("friend_requests", {
            created_by: crypto.randomUUID(),
            recipient_user_id: SAM,
            status,
          }),
      ],
      // A copy each, since a copy has one holder, one yes and one open loan per borrower.
      [
        "loans",
        "status",
        LOAN_STATUSES,
        async (status) => aLoan(await aCopy(), { status }),
      ],
      [
        "game_nights",
        "audience",
        GAME_NIGHT_AUDIENCES,
        (audience) => aNight({ audience }),
      ],
      [
        "game_night_attendees",
        "status",
        GAME_NIGHT_ATTENDEE_STATUSES,
        async (status) =>
          insert("game_night_attendees", {
            game_night_id: (await aNight()).id,
            user_id: JO,
            status,
          }),
      ],
      [
        "notices",
        "type",
        NOTICE_TYPES,
        (type) => insert("notices", { user_id: BEN, type }),
      ],
    ];

    for (const [table, column, values, row] of unions) {
      it(`keeps ${table}.${column} to its ${values.length} values`, async () => {
        for (const value of values) {
          await row(value);
        }
        await expect(row("not-a-value")).rejects.toMatchObject(
          refusedBy(CHECK, `${table}_${column}_check`),
        );
      });
    }
  });

  it("sets a base game only on an expansion, and always on one", async () => {
    const base = await aGame();
    await aGame({
      type: "expansion",
      base_game_id: base.id,
      title: "Night Tide",
    });
    await expect(aGame({ type: "expansion" })).rejects.toMatchObject(
      refusedBy(CHECK, "games_base_game_check"),
    );
    await expect(aGame({ base_game_id: base.id })).rejects.toMatchObject(
      refusedBy(CHECK, "games_base_game_check"),
    );
  });

  it("keeps a friendship between two people, once each way", async () => {
    await insert("friendships", { user_id: SAM, friend_user_id: BEN });
    await insert("friendships", { user_id: BEN, friend_user_id: SAM });
    await expect(
      insert("friendships", { user_id: SAM, friend_user_id: SAM }),
    ).rejects.toMatchObject(refusedBy(CHECK, "friendships_two_people_check"));
    await expect(
      insert("friendships", { user_id: SAM, friend_user_id: BEN }),
    ).rejects.toMatchObject({ code: UNIQUE });
  });

  it("keeps a night's capacity above zero and its end after its start", async () => {
    await aNight({ ends_at: "2026-11-14T23:00:00-05:00" });
    await expect(aNight({ capacity: 0 })).rejects.toMatchObject(
      refusedBy(CHECK, "game_nights_capacity_check"),
    );
    await expect(
      aNight({ ends_at: "2026-11-14T19:00:00-05:00" }),
    ).rejects.toMatchObject(
      refusedBy(CHECK, "game_nights_ends_after_start_check"),
    );
    await expect(
      aNight({ ends_at: "2026-11-14T18:00:00-05:00" }),
    ).rejects.toMatchObject(
      refusedBy(CHECK, "game_nights_ends_after_start_check"),
    );
  });

  it("keeps a member's guests at zero or more", async () => {
    const night = await aNight();
    await insert("game_night_attendees", {
      game_night_id: night.id,
      user_id: JO,
      status: "going",
    });
    await expect(
      insert("game_night_attendees", {
        game_night_id: night.id,
        user_id: PRIYA,
        status: "going",
        guest_count: -1,
      }),
    ).rejects.toMatchObject(
      refusedBy(CHECK, "game_night_attendees_guest_count_check"),
    );
  });

  it("dates every loan from its pick-up on, and none before", async () => {
    for (const status of PICKED_UP_STATUSES) {
      for (const missing of ["picked_up_on", "due_on"]) {
        await expect(
          aLoan(await aCopy(), { status, [missing]: null }),
        ).rejects.toMatchObject(refusedBy(CHECK, "loans_picked_up_check"));
      }
    }
    for (const status of [
      "requested",
      "accepted",
      "declined",
      "withdrawn",
      "cancelled",
    ]) {
      await aLoan(await aCopy(), { status, picked_up_on: null, due_on: null });
    }
  });

  describe("a copy's loans", () => {
    it("let one loan have the copy at a time", async () => {
      const copy = await aCopy();
      const ben = await aLoan(copy);
      for (const status of ["out", "returning", "passing"]) {
        await expect(
          aLoan(copy, { borrower_user_id: JO, status }),
        ).rejects.toMatchObject(refusedBy(UNIQUE, "loans_one_holder_idx"));
      }
      // Once Ben's loan has ended, Jo's can start.
      await sql("update loans set status = 'returned' where id = $1", [ben.id]);
      await aLoan(copy, { borrower_user_id: JO });
    });

    it("let one wait for its pick-up, beside a loan that's being handed on", async () => {
      const copy = await aCopy();
      const ben = await aLoan(copy, { status: "passing" });
      await aLoan(copy, {
        borrower_user_id: JO,
        status: "accepted",
        previous_loan_id: ben.id,
        picked_up_on: null,
        due_on: null,
      });
      await expect(
        aLoan(copy, {
          borrower_user_id: PRIYA,
          status: "accepted",
          picked_up_on: null,
          due_on: null,
        }),
      ).rejects.toMatchObject(refusedBy(UNIQUE, "loans_one_promised_idx"));
    });

    it("let a borrower have one open loan per copy, and a line of others", async () => {
      const copy = await aCopy();
      const asked = (borrower: string) =>
        aLoan(copy, {
          borrower_user_id: borrower,
          status: "requested",
          picked_up_on: null,
          due_on: null,
        });
      await aLoan(copy);
      await expect(asked(BEN)).rejects.toMatchObject(
        refusedBy(UNIQUE, "loans_one_open_per_borrower_idx"),
      );
      await asked(JO);
      await asked(PRIYA);
      await expect(asked(JO)).rejects.toMatchObject(
        refusedBy(UNIQUE, "loans_one_open_per_borrower_idx"),
      );
      // Another copy is another line.
      await aLoan(await aCopy(), {
        status: "requested",
        picked_up_on: null,
        due_on: null,
      });
    });
  });

  it("deletes with a copy what goes with it: its expansions, loans, their notices and its place on a night's table", async () => {
    const copy = await aCopy();
    const expansion = await aGame({
      type: "expansion",
      base_game_id: copy.game_id,
      title: "Night Tide",
    });
    await insert("user_game_expansions", {
      user_game_id: copy.id,
      game_id: expansion.id,
    });
    // A pass-along's chain, and a request in line.
    const alice = await aLoan(copy, {
      borrower_user_id: PRIYA,
      status: "passed-along",
    });
    const ben = await aLoan(copy, { previous_loan_id: alice.id });
    const jo = await aLoan(copy, {
      borrower_user_id: JO,
      status: "requested",
      picked_up_on: null,
      due_on: null,
    });
    for (const loan of [alice, ben, jo]) {
      await insert("notices", {
        user_id: SAM,
        type: "loan-requested",
        loan_id: loan.id,
      });
    }
    const night = await aNight();
    await insert("game_night_games", {
      game_night_id: night.id,
      user_game_id: copy.id,
    });
    await insert("game_night_votes", {
      game_night_id: night.id,
      user_game_id: copy.id,
      user_id: JO,
    });
    // Another copy of Sam's, whose loan stays.
    const other = await aCopy();
    const kept = await aLoan(other, { borrower_user_id: JO });
    await insert("notices", {
      user_id: JO,
      type: "loan-recorded",
      loan_id: kept.id,
    });

    await sql("delete from user_games where id = $1", [copy.id]);

    expect(await count("user_game_expansions")).toBe(0);
    expect(await sql("select id from loans")).toEqual([{ id: kept.id }]);
    expect(await sql("select loan_id from notices")).toEqual([
      { loan_id: kept.id },
    ]);
    expect(await count("game_night_games")).toBe(0);
    expect(await count("game_night_votes")).toBe(0);
    // The night, the game and the expansion stay.
    expect(await count("game_nights")).toBe(1);
    expect(await count("games")).toBe(3);
  });

  it("deletes a notice with the night, the suggestion or the friend request it points at", async () => {
    const night = await aNight();
    const suggestion = await insert("game_suggestions", {
      created_by: BEN,
      title: "Fog Lantern",
    });
    const request = await insert("friend_requests", {
      created_by: BEN,
      recipient_user_id: SAM,
    });
    await insert("notices", {
      user_id: JO,
      type: "night-invite",
      game_night_id: night.id,
    });
    await insert("notices", {
      user_id: SAM,
      type: "suggestion-arrived",
      game_suggestion_id: suggestion.id,
    });
    await insert("notices", {
      user_id: SAM,
      type: "friend-request",
      friend_request_id: request.id,
    });

    await sql("delete from game_nights");
    await sql("delete from game_suggestions");
    // Accepting a friend request deletes it (data-model.md, friend_requests).
    await sql("delete from friend_requests");

    expect(await count("notices")).toBe(0);
  });

  describe("reminders", () => {
    const reminder = (values: Row) =>
      insert("notices", { user_id: BEN, reminded_on: "2026-11-11", ...values });

    it("write each reminder once a day, for a loan or for a night", async () => {
      const loan = await aLoan(await aCopy());
      const night = await aNight();
      await reminder({ type: "due-soon", loan_id: loan.id });
      await expect(
        reminder({ type: "due-soon", loan_id: loan.id }),
      ).rejects.toMatchObject(
        refusedBy(UNIQUE, "notices_one_reminder_a_day_idx"),
      );
      await reminder({ type: "night-today", game_night_id: night.id });
      await expect(
        reminder({ type: "night-today", game_night_id: night.id }),
      ).rejects.toMatchObject(
        refusedBy(UNIQUE, "notices_one_reminder_a_day_idx"),
      );

      // Another day, another person, another type or another loan is another reminder.
      await reminder({
        type: "due-soon",
        loan_id: loan.id,
        reminded_on: "2026-11-12",
      });
      await reminder({ type: "due-soon", loan_id: loan.id, user_id: SAM });
      await reminder({ type: "due-today", loan_id: loan.id });
      await reminder({
        type: "due-soon",
        loan_id: (await aLoan(await aCopy())).id,
      });
      expect(await count("notices")).toBe(6);
    });

    it("let the daily run's second insert of a day add nothing (KTD8)", async () => {
      const loan = await aLoan(await aCopy());
      for (let run = 0; run < 2; run += 1) {
        await sql(
          "insert into notices (user_id, type, loan_id, reminded_on) values ($1, 'overdue', $2, '2026-11-14') on conflict do nothing",
          [BEN, loan.id],
        );
      }
      expect(await count("notices")).toBe(1);
    });

    it("leave a notice that isn't a reminder to repeat", async () => {
      const loan = await aLoan(await aCopy());
      await insert("notices", {
        user_id: SAM,
        type: "more-time-asked",
        loan_id: loan.id,
      });
      await insert("notices", {
        user_id: SAM,
        type: "more-time-asked",
        loan_id: loan.id,
      });
      expect(await count("notices")).toBe(2);
    });
  });

  it("keeps each link's token to one friend or one night", async () => {
    await insert("friend_links", {
      user_id: SAM,
      token: "K7Q2-HARB",
      expires_at: "2026-11-28T12:00:00Z",
    });
    await expect(
      insert("friend_links", {
        user_id: BEN,
        token: "K7Q2-HARB",
        expires_at: "2026-11-28T12:00:00Z",
      }),
    ).rejects.toMatchObject(refusedBy(UNIQUE, "friend_links_token_unique"));
    await aNight({ link_token: "7QK2-MARR" });
    await expect(aNight({ link_token: "7QK2-MARR" })).rejects.toMatchObject(
      refusedBy(UNIQUE, "game_nights_link_token_unique"),
    );
    // Nights without a link are many.
    await aNight();
    await aNight();
  });

  it("keeps one friend request per pair of people, either way round", async () => {
    await insert("friend_requests", {
      created_by: SAM,
      recipient_user_id: BEN,
    });
    await expect(
      insert("friend_requests", { created_by: BEN, recipient_user_id: SAM }),
    ).rejects.toMatchObject(
      refusedBy(UNIQUE, "friend_requests_one_per_pair_idx"),
    );
    await insert("friend_requests", { created_by: SAM, recipient_user_id: JO });
  });

  it("starts each row as data-model.md says", async () => {
    const copy = await aCopy();
    expect(copy).toMatchObject({
      condition: "good",
      lendable: true,
      pass_along: false,
    });
    expect(await aGame()).toMatchObject({ type: "base-game" });
    expect(
      await insert("loans", { user_game_id: copy.id, borrower_user_id: BEN }),
    ).toMatchObject({ status: "requested" });
    expect(
      await insert("game_suggestions", {
        created_by: BEN,
        title: "Fog Lantern",
      }),
    ).toMatchObject({ status: "waiting" });
    expect(
      await insert("friend_requests", {
        created_by: SAM,
        recipient_user_id: BEN,
      }),
    ).toMatchObject({ status: "waiting" });
    const night = await aNight();
    expect(night).toMatchObject({
      audience: "friends",
      attendees_can_invite: false,
      guests_allowed: false,
    });
    expect(
      await insert("game_night_attendees", {
        game_night_id: night.id,
        user_id: SAM,
        status: "going",
      }),
    ).toMatchObject({ guest_count: 0 });
    // Every notice group on but the morning of a night (E7).
    expect(await insert("user_settings", { user_id: SAM })).toMatchObject({
      default_pass_along: false,
      notices_off: ["night-mornings"],
    });
  });

  it("moves updated_at on every update drizzle writes", async () => {
    const game = await aGame();
    await Bun.sleep(5);
    const [updated] = await testDb
      .update(games)
      .set({ title: "Harbor Lights: Night Tide" })
      .where(eq(games.id, String(game.id)))
      .returning();
    expect(updated?.updatedAt.getTime()).toBeGreaterThan(
      (game.updated_at as Date).getTime(),
    );
  });

  it("matches titles by trigram, from pg_trgm (KTD10)", async () => {
    const [index] = await sql<{ definition: string }>(
      "select indexdef as definition from pg_indexes where indexname = 'games_search_title_idx'",
    );
    expect(index?.definition).toContain("gin (search_title gin_trgm_ops)");
    const [match] = await sql<{ close: boolean }>(
      "select word_similarity('ticket ride', 'ticket to ride') > 0.5 as close",
    );
    expect(match?.close).toBe(true);
  });
});

// Each model's type is its table's row, column for column: a difference fails bun ts.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
const typesMatch: [
  Same<Game, typeof games.$inferSelect>,
  Same<UserGame, typeof userGames.$inferSelect>,
  Same<UserGameExpansion, typeof userGameExpansions.$inferSelect>,
  Same<GameSuggestion, typeof gameSuggestions.$inferSelect>,
  Same<UserProfile, typeof userProfiles.$inferSelect>,
  Same<UserSettings, typeof userSettings.$inferSelect>,
  Same<RemovedUser, typeof removedUsers.$inferSelect>,
  Same<Friendship, typeof friendships.$inferSelect>,
  Same<FriendRequest, typeof friendRequests.$inferSelect>,
  Same<FriendLink, typeof friendLinks.$inferSelect>,
  Same<Loan, typeof loans.$inferSelect>,
  Same<GameNight, typeof gameNights.$inferSelect>,
  Same<GameNightAttendee, typeof gameNightAttendees.$inferSelect>,
  Same<GameNightGame, typeof gameNightGames.$inferSelect>,
  Same<GameNightVote, typeof gameNightVotes.$inferSelect>,
  Same<Notice, typeof notices.$inferSelect>,
] = [
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
  true,
];

describe("the models [postgres]", () => {
  beforeEach(resetDatabase);

  it("type every table's rows", () => {
    expect(typesMatch.every(Boolean)).toBe(true);
  });

  // One row in each table with every column filled, as drizzle reads it back.
  async function everyColumnFilled() {
    const base = await aGame({
      year: 2019,
      publishers: ["Tidewater Games"],
      designers: ["Ines Varga"],
      min_players: 2,
      max_players: 5,
      best_players: [4],
      min_minutes: 45,
      max_minutes: 60,
      min_age: 10,
      complexity: "medium",
      categories: ["Family"],
      description: "Light a path home for the fishing fleet.",
      image_url: "https://catalog.example/harbor-lights.jpg",
      video_url: "https://video.example/harbor-lights",
      popularity: 900,
    });
    const expansion = await aGame({
      type: "expansion",
      base_game_id: base.id,
      title: "Night Tide",
    });
    const copy = await insert("user_games", {
      user_id: SAM,
      game_id: base.id,
      condition: "worn",
      condition_note: "One blue anchor token is missing.",
    });
    await insert("user_game_expansions", {
      user_game_id: copy.id,
      game_id: expansion.id,
    });
    const suggestion = await insert("game_suggestions", {
      created_by: BEN,
      title: "Fog Lantern",
      year: 2024,
      publisher: "Lantern Press",
      source_url: "https://publisher.example/fog-lantern",
      image_url: "https://catalog.example/fog-lantern.jpg",
      status: "added",
      decline_note: "Added by hand.",
      game_id: base.id,
      answered_at: "2026-11-09T12:00:00Z",
    });
    await insert("user_profiles", {
      user_id: SAM,
      name: "Sam",
      piece_shape: "house",
      piece_color: "ocean",
      phone: "555 0142",
      photo_key: "profile-photos/sam.jpg",
    });
    await insert("user_settings", { user_id: SAM, default_pass_along: true });
    await insert("removed_users", { user_id: PRIYA });
    await insert("friendships", { user_id: SAM, friend_user_id: BEN });
    const request = await insert("friend_requests", {
      created_by: JO,
      recipient_user_id: SAM,
    });
    await insert("friend_links", {
      user_id: SAM,
      token: "K7Q2-HARB",
      expires_at: "2026-11-28T12:00:00Z",
    });
    const before = await aLoan(copy, {
      borrower_user_id: JO,
      status: "returned",
      returned_on: "2026-11-01",
    });
    const loan = await aLoan(copy, {
      previous_loan_id: before.id,
      request_note: "Can I grab it Friday?",
      returned_on: "2026-11-12",
      more_time_due_on: "2026-11-20",
      more_time_note: "One more week?",
      more_time_asked_at: "2026-11-09T12:00:00Z",
      called_back_at: "2026-11-10T12:00:00Z",
      answered_at: "2026-11-05T12:00:00Z",
    });
    const night = await aNight({
      ends_at: "2026-11-14T23:00:00-05:00",
      address: "12 Harbor Row",
      host_note: "Bring snacks.",
      audience: "invited",
      attendees_can_invite: true,
      guests_allowed: true,
      link_token: "7QK2-MARR",
      cancelled_at: "2026-11-12T12:00:00Z",
    });
    await insert("game_night_attendees", {
      game_night_id: night.id,
      user_id: JO,
      status: "waitlisted",
      guest_count: 1,
      invited_by: SAM,
      waitlisted_at: "2026-11-10T12:00:00Z",
    });
    await insert("game_night_games", {
      game_night_id: night.id,
      user_game_id: copy.id,
    });
    await insert("game_night_votes", {
      game_night_id: night.id,
      user_game_id: copy.id,
      user_id: JO,
    });
    // A notice points at one thing; here it points at four, so every column has a value.
    await insert("notices", {
      user_id: BEN,
      type: "more-time-answered",
      created_by: SAM,
      loan_id: loan.id,
      game_night_id: night.id,
      game_suggestion_id: suggestion.id,
      friend_request_id: request.id,
      answer_note: "Sure, keep it.",
      reminded_on: "2026-11-11",
      read_at: "2026-11-11T12:00:00Z",
    });
  }

  const MODELS: [string, PgTable, ZodObject][] = [
    ["games", games, gameSchema],
    ["user_games", userGames, userGameSchema],
    ["user_game_expansions", userGameExpansions, userGameExpansionSchema],
    ["game_suggestions", gameSuggestions, gameSuggestionSchema],
    ["user_profiles", userProfiles, userProfileSchema],
    ["user_settings", userSettings, userSettingsSchema],
    ["removed_users", removedUsers, removedUserSchema],
    ["friendships", friendships, friendshipSchema],
    ["friend_requests", friendRequests, friendRequestSchema],
    ["friend_links", friendLinks, friendLinkSchema],
    ["loans", loans, loanSchema],
    ["game_nights", gameNights, gameNightSchema],
    ["game_night_attendees", gameNightAttendees, gameNightAttendeeSchema],
    ["game_night_games", gameNightGames, gameNightGameSchema],
    ["game_night_votes", gameNightVotes, gameNightVoteSchema],
    ["notices", notices, noticeSchema],
  ];

  it("have a model for every table, each with every column", async () => {
    const [tables] = await sql<{ names: string[] }>(
      "select array_agg(tablename::text order by tablename) as names from pg_tables where schemaname = 'public'",
    );
    expect(MODELS.map(([name]) => name).sort()).toEqual(tables?.names ?? []);
    for (const [, table, model] of MODELS) {
      expect(Object.keys(model.shape).sort()).toEqual(
        Object.keys(getTableColumns(table)).sort(),
      );
    }
  });

  it("read every row as drizzle returns it, filled or with only what's required", async () => {
    await everyColumnFilled();
    for (const [, table, model] of MODELS) {
      const rows = await testDb.select().from(table);
      expect(rows.length).toBeGreaterThan(0);
      for (const row of rows) {
        expect(model.parse(row)).toEqual(row);
      }
    }
  });
});
