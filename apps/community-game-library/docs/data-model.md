# Community Game Library: data model

Updated 2026-11-12. Proposed by Claude; Hector hasn't confirmed it.

The catalog's tables: games, the copies members own, suggestions for games the catalog lacks, and the admin's changes. They hold only the values the drawn screens use. Where each value comes from is not decided; the findings are in [catalog-data.md](catalog-data.md). Members, friends, loans, game nights and notices come later. The requirement and decision numbers (R, D) are [build-plan.md](build-plan.md)'s, and screen codes such as B5 are the design canvas's ([screens.md](screens.md)).

## games

One row per game or expansion.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `title` | text | yes | Everywhere | R1 |
| `kind` | `'base-game' \| 'expansion'` | yes | Search ("2021 · expansion") | R1 |
| `base_game_id` | uuid → games | for an expansion | The game's page (Expansions); a copy's "Expansions in the box" | R1, R8 |
| `year` | integer | | Search rows, the game's page | R1, R2 |
| `publisher` | text | | Search rows, the game's page | R1, R2 |
| `designers` | text | | The game's page ("designed by …") | R1 |
| `min_players`, `max_players` | integer | | Rows, the game's page, the Players filter, What should we play? | R1, R11, R37 |
| `best_players` | integer[] | | The game's page ("best at 4"), the "Best at" filter, What should we play? | R1, R11, R37 |
| `min_minutes`, `max_minutes` | integer | | Rows, the game's page, the Play time filter, What should we play? | R1, R11, R37 |
| `min_age` | integer | | The game's page, the folded Minimum age filter | R1, R11 |
| `complexity` | `'light' \| 'medium' \| 'heavy'` | | The game's page, the folded Complexity filter, What should we play? | R1, R11, R37 |
| `categories` | text[] | | The game's page, the folded Category filter | R1, R11 |
| `description` | text | | The game's page (About) | R1, R14 |
| `cover_url` | text | | Everywhere a cover shows; the drawn token when it's empty | R1 |
| `bgg_id` | integer, unique | | Not shown. Ties a game to BGG's list of games. Empty on a game added by hand, which the admin screens stamp "Ours" (G3, G5) | D7, D11 |
| `popularity` | integer | | Not shown. Orders search results | R2 |
| `created_at`, `updated_at` | timestamptz | yes | | |

Players and play time aren't required, since a game can be known by its title before its details are. Rows, filters and suggestions all use them, so a game in someone's library should have them.

Credits are shown once per source, at the foot of a game's page and of search results, and on About the catalog (Y1), not per game. Which credit a game shows is settled with the sourcing. A per-game credit column comes back only if a chosen source needs one, such as text taken under an attribution license.

## copies

One row per physical copy a member owns.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `game_id` | uuid → games | yes | | R8 |
| `owner_id` | → members | yes | | R8 |
| `condition` | `'like-new' \| 'good' \| 'worn'` | yes, `'good'` by default | The copy's page (B7), the copy rows on the game's page | R8 |
| `missing_parts` | text | | The same | R8 |
| `lends_it` | boolean | yes, `true` by default | The copy's page ("I lend this copy") | R8 |
| `friends_can_pass_along` | boolean | yes, `false` by default | The copy's page | R48 |
| `added_at` | timestamptz | yes | The copy's page ("Added Jul 12, 2026") | R8 |

**copy_expansions**: `copy_id` → copies and `expansion_id` → games, one row per expansion in the box (R8). The expansion's `base_game_id` is the copy's game.

My library's switch, "Friends can pass my games along" (B6), sets `friends_can_pass_along` on every copy the member owns, and is also the member's default for copies added later. That default is a member setting, `pass_along_by_default`, for when the members table is written.

## game_suggestions

A member's suggestion for a game search didn't find (R4, B9, G2).

| Column | Type | Required |
|---|---|---|
| `id` | uuid | yes |
| `suggested_by` | → members | yes |
| `title` | text | yes |
| `year`, `publisher`, `link`, `photo_url` | text or integer | |
| `status` | `'waiting' \| 'added' \| 'already-here' \| 'declined'` | yes |
| `answer` | text | when declined |
| `game_id` | uuid → games | when added, or already here |
| `created_at`, `answered_at` | timestamptz | `created_at` |
| `answered_by` | → members | when answered |

`'already-here'` is G2's answer "It's already here": the member is pointed to the game in the catalog and it lands in their library, as with `'added'`. It's its own value because the admin added nothing, so Answered suggestions (G7) shows it as "Already here", not as declined.

## game_changes

What the admin changed on a game, and who changed it (R5, G4's Changes list).

| Column | Type | Required |
|---|---|---|
| `id` | uuid | yes |
| `game_id` | uuid → games | yes |
| `changed_by` | → members | yes |
| `changed_at` | timestamptz | yes |
| `field` | text | yes, the column changed, for example `max_minutes` |
| `old_value`, `new_value` | text | `old_value` is empty when the field was empty |

The old value is what lets the game's record show what a corrected field was before, and put it back (G4). With sources undecided, the old value isn't always BoardGameGeek's, so G4 reads "Corrected · was 45 min" and "Put it back". Whether a game from BoardGameGeek can be corrected at all is open in catalog-data.md, since BGG's terms forbid modifying its data.

## Left out of the MVP

Each is drawn somewhere, so leaving it out changes that screen.

| Value | Where it's drawn | The change |
|---|---|---|
| Mechanics | The game's page; the folded Mechanic filter; Add a game by hand (G3) | Drop the Mechanics line and the filter |
| Other names | Add a game by hand | Drop the field; search uses the title |
| Complexity as a number from 1 to 5 | The game's page ("Complexity 2.3 of 5"); Add a game by hand ("1 to 5") | Show the word instead ("Complexity: medium"), chosen from three. The filter and What should we play? already use words |
| A cover in two sizes (R1 says full size and thumbnail) | | One address; the app sizes it |
| How-to-play video | The game's page | Already deferred in the spec (R7) |
| Ratings and ranks | Nowhere | None |
