import { type SQL, sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import {
  HOLDING_STATUSES,
  LOAN_STATUSES,
  OPEN_STATUSES,
  PICKED_UP_STATUSES,
} from "@/src/entities/loan";
import { FRIEND_REQUEST_STATUSES } from "@/src/entities/models/friend-request.model";
import {
  GAME_COMPLEXITIES,
  GAME_TYPES,
} from "@/src/entities/models/game.model";
import { GAME_NIGHT_AUDIENCES } from "@/src/entities/models/game-night.model";
import { GAME_NIGHT_ATTENDEE_STATUSES } from "@/src/entities/models/game-night-attendee.model";
import { GAME_SUGGESTION_STATUSES } from "@/src/entities/models/game-suggestion.model";
import { USER_GAME_CONDITIONS } from "@/src/entities/models/user-game.model";
import {
  DEFAULT_NOTICES_OFF,
  NOTICE_GROUPS,
  NOTICE_TYPES,
} from "@/src/entities/notice-types";
import { PIECE_COLORS, PIECE_SHAPES } from "@/src/entities/piece";

// Every table in docs/data-model.md, which says why each column and rule exists, in the app's
// first migration (KTD5). User ids are Neon Auth's uuids, with no foreign key into its managed
// schema, as in recipes. The app's AGENTS.md (Data Model) lists what every writer keeps true.

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// Set by the database (rule 2): now() when a row is made, and again on every update drizzle
// writes.
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => sql`now()`);

const at = (name: string) => timestamp(name, { withTimezone: true });

// A day with no time of day, "YYYY-MM-DD" in Eastern time (KTD9), read as text.
const day = (name: string) => date(name, { mode: "string" });

// The values as SQL string literals, for a check, a default or an index's condition. They come
// from the entities' own lists, never from input.
const literals = (values: readonly string[]): SQL =>
  sql.raw(values.map((value) => `'${value}'`).join(", "));

// A check that a column holds one of a fixed set of values (rule 7). Null passes, as Postgres
// checks do, so an optional column stays optional.
const oneOf = (column: AnyPgColumn, values: readonly string[]): SQL =>
  sql`${column} in (${literals(values)})`;

const textArray = (values: readonly string[]): SQL =>
  sql`array[${literals(values)}]::text[]`;

// The catalog

export const games = pgTable(
  "games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    type: text("type", { enum: GAME_TYPES }).notNull().default("base-game"),
    baseGameId: uuid("base_game_id").references((): AnyPgColumn => games.id),
    title: text("title").notNull(),
    searchTitle: text("search_title").notNull(),
    year: integer("year"),
    publishers: text("publishers").array(),
    designers: text("designers").array(),
    minPlayers: integer("min_players"),
    maxPlayers: integer("max_players"),
    bestPlayers: integer("best_players").array(),
    minMinutes: integer("min_minutes"),
    maxMinutes: integer("max_minutes"),
    minAge: integer("min_age"),
    complexity: text("complexity", { enum: GAME_COMPLEXITIES }),
    categories: text("categories").array(),
    description: text("description"),
    imageUrl: text("image_url"),
    imageCredit: text("image_credit"),
    imageSourceUrl: text("image_source_url"),
    videoUrl: text("video_url"),
    popularity: integer("popularity"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("games_type_check", oneOf(table.type, GAME_TYPES)),
    check("games_complexity_check", oneOf(table.complexity, GAME_COMPLEXITIES)),
    check(
      "games_base_game_check",
      sql`(${table.type} = 'expansion') = (${table.baseGameId} is not null)`,
    ),
    // Search's trigram match on the normalized title (KTD10).
    index("games_search_title_idx").using(
      "gin",
      table.searchTitle.op("gin_trgm_ops"),
    ),
  ],
);

export const userGames = pgTable(
  "user_games",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
    condition: text("condition", { enum: USER_GAME_CONDITIONS })
      .notNull()
      .default("good"),
    conditionNote: text("condition_note"),
    lendable: boolean("lendable").notNull().default(true),
    passAlong: boolean("pass_along").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "user_games_condition_check",
      oneOf(table.condition, USER_GAME_CONDITIONS),
    ),
    index("user_games_user_idx").on(table.userId),
    index("user_games_game_idx").on(table.gameId),
  ],
);

export const userGameExpansions = pgTable(
  "user_game_expansions",
  {
    userGameId: uuid("user_game_id")
      .notNull()
      .references(() => userGames.id, { onDelete: "cascade" }),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id),
  },
  (table) => [primaryKey({ columns: [table.userGameId, table.gameId] })],
);

