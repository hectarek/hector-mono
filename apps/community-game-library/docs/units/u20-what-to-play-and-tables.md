# U20. What should we play? and tables

| | |
|---|---|
| Batch | 5, Nights (`feat/community-game-library-b5-nights`) |
| Model | Standard: the rules are written out below |
| After | U19 |
| Serves | R37 (as revised 2026-11-12), R46, D2, AE6; KTD23 |

For a night, the app suggests games that fit the people, the time and the complexity, each with its reason, and proposes tables when one game can't seat everyone.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `D8-WhatToPlay`, `D9-Tables`, and D2, D7 and D13 for where they open from.
- [screens.md](../screens.md): Empty lists, "What should we play?" when nothing fits; rule 14 (show only what a game has).
- [build-plan.md](../build-plan.md): R37 (as revised 2026-11-12), R46, D2, AE6; KTD23.

## The rules

These are Claude's, written to match D8 and D9. Where the boards don't say, the choice is marked.

**What should we play?** (`src/entities/what-to-play.ts`)

- Its inputs are D8's: the people playing (going plus guests to start), the time (1 hour, 90 minutes, 2 hours or 3 hours), the complexity, and where from (the games on the table, or all the member's friends' games and their own).
- The time starts at the longest choice that fits the night's length, or 2 hours when the night has no end (Claude's choice). Where from starts on the games on the table when there are any.
- The complexity starts with none picked, meaning any; tapping a picked one clears it (Claude's choice). "New players" means light.
- A game fits when it plays at that many people (`min_players` to `max_players`), its time is within the time (`max_minutes`, or `min_minutes` when it has no maximum), and its complexity is the one picked. A game missing a value that a filter needs doesn't fit, and is left out with that reason.
- Best fits first: games that play best at that many people, then games that play at it, then more votes for games on the table, then popularity, then title.
- Each fit says why, from the facts the game has: "Plays 6, best at 5" and "90 min · medium", who brings it, and "On the table" when it is.
- Left out lists each game that didn't fit, in one short reason: "Harbor Lights seats 5 at most.", "Tin Kettle Derby is light."
- AE6: with 5 people and 90 minutes, a game that plays best at 4 to 5 in 60 minutes ranks above one that plays at 5 but best at 3, and a game longer than 90 minutes doesn't fit.

**Split into tables** (`src/entities/tables.ts`)

- It splits the people going, guests included, among the games on the table, or all friends' games when nothing on the table fits.
- The split uses the fewest tables whose sizes some game fits, with sizes as even as possible, and gives each table the best fit for its size from the rules above, no game twice.
- The host sits at the first table, and every guest at their member's table. The rest go in the order they answered.
- "Or one table for all 6" shows a game that seats everyone, when one does, and "Use one table" shows that instead. "Try another split" moves to the next best split.
- Nothing is stored. "Share with everyone going" opens the share sheet with the split as a ready message (Claude's reading of D9's "Only you see this until you share it").

## Build

1. The two entities above, with their reasons.
2. **`what-to-play`** and **`split-tables`** use cases, readable by anyone who can see the night (KTD4).
3. **D8** at `/nights/[id]/what-to-play` and **D9** at `/nights/[id]/tables`, opened from D2, D7 and D13, with D8's empty state when nothing fits ("Nothing fits 6 people in 3 hours. Try more time or another complexity.").

## Tests

- AE6, as above.
- Every rule above, table-driven, including games with missing values and "New players".
- Tables: the fewest tables, even sizes, guests with their member, no game twice, and the one-table option when a game seats everyone.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] D8 and D9 match their boards at 390 px, and work at 768 and 1280 px
- [ ] The task notes the choices marked above, for Hector's review
- [ ] Committed as `feat(community-game-library): U20 what should we play, and tables`
