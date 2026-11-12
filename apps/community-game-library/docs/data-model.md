# Community Game Library: data model

Updated 2026-11-12. Proposed by Claude and revised after Hector's review of the first draft; he hasn't confirmed this version.

The catalog's tables: games, the games users own, and suggestions for games the catalog lacks. They hold only the values the drawn screens use. Where each value comes from is not decided; the findings are in [catalog-data.md](catalog-data.md). Users' settings, friends, loans, game nights and notices come later, under the same naming rules. The requirement and decision numbers (R, D) are [build-plan.md](build-plan.md)'s, and screen codes such as B5 are the design canvas's ([screens.md](screens.md)).

## Naming rules

These follow the recipes app's schema (`apps/hectors-recipes/db/schema.ts`), which this app copies. Its spec writes down only rule 7; the rest are read from its tables. Every table here, and every table added later, keeps them.

1. A table's name is plural and snake_case. A table of things that belong to another is named for the owner, singular, then the things, plural, as recipes' `recipe_ingredients` and `space_members` are: `user_games`, `user_game_expansions`, `game_suggestions`.
2. A table that holds things has an `id` (uuid), `created_at` and `updated_at` (timestamptz, set by the database). A table that only pairs two things is keyed by the pair.
3. A foreign key is the table's name, singular, plus `_id`: `game_id`, `user_game_id`. When a table points at its own rows, the role goes first, as recipes' `copied_from_recipe_id` does: `base_game_id`.
4. A member is a user, as in recipes. Whose row it is goes in `user_id`, and who made it in `created_by`; both hold the user's id from Neon Auth.
5. A column's name is singular unless it holds a list, and a list is a text array, as recipes' `tags` is: `designers`, `publishers`, `categories`. A unit keeps its plural, as recipes' `time_minutes` does: `min_players`.
6. A link ends in `_url` and is named for what it points at, as recipes' `image_url`, `video_url` and `source_url` are.
7. A value from a fixed set is text, typed as a union and held to it by a check. Its values are lowercase, hyphenated and readable on their own (`'base-game'`, `'like-new'`, `'already-here'`), as recipes' spec asks. The column that says what sort of row it is is `type`, as on recipes' `spaces`.
8. A yes-or-no is a plain word with no `is_`, as recipes' `cooked`, `checked` and `optional` are: `lendable`, `pass_along`.
9. When something happened is `<verb>_at`, and who did it `<verb>_by`: `answered_at`, `created_by`.
10. A free-text note is named for what it's about and ends in `_note`: `condition_note`, `decline_note`.
11. A range is `min_` and `max_` before its unit: `min_players`, `max_minutes`.
12. Each value lives in one place. A history table is kept only when something reads the history, as the job search app's `job_status_changes` feeds its counts.
13. No column belongs to an outside data source until a source is chosen. Its id comes with it.

## games

One row per game or expansion.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `type` | text: `'base-game' \| 'expansion'` | yes, default `'base-game'` | Search ("2021 · expansion") | R1 |
| `base_game_id` | uuid → `games` | only on an expansion | The game's page (Expansions); the expansions in a copy's box | R1, R8 |
| `title` | text | yes | Everywhere | R1 |
| `year` | integer | no | Search rows, the game's page | R1, R2 |
| `publishers` | text[] | no | Search rows (the first), the game's page | R1, R2 |
| `designers` | text[] | no | The game's page ("designed by …") | R1 |
| `min_players`, `max_players` | integer | no | Rows, the game's page, the Players filter, What should we play? | R1, R11, R37 |
| `min_minutes`, `max_minutes` | integer | no | Rows, the game's page, the Play time filter, What should we play? | R1, R11, R37 |
| `complexity` | text: `'light' \| 'medium' \| 'heavy'` | no | The game's page, the folded Complexity filter, What should we play? | R1, R11, R37 |
| `categories` | text[] | no | The game's page, the folded Category filter | R1, R11 |
| `description` | text | no | The game's page (About) | R1, R14 |
| `image_url` | text | no | Everywhere a cover shows; the drawn token when it's empty | R1 |
| `video_url` | text | no | The game's page (How to play); the admin's record (G4) | R7 |
| `created_at`, `updated_at` | timestamptz | yes | | |

A check keeps `base_game_id` set exactly when `type` is `'expansion'`.

Players and play time aren't required, since a game can be known by its title before its details are. Rows, filters and suggestions all use them, so a game in someone's library should have them.

Credits for outside data are shown once per source, at the foot of a game's page and of search results, and on About the catalog (Y1). Which credit shows is settled with the source.

## user_games

One row per physical copy a user owns. The screens and the spec call a row a copy.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `user_id` | uuid | yes | The owner line in rows, a friend's library, the Owner filter | R8, R10, R11 |
| `game_id` | uuid → `games` | yes | | R8 |
| `condition` | text: `'like-new' \| 'good' \| 'worn'` | yes, default `'good'` | The copy's page (B7), the copy rows on the game's page | R8 |
| `condition_note` | text | no | The same ("Missing or damaged parts"); a return adds to it (C8) | R8, R19 |
| `lendable` | boolean | yes, default `true` | The copy's page ("I lend this copy"); "Not lent" when it's false | R8 |
| `pass_along` | boolean | yes, default `false` | The copy's page ("Friends can pass it along") | R48 |
| `created_at` | timestamptz | yes | The copy's page ("Added Jul 12, 2026"), the Recently added sort | R8, R12 |
| `updated_at` | timestamptz | yes | | |

