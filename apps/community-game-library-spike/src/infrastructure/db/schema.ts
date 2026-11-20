import {
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// A slice of data-model.md's games table: enough for search (B10) and a game's page (B5).
export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type")
      .$type<"base-game" | "expansion">()
      .notNull()
      .default("base-game"),
    baseGameId: uuid("base_game_id"),
    title: text("title").notNull(),
    searchTitle: text("search_title").notNull(),
    year: integer("year"),
    publishers: text("publishers").array(),
    minPlayers: integer("min_players"),
    maxPlayers: integer("max_players"),
    bestPlayers: integer("best_players").array(),
    minMinutes: integer("min_minutes"),
    maxMinutes: integer("max_minutes"),
    minAge: integer("min_age"),
    complexity: text("complexity").$type<"light" | "medium" | "heavy">(),
    description: text("description"),
    popularity: integer("popularity"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("games_search_title_trgm").using(
      "gin",
      table.searchTitle.op("gin_trgm_ops"),
    ),
  ],
);

// The same table as SQL, for PGlite in tests and local runs, where no migration runs.
export const CREATE_GAMES_SQL = `
  create extension if not exists pg_trgm;
  create table if not exists games (
    id uuid primary key default gen_random_uuid(),
    type text not null default 'base-game' check (type in ('base-game', 'expansion')),
    base_game_id uuid references games (id),
    title text not null,
    search_title text not null,
    year integer,
    publishers text[],
    min_players integer,
    max_players integer,
    best_players integer[],
    min_minutes integer,
    max_minutes integer,
    min_age integer,
    complexity text check (complexity in ('light', 'medium', 'heavy')),
    description text,
    popularity integer,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    check ((type = 'expansion') = (base_game_id is not null))
  );
  create index if not exists games_search_title_trgm on games using gin (search_title gin_trgm_ops);
`;
