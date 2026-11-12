# Community Game Library: data model

Updated 2026-11-12. Hector confirmed it on 2026-11-12.

The catalog's tables: games, the games users own, and suggestions for games the catalog lacks. They hold only the values the drawn screens use. Where each value comes from is not decided; the findings are in [catalog-data.md](catalog-data.md). Users' settings, friends, loans, game nights and notices come later, under the same naming rules. The requirement and decision numbers (R, D) are [build-plan.md](build-plan.md)'s, and screen codes such as B5 are the design canvas's ([screens.md](screens.md)).

## Naming rules

These are the conventions a professional Postgres schema commonly follows; the recipes app's schema follows them too. Every table here, and every table added later, keeps them.

1. A table's name is plural and snake_case. A table of things that belong to another is named for the owner, singular, then the things, plural: `user_games`, `user_game_expansions`, `game_suggestions`.
2. A table that holds things has an `id` (uuid), `created_at` and `updated_at` (timestamptz, set by the database). A table that only pairs two things is keyed by the pair.
3. A foreign key is the table's name, singular, plus `_id`: `game_id`, `user_game_id`. When a table points at its own rows, the role goes first: `base_game_id`.
4. A member is a user. Whose row it is goes in `user_id`, and who made it in `created_by`; both hold the user's id from Neon Auth.
5. A column's name is singular unless it holds a list, and a list is an array: `designers`, `publishers`, `categories`, `best_players`. A unit keeps its plural: `min_players`, `max_minutes`.
6. A link ends in `_url` and is named for what it points at: `image_url`, `video_url`, `source_url`.
7. A value from a fixed set is text, typed as a union and held to it by a check. Its values are lowercase, hyphenated and readable on their own (`'base-game'`, `'like-new'`, `'already-here'`). The column that says what sort of row it is is `type`.
8. A yes-or-no is a plain word with no `is_`: `lendable`, `pass_along`.
9. When something happened is `<verb>_at`, and who did it `<verb>_by`: `answered_at`, `created_by`.
10. A free-text note is named for what it's about and ends in `_note`: `condition_note`, `decline_note`.
11. A lower or upper bound is `min_` or `max_` before what it measures: `min_players`, `max_minutes`, `min_age`.
12. Each value lives in one place. A history table is kept only when something reads the history.
13. No column holds an outside source's own id until a source is chosen; the id comes with the source. A value any source could fill, such as `popularity`, is fine.

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
| `best_players` | integer[] | no | The game's page ("best at 4"), the Best at side of the Players filter, What should we play? | R1, R11, R37 |
| `min_minutes`, `max_minutes` | integer | no | Rows, the game's page, the Play time filter, What should we play? | R1, R11, R37 |
| `min_age` | integer | no | The game's page ("Age 10+"), the folded Minimum age filter | R1, R11 |
| `complexity` | text: `'light' \| 'medium' \| 'heavy'` | no | The game's page, the folded Complexity filter, What should we play? | R1, R11, R37 |
| `categories` | text[] | no | The game's page, the folded Category filter | R1, R11 |
| `description` | text | no | The game's page (About) | R1, R14 |
| `image_url` | text | no | Everywhere a cover shows; the drawn token when it's empty | R1 |
| `video_url` | text | no | The game's page (How to play); the admin's record (G4) | R7 |
| `popularity` | integer | no | Not shown. Among close matches in search, more popular games come first | R2 |
| `created_at`, `updated_at` | timestamptz | yes | | |

A check keeps `base_game_id` set exactly when `type` is `'expansion'`.

Only `type` and `title` are required, since a game can be known by its title before its details are. A screen shows a value only when the game has it: no line, fact, inked die or filter appears for a value that's missing (Hector, 2026-11-12). Rows, filters and suggestions lean on players and play time, so a game in someone's library should have those.

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

## Not in the model

Hector reviewed the first draft on 2026-11-12, asked for names that follow one pattern, and confirmed this version.

| What | Why | On the screens |
|---|---|---|
| An outside source's id (`bgg_id`) | No source is chosen yet (rule 13) | No "Ours" stamp (G5), no merging a game into a source's record (G6, out of the first release), no Source group on the record (G4), and no searching a source from a suggestion (G2), until a source is chosen |
| A history of changes (`game_changes`) | The game's row is the one source of truth (rule 12), and there is one admin | The admin's record (G4) shows the current details only |
| Who answered a suggestion | One admin answers every suggestion | None |
| A credit per game | Credits are per source (above) | None |
| Mechanics | Left out of the first release | No mechanics on the game's page or in the filter |
| Other names | Left out of the first release | Search matches the title |
| Complexity as a number | Kept as a word, light, medium or heavy | "Complexity: medium" on the game's page |
| A second image size | One address, sized by the app | None |
| Ratings and ranks | Not used; `popularity` orders search | None |
