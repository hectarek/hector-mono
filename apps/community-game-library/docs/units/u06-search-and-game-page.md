# U6. Search and a game's page

| | |
|---|---|
| Batch | 2, Catalog and libraries (`feat/community-game-library-b2-catalog`) |
| Model | Strong: the first full slice, whose list rows, page and loader every later unit copies |
| After | Batch 1 merged |
| Serves | R1, R2, R7, R14, R15, AE1 (the game's page); KTD10, KTD13 |

Search finds a game by title, in two groups, and a game's page shows what the game has and which of your friends own it, with each copy's state.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `B10-Search`, `B5-Game`, `B13-GameStates`, `B11-GameOwned` (the page when you own a copy), `Y1-Covers`, `Wide2-Game`.
- The design system: ListRow, CoverThumb, Cover, Dice, Stamp, Group.
- [screens.md](../screens.md): rules 1, 7, 8 and 12 to 14; Empty lists, "Search with no match" and "A game none of your friends own".
- [data-model.md](../data-model.md): games, user_games, user_game_expansions.
- [build-plan.md](../build-plan.md): R1, R2, R7, R14, R15; KTD4, KTD10, KTD13.
- Recipes' `app/(main)/(library)/page.tsx` and its `loadLibrary`, as the pattern for a page that reads through one loader, and recipes' video handling for a recipe's `video_url`.

## Build

1. **Repositories.** `IGamesRepository`: `search(input, viewerId, limit)`, returning R2's two groups; `getById`; `listExpansions(baseGameId)`. `IUserGamesRepository`, reads only: `listVisibleForGame(gameId, viewerId)` (the viewer's own copies and their friends', with each owner's profile). U7 adds its writes.
2. **Use cases:**
   - `search-games`: normalize the input with `search-title.ts`; match by word similarity above a threshold; first group, games on the viewer's or friends' copies, then the rest of the catalog; each ordered by closeness, then popularity (KTD10)
   - `get-game`: the game, its expansions or base game, who has it (each copy with its `copyState` from `loan.ts`), and the viewer's own copies
   - `list-expansions`
3. **Search (B10)** on the Library page, at `/?q=`. It narrows as you type, as recipes' search does. Each `game-row` has its cover thumb, the title wrapping to two lines, the year, the first publisher, and "expansion" for an expansion. The groups are labelled as B10's board labels them.
4. **A game's page (B5)** at `/games/[id]`:
   - its cover at full quality (`cover`, with Y1's states)
   - its facts, each only when the game has it: players with the best counts as dice, play time, age, and "Complexity: medium" as a word
   - About, categories, expansions, and the how-to-play video when there's a `video_url`, shown as recipes shows a recipe's
   - who has it: `copy-row`s with the owner line ("Priya's") and `copy-state`'s stamp
   - your own copies, linking to their pages (B11)
   - "None of your friends own this yet." when nobody does
5. **`copy-state.tsx`** renders every state B13 draws, from `loan.ts`'s `copyState`. The buttons on those states (Borrow, Join the line) come with Batch 4.
6. **Wider screens:** the page in its 640 px column (Wide2), and the search rows in two and three columns.

## Not in this unit

"I own it" (U7). Borrowing and the line (U12, U15). The suggestion page (U9); "Search with no match" links to `/my-library/suggest`, which U9 builds. Filters (U8). Credits for a source (U24).

## Tests

- "ticket ride" finds Ticket to Ride; a leading "the" doesn't matter; a one-letter typo still matches.
- The two groups come in order, and popularity orders close matches.
- A stranger's copies never show, in search or on a game's page (KTD4).
- `get-game` leaves out every fact the game doesn't have (rule 14).
- AE1, the page's half: of a game's two copies, one out until Nov 20, the page shows the second as "Out until Nov 20".
- Screens: B10's rows and groups, B5's groups at 390 px, and B13's states.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] B10, B5, B11 and B13 match their boards at 390 px with the cast's data, and Wide2 at 768 and 1280 px
- [ ] The gate (H8): screenshots of B10, B5 and B13 beside their boards are in the task, and Hector's OK is noted before U7 starts
- [ ] The app's `AGENTS.md` names this unit's row, page and loader as the patterns to copy
- [ ] Committed as `feat(community-game-library): U6 search and a game's page`
