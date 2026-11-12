# U8. All friends: filters and sort

| | |
|---|---|
| Batch | 2, Catalog and libraries (`feat/community-game-library-b2-catalog`) |
| Model | Standard |
| After | U7 |
| Serves | R10, R11, R12, R13, AE1 (the card), AE8 (the library); KTD4 |

The Library's All friends view shows one row per game across the member's and their friends' copies, with what's available, filtered and sorted from the page's address. It's one list component, which My library and a friend's library use too.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `B1-Library`, `B2-Filter`, `B12-Sort`, `B3-LibraryFiltered`, `B4-LibraryNoMatch`, `Wide1-Library`, `Wide4-Tablet`.
- [screens.md](../screens.md): Empty lists, All friends before any friends, All friends when friends own nothing, and A filter that matches nothing; Limits to build for, the owner filter folding after six owners and the same rows everywhere.
- [build-plan.md](../build-plan.md): R10 to R13, with R11's audit line (play time as a cap, players starting on "plays with") and its revision (a filter shows only when some game in view has its value); AE1, AE8; KTD4.

## Build

1. **`src/entities/library-filters.ts`:**
   - parse and write the address: available now, owner, players (plays with N, or plays best with N), play time as a cap (30 minutes or less, an hour or less, two hours or less), and, folded, complexity, category and minimum age; sort by title, recently added, complexity, play time, year or most borrowed
   - apply them
   - which filters to offer: only those some game in view has a value for
   - B4's suggestion: the filter to drop, and how many games that brings back
2. **`list-library`**, over the viewer's and their friends' copies (KTD4), grouped by game, each with its availability ("1 of 2 available", "Out until Nov 20") from `copyState`, and most borrowed counted from loans. `list-my-library` uses the same rows.
3. **`library-list.tsx`**, used by `/` (All friends), `/my-library`, and later a friend's page (U10): the mono count line, the rows, the filter sheet (B2), the sort sheet (B12), the filter chips with Clear filters (B3), and B4's empty state.
4. **The segmented control**, All friends | My library, at the top of both.
5. **Empty states:** before any friends, "No friends yet. Share your friend link to see what your friends own.", with Share my friend link going to `/friends/link` (U10); and "Your friends haven't added games yet."

## Not in this unit

Search (U6). Adding (U7). A friend's page (U10).

## Tests

- AE1: two copies, one out until Nov 20, give a card reading "1 of 2 available".
- AE8: a member who isn't a friend has none of their games in your library.
- Each filter and sort, and the address read back gives the same view.
- A filter whose value no game in view has isn't offered.
- B4: the suggestion names the filter and the count it brings back.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] B1, B2, B3, B4 and B12 match their boards at 390 px, and Wide1 and Wide4 at their widths
- [ ] Committed as `feat(community-game-library): U8 all friends, filters and sort`