export const gameSuggestions = pgTable(
  "game_suggestions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by").notNull(),
    title: text("title").notNull(),
    year: integer("year"),
    publisher: text("publisher"),
    sourceUrl: text("source_url"),
    imageUrl: text("image_url"),
    status: text("status", { enum: GAME_SUGGESTION_STATUSES })
      .notNull()
      .default("waiting"),
    declineNote: text("decline_note"),
    gameId: uuid("game_id").references(() => games.id),
    answeredAt: at("answered_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "game_suggestions_status_check",
      oneOf(table.status, GAME_SUGGESTION_STATUSES),
    ),
  ],
);

// Members

export const userProfiles = pgTable(
  "user_profiles",
  {
    userId: uuid("user_id").primaryKey(),
    name: text("name").notNull(),
    pieceShape: text("piece_shape", { enum: PIECE_SHAPES }).notNull(),
    pieceColor: text("piece_color", { enum: PIECE_COLORS }).notNull(),
    phone: text("phone"),
    photoKey: text("photo_key"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "user_profiles_piece_shape_check",
      oneOf(table.pieceShape, PIECE_SHAPES),
    ),
    check(
      "user_profiles_piece_color_check",
      oneOf(table.pieceColor, PIECE_COLORS),
    ),
  ],
);

export const userSettings = pgTable(
  "user_settings",
  {
    userId: uuid("user_id").primaryKey(),
    defaultPassAlong: boolean("default_pass_along").notNull().default(false),
    noticesOff: text("notices_off", { enum: NOTICE_GROUPS })
      .array()
      .notNull()
      .default(textArray(DEFAULT_NOTICES_OFF)),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "user_settings_notices_off_check",
      sql`${table.noticesOff} <@ ${textArray(NOTICE_GROUPS)}`,
    ),
  ],
);

export const removedUsers = pgTable("removed_users", {
  userId: uuid("user_id").primaryKey(),
  removedAt: at("removed_at").notNull().defaultNow(),
});

// Friends

export const friendships = pgTable(
  "friendships",
  {
    userId: uuid("user_id").notNull(),
    friendUserId: uuid("friend_user_id").notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.friendUserId] }),
    check(
      "friendships_two_people_check",
      sql`${table.userId} <> ${table.friendUserId}`,
    ),
  ],
);

export const friendRequests = pgTable(
  "friend_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by").notNull(),
    recipientUserId: uuid("recipient_user_id").notNull(),
    status: text("status", { enum: FRIEND_REQUEST_STATUSES })
      .notNull()
      .default("waiting"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "friend_requests_status_check",
      oneOf(table.status, FRIEND_REQUEST_STATUSES),
    ),
    // One request per pair of people, either way round.
    uniqueIndex("friend_requests_one_per_pair_idx").on(
      sql`least(${table.createdBy}, ${table.recipientUserId})`,
      sql`greatest(${table.createdBy}, ${table.recipientUserId})`,
    ),
  ],
);

