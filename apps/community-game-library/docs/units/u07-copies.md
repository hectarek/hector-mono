# U7. Copies and My library

| | |
|---|---|
| Batch | 2, Catalog and libraries (`feat/community-game-library-b2-catalog`) |
| Model | Standard: it follows U6's patterns |
| After | U6, and Hector's OK at U6's gate |
| Serves | R3, R8, R9, R48 (the switches), AE2; KTD6, KTD15 |

A member adds the games they own with one tap from search, several in a row, ticks the expansions in a copy's box, manages each copy, and sees My library.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `B6-MyLibrary`, `B8-AddGames`, `B7-Copy`, `B11-GameOwned`, `B13-GameStates`, `B14-RemoveCopy`, `A7-EmptyLibrary`, and `B10-Search` for "I own it" on a catalog row.
- [screens.md](../screens.md): After each action, "I own it" on a catalog result, "In my box" on an expansion's result, and Flip a switch; Actions that ask first, Remove a copy; When something goes wrong, Removing a copy that's out; Empty lists, My library and Add games before typing.
- [data-model.md](../data-model.md): user_games, user_game_expansions, user_settings.
- [build-plan.md](../build-plan.md): R3 (with its audit line), R8, R9, R48, AE2.
- U6's files, as the patterns.

## Build

1. **Writes.** `IUserGamesRepository`: `add`, `update`, `remove`, `setExpansions`, `setPassAlongForAll`. `IUserSettingsRepository.update` for `default_pass_along`.
2. **Use cases**, each one refusing anyone but the copy's owner:
   - `add-user-game`: takes `pass_along` from the owner's default. An expansion isn't added as a game of its own (R3's audit line): "In my box" on an expansion's result ticks it on the member's copy of its base game, and B8's board shows what happens with two copies or none.
   - `update-user-game` (condition, condition note) and `set-user-game-expansions` (only the copy's game's expansions), both saved with Save
   - `set-lending` (`lendable`, `pass_along`), saved as each switch flips
   - `set-pass-along-for-all` (B6's switch), setting every copy and the default
   - `remove-user-game`, refused while a loan holds the copy (AE2), with "You can remove it once it's back."
   - `list-my-library`, and `get-user-game` with its history from U4's loans reads (empty until Batch 4)
   - "I have a second copy of this" is `add-user-game` again for the same game
3. **Pages:**
   - `/my-library` (B6): the list, "Add a game", and "Friends can pass my games along", reading "On for N of M copies". U8 makes the list the shared one, and U9 adds waiting suggestions.
   - `/my-library/add` (B8): search the catalog with "I own it" on each row, "Added" with Undo after a tap, several in a row
   - "I own it" also on B10's catalog group and on a game's page when none of your friends own it (U6's empty line)
   - `/copies/[id]` (B7): where it is, this copy (condition, missing parts, expansions, Save), lending (the two switches), its history, the date it was added, "I have a second copy of this", and Remove (B14)
4. **Messages:** "Harbor Master is in My library", with Undo and Edit copy, through `notify`.

## Not in this unit

Filters and sort on My library (U8). Lending, and the states it brings (Batch 4). Suggestions (U9).

## Tests

- `add-user-game` takes the owner's default; Undo removes the copy just added.
- `remove-user-game` is refused while the copy is out (AE2).
- Only the copy's game's expansions can be ticked.
- `set-pass-along-for-all` changes every copy and the default.
- A friend can't change someone else's copy.
- Screens: each After each action row above, B14's dialog words, and A7's empty state.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] B6, B7, B8, B11, B14 and A7 match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U7 copies and My library`
