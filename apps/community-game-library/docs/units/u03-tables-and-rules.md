# U3. Every table and the shared rules

| | |
|---|---|
| Batch | 1, Foundation (`feat/community-game-library-b1-foundation`) |
| Model | Strong: the schema and the loan rules every batch reads |
| After | U1 |
| Serves | [data-model.md](../data-model.md); R15 to R24, R48, R51, D15; KTD5, KTD6, KTD10 |

Every table in data-model.md in one migration, with its checks and indexes, and the pure rules more than one batch needs: the loans' state machine and a copy's state, the notice types and their groups, the pieces, and the search title.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- [data-model.md](../data-model.md), all of it.
- [build-plan.md](../build-plan.md): KTD5, KTD6, KTD9, KTD10; R15 to R24, R48, D5 and D15.
- `apps/hectors-recipes/db/schema.ts`, the pattern for tables, unions with checks and timestamps, and recipes' Data Model and Backend Rules.
- `docs/clean-architecture.md` §3.1, on entities.

## Build

1. **`db/schema.ts`:** every table, column, default, key and foreign key in data-model.md, with the cascades in its What goes with a copy or an account.
   - User ids are uuids with no foreign key into `neon_auth`, as in recipes.
   - Checks: each union's values; `base_game_id` set exactly on an expansion; a friendship's two ids apart; `ends_at` after `starts_at`; capacity above zero; `guest_count` zero or more; `picked_up_on` and `due_on` set on every loan from `'out'` on.
   - Partial unique indexes: one loan per copy that holds it (`'out'`, `'returning'`, `'passing'`); one waiting for its pick-up (`'accepted'`); one open loan per borrower per copy (`'requested'` to `'passing'`); and notices' reminder index on `user_id`, `type`, `coalesce(loan_id, game_night_id)` and `reminded_on`, where `reminded_on` is set.
   - Unique: `friend_links.token`, `game_nights.link_token`, and one friend request per pair either way round (an index on the least and greatest of the two ids).
   - Indexes: `games.search_title` (GIN, `gin_trgm_ops`); `user_games` on `user_id` and on `game_id`; `loans` on `user_game_id, status` and on `borrower_user_id, status`; `notices` on `user_id, created_at`; `game_night_attendees` on `user_id`; `game_nights` on `starts_at`.
2. **The migration:** `bun run --filter=community-game-library db:generate --name=all_tables`. Read the SQL, and make sure it starts with `create extension if not exists pg_trgm`. Apply it to the test project with Hector's OK at that moment. Production gets it before Batch 1 merges, with his OK then (KTD1).
3. **The test database** loads `pg_trgm` from `@electric-sql/pglite/contrib/pg_trgm` in `tests/_support/database.ts`.
4. **Entities** in `src/entities/`:
   - `models/`: a Zod schema for each table in the code map's list, with each union as an enum of its readable values
   - `loan.ts`: the statuses; `canMove(loan, move, actor)`; the period options (7, 14 and 30 days, or a picked date); `dueOn(pickedUpOn, periodDays)`; `isOverdue(loan, today)`; `lineOf(requests)`; and `copyState(copy, loans, viewerId, today)`, which gives B13's states with each one's stamp word and color
   - `notice-types.ts`: the 31 types, each one's group or none, the 13 groups in E7's order, and which group starts off
   - `piece.ts`: the four shapes and ten colors in the design system's order, and which colors are for people only
   - `search-title.ts`: lower case, accents stripped (NFKD), punctuation to spaces, spaces collapsed, and a leading "the", "a" or "an" dropped

## Not in this unit

Repositories (U4 and later units). Any screen.

## Tests

- `loan.ts`: every move allowed and refused, by actor; due dates, with a month as 30 days and a picked date; overdue only when out, and never when returning or passing (D15); the line's order; `copyState` for the owner, the borrower, the next friend in line and another friend.
- `notice-types.ts`: every type has a group or none, and the groups are in E7's order.
- `search-title.ts`: "The Castles of Burgundy" gives "castles of burgundy", "Café International" gives "cafe international", and "Ticket to Ride: Europe" keeps its words.
- On PGlite alone: each check refuses a bad row; the partial unique indexes refuse a second holder, a second accepted loan and a second open loan for one borrower; deleting a copy takes its loans and their notices; the reminder index refuses a second reminder for the same day.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] The migration is applied to the test project, with Hector's OK in the task
- [ ] The app's `AGENTS.md` has a Data Model section that points to data-model.md and lists what every writer must keep true
- [ ] Committed as `feat(community-game-library): U3 every table and the shared rules`