export const friendLinks = pgTable("friend_links", {
  userId: uuid("user_id").primaryKey(),
  token: text("token").notNull().unique(),
  expiresAt: at("expires_at").notNull(),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

// Loans

export const loans = pgTable(
  "loans",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userGameId: uuid("user_game_id")
      .notNull()
      .references(() => userGames.id, { onDelete: "cascade" }),
    borrowerUserId: uuid("borrower_user_id").notNull(),
    // Kept when the loan before it goes: a loan's history is its own.
    previousLoanId: uuid("previous_loan_id").references(
      (): AnyPgColumn => loans.id,
      { onDelete: "set null" },
    ),
    status: text("status", { enum: LOAN_STATUSES })
      .notNull()
      .default("requested"),
    requestNote: text("request_note"),
    periodDays: integer("period_days"),
    dueOn: day("due_on"),
    pickedUpOn: day("picked_up_on"),
    returnedOn: day("returned_on"),
    moreTimeDueOn: day("more_time_due_on"),
    moreTimeNote: text("more_time_note"),
    moreTimeAskedAt: at("more_time_asked_at"),
    calledBackAt: at("called_back_at"),
    answeredAt: at("answered_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("loans_status_check", oneOf(table.status, LOAN_STATUSES)),
    check(
      "loans_picked_up_check",
      sql`${table.status} not in (${literals(PICKED_UP_STATUSES)}) or (${table.pickedUpOn} is not null and ${table.dueOn} is not null)`,
    ),
    index("loans_user_game_status_idx").on(table.userGameId, table.status),
    index("loans_borrower_status_idx").on(table.borrowerUserId, table.status),
    // At most one loan has a copy, one waits for its pick-up, and a borrower has one open loan
    // per copy.
    uniqueIndex("loans_one_holder_idx")
      .on(table.userGameId)
      .where(oneOf(table.status, HOLDING_STATUSES)),
    uniqueIndex("loans_one_promised_idx")
      .on(table.userGameId)
      .where(sql`${table.status} = 'accepted'`),
    uniqueIndex("loans_one_open_per_borrower_idx")
      .on(table.userGameId, table.borrowerUserId)
      .where(oneOf(table.status, OPEN_STATUSES)),
  ],
);

// Game nights

export const gameNights = pgTable(
  "game_nights",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    createdBy: uuid("created_by").notNull(),
    title: text("title").notNull(),
    startsAt: at("starts_at").notNull(),
    endsAt: at("ends_at"),
    place: text("place").notNull(),
    address: text("address"),
    hostNote: text("host_note"),
    capacity: integer("capacity").notNull(),
    audience: text("audience", { enum: GAME_NIGHT_AUDIENCES })
      .notNull()
      .default("friends"),
    attendeesCanInvite: boolean("attendees_can_invite")
      .notNull()
      .default(false),
    guestsAllowed: boolean("guests_allowed").notNull().default(false),
    linkToken: text("link_token").unique(),
    cancelledAt: at("cancelled_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check(
      "game_nights_audience_check",
      oneOf(table.audience, GAME_NIGHT_AUDIENCES),
    ),
    check("game_nights_capacity_check", sql`${table.capacity} > 0`),
    check(
      "game_nights_ends_after_start_check",
      sql`${table.endsAt} is null or ${table.endsAt} > ${table.startsAt}`,
    ),
    index("game_nights_starts_at_idx").on(table.startsAt),
  ],
);

export const gameNightAttendees = pgTable(
  "game_night_attendees",
  {
    gameNightId: uuid("game_night_id")
      .notNull()
      .references(() => gameNights.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull(),
    status: text("status", { enum: GAME_NIGHT_ATTENDEE_STATUSES }).notNull(),
    guestCount: integer("guest_count").notNull().default(0),
    invitedBy: uuid("invited_by"),
    waitlistedAt: at("waitlisted_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    primaryKey({ columns: [table.gameNightId, table.userId] }),
    check(
      "game_night_attendees_status_check",
      oneOf(table.status, GAME_NIGHT_ATTENDEE_STATUSES),
    ),
    check(
      "game_night_attendees_guest_count_check",
      sql`${table.guestCount} >= 0`,
    ),
    index("game_night_attendees_user_idx").on(table.userId),
  ],
);

export const gameNightGames = pgTable(
  "game_night_games",
  {
    gameNightId: uuid("game_night_id")
      .notNull()
      .references(() => gameNights.id, { onDelete: "cascade" }),
    userGameId: uuid("user_game_id")
      .notNull()
      .references(() => userGames.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (table) => [primaryKey({ columns: [table.gameNightId, table.userGameId] })],
);

export const gameNightVotes = pgTable(
  "game_night_votes",
  {
    gameNightId: uuid("game_night_id").notNull(),
    userGameId: uuid("user_game_id").notNull(),
    userId: uuid("user_id").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.gameNightId, table.userGameId, table.userId],
    }),
    // A vote goes with its game's place on the table.
    foreignKey({
      name: "game_night_votes_game_fk",
      columns: [table.gameNightId, table.userGameId],
      foreignColumns: [gameNightGames.gameNightId, gameNightGames.userGameId],
    }).onDelete("cascade"),
  ],
);

// Notices

export const notices = pgTable(
  "notices",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    type: text("type", { enum: NOTICE_TYPES }).notNull(),
    createdBy: uuid("created_by"),
    // The one thing it points at: it goes when that thing goes.
    loanId: uuid("loan_id").references(() => loans.id, { onDelete: "cascade" }),
    gameNightId: uuid("game_night_id").references(() => gameNights.id, {
      onDelete: "cascade",
    }),
    gameSuggestionId: uuid("game_suggestion_id").references(
      () => gameSuggestions.id,
      { onDelete: "cascade" },
    ),
    friendRequestId: uuid("friend_request_id").references(
      () => friendRequests.id,
      { onDelete: "cascade" },
    ),
    answerNote: text("answer_note"),
    remindedOn: day("reminded_on"),
    readAt: at("read_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    check("notices_type_check", oneOf(table.type, NOTICE_TYPES)),
    index("notices_user_created_idx").on(table.userId, table.createdAt),
    // The daily run writes each reminder once a day (KTD8): a second run's insert finds it here.
    uniqueIndex("notices_one_reminder_a_day_idx")
      .on(
        table.userId,
        table.type,
        sql`coalesce(${table.loanId}, ${table.gameNightId})`,
        table.remindedOn,
      )
      .where(sql`${table.remindedOn} is not null`),
  ],
);
