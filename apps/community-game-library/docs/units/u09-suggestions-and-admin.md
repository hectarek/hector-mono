# U9. Suggestions and the admin's catalog

| | |
|---|---|
| Batch | 2, Catalog and libraries (`feat/community-game-library-b2-catalog`) |
| Model | Standard |
| After | U6. Build it after U8, so the batch's branch stays linear |
| Serves | R4, R5, R7, R26 (the admin told); KTD11 |

A member suggests a game search didn't find. The admin answers it, adds games by hand, and corrects a game's record and its video.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `B9-Suggest`, `G1-Admin`, `G2-Suggestion`, `G3-AddByHand`, `G4-CatalogRecord`, `G5-FindGame`, `G7-Answered`.
- [screens.md](../screens.md): After each action, Send a suggestion and The admin answers a suggestion; Empty lists, The admin's suggestions; When something goes wrong, a photo that's too large.
- [data-model.md](../data-model.md): game_suggestions, games, and the notice types `suggestion-arrived` and `suggestion-answered`.
- [build-plan.md](../build-plan.md): R4 (with its audit line), R5, R7; KTD11.

## Build

1. **Suggest a game (B9)** at `/my-library/suggest`: the title, and optionally the year, publisher, a link and a photo of the box (the photo field, into `catalog-images`). Sending says "Suggestion sent.", and My library lists the member's waiting suggestions as "suggested today · waiting on the admin". The admin gets `suggestion-arrived`.
2. **The admin's pages**, each behind `requireAdmin`:
   - `/admin` (G1): suggestions waiting, Find a game to edit, Add a game by hand, and the accounts section that U22 fills
   - `/admin/suggestions/[id]` (G2): Add it by hand (G3, prefilled), It's already here (pick the game), or Decline, which needs a reason
   - `/admin/suggestions/answered` (G7)
   - `/admin/games` (G5), `/admin/games/new` (G3) and `/admin/games/[id]` (G4)
3. **Use cases:**
   - `suggest-game`; `list-suggestions`; `list-answered-suggestions`
   - `answer-suggestion`: added or already here sets `game_id` and puts the game in the suggester's library through `add-user-game`; declined keeps the reason in `decline_note`. Each writes `suggestion-answered`.
   - `add-game` and `update-game`, with every games field: only the title is required, complexity is picked from three words, the image is an upload or an address, and the how-to-play video is a link. Both write `search_title`.
   - `find-games-to-edit`
4. **E5 gets an Admin row**, for the admin only.

## Not in this unit

A source's credits and ids (U24). Removing an account (U22).

## Tests

- A member is refused every admin page and action.
- An added or already-here answer puts the game in the suggester's library; a decline needs a reason.
- `add-game` and `update-game` write `search_title`, and need only the title.
- Each answer writes its notice, and a suggestion writes `suggestion-arrived`.
- Screens: B9, G2's three answers, G3's form, and The admin's suggestions when none wait.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] B9 and G1 to G7 match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U9 suggestions and the admin's catalog`
- [ ] Batch 2 is pushed and its PR opened