A user can own two copies of one game (R9), so a row has its own `id`, and `user_id` with `game_id` isn't unique.

My library's switch (B6) sets `pass_along` on every copy the user owns, and is their default for copies added later. That default is `default_pass_along` in `user_settings`, written with the user tables; recipes keeps its per-user defaults in `user_settings` the same way.

## user_game_expansions

The expansions in a copy's box.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `user_game_id` | uuid → `user_games` | yes | | R8 |
| `game_id` | uuid → `games` | yes | The copy's page ("Expansions in the box"), the copy rows on the game's page ("with Night Tide") | R8 |

Its key is the pair. The expansion's `base_game_id` is the copy's game.

## game_suggestions

A user's suggestion of a game that search didn't find (R4, B9, G2).

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `created_by` | uuid | yes | The suggestion (G2), Answered suggestions (G7) | R4 |
| `title` | text | yes | The same | R4 |
| `year` | integer | no | The suggestion (G2) | R4 |
| `publisher` | text | no | The same | R4 |
| `source_url` | text | no | The same ("Link") | R4 |
| `image_url` | text | no | The same ("Photo of the box") | R4 |
| `status` | text: `'waiting' \| 'added' \| 'already-here' \| 'declined'` | yes, default `'waiting'` | The admin's list (G1), Answered suggestions (G7) | R4 |
| `decline_note` | text | when declined | Answered suggestions (G7), the user's notice | R4 |
| `game_id` | uuid → `games` | when added or already here | Answered suggestions (G7) opens it | R4 |
| `answered_at` | timestamptz | once answered | Answered suggestions (G7) | R4 |
| `created_at`, `updated_at` | timestamptz | yes | The admin's list (G1), Answered suggestions (G7) | |

`'already-here'` is G2's answer "It's already here": the user is pointed to the game in the catalog and it lands in their library, as with `'added'`. It's its own value because the admin added nothing, so Answered suggestions (G7) shows it as "Already here", not as declined.

## Changed after Hector's review

Hector reviewed the first draft on 2026-11-12. His main point was that its names followed no pattern; the rules above are the answer, and every name below follows them.

**Removed**

| What | Why | What it changes on the screens and in the spec |
|---|---|---|
| `best_players` | Hector: not needed | "Best at 4" leaves the game's page (B5, B11) and the Players filter (B2); the dice stop inking a best count; What should we play? (D8) ranks by players and time alone. R11, R14 and R37 lose best counts |
| `min_age` | Hector: not needed | "Age 10+" leaves B5 and B11, the Minimum age filter leaves B2, and the field leaves the admin's screens (G3, G4). R1 and R11 lose it |
| `bgg_id` | Hector: not needed while the source is open (rule 13) | The "Ours" stamp (G5), merging a game into BoardGameGeek's (G6), the record's Source group (G4) and "Search BoardGameGeek now" (G2) wait for a source |
| `popularity` | Rule 13: it came from BoardGameGeek's list | Catalog results in search are ordered by how well the title matches (R2) |
| `game_changes` | Rule 12: the game's row is the one source of truth, nothing reads the history, and there is one admin | The admin's record (G4) loses its Changes list and "Corrected · was 45 min" with "Put it back". R5 drops "every change records who made it" |
| `answered_by` | One admin answers every suggestion | None |
| `description_credit`, `cover_credit` | Credits are per source (above) | None |

**Added**: `video_url`, the how-to-play video, which Hector asked for as an easy optional field. R7 had deferred the video to a later phase; it comes into the first release.

**Renamed**

| Was | Now | Rule |
|---|---|---|
| `kind` | `type` | 7 |
| `cover_url` | `image_url` | 6 |
| `copies`, `copy_expansions` | `user_games`, `user_game_expansions` | 1 |
| `owner_id` | `user_id` | 4 |
| `publisher`, `designers` (text) | `publishers`, `designers` (text[]) | 5 |
| `missing_parts` | `condition_note` | 10 |
| `lends_it`, `friends_can_pass_along` | `lendable`, `pass_along` | 8 |
| `added_at` | `created_at` | 2 |
| `suggested_by` | `created_by` | 4, 9 |
| `photo_url`, `link` | `image_url`, `source_url` | 6 |
| `answer` | `decline_note` | 10 |
| `expansion_id` | `game_id` | 3 |

**Still left out of the first release**, as the first draft proposed: mechanics, other names, complexity as a number (the word instead), a second image size, and ratings.

**Waiting on Hector**

- `base_game_id` or `game_id`. Hector asked for `game_id`. This draft keeps `base_game_id` under rule 3: on `games`, a column called `game_id` reads as the row's own id, and it would mean something other than `game_id` on `user_games` and `user_game_expansions`. Recipes names its own self-reference `copied_from_recipe_id` for the same reason.
- Dropping `popularity`, which this draft does under rule 13.
