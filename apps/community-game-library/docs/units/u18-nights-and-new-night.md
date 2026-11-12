# U18. Nights and a new night

| | |
|---|---|
| Batch | 5, Nights (`feat/community-game-library-b5-nights`), beside Batch 4 |
| Model | Standard |
| After | Batch 3 merged |
| Serves | R29, R30 (who sees it), R33, R34 (editing), R36, AE5; KTD4, KTD9 |

A member creates a game night with the games they'll bring, sees the upcoming nights they can see, and the host edits theirs.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `D1-Nights`, `D5-NewNight`, `D6-PickGames`, `D7-NightHost`, `X1-DatePicker`, and `E3-Friend` for its nights section.
- [screens.md](../screens.md): After each action, Create a game night; Empty lists, Nights.
- [data-model.md](../data-model.md): game_nights, game_night_attendees (the host's row), game_night_games, and the notice type `night-changed`.
- [build-plan.md](../build-plan.md): R29, R30, R33 (with its audit line), R34, R36, AE5; KTD4, KTD9.
- Batch 4 runs beside this one: follow the code map's rule for `di/container.ts`, `di/types.ts`, the code map and `AGENTS.md`.

## Build

1. **`can-see-night`** (KTD4): the host, anyone with an attendee row, or the host's friends when the audience is `'friends'`. Every read of a night goes through it, and its place and address load only after it (R36).
2. **`create-night`** (D5 at `/nights/new`): the name, date, start, optional end, place, optional address and optional note; the seats, counting the host and guests; who sees it, my friends or only people I invite; the two switches; and games on the table picked from the host's library (D6, a sheet of their copies). It makes the host's attendee row as going. A night only invited people see opens on Invite people first (D10, U19); any other opens on the host's page (D7).
3. **`update-night`** (Edit, from D7, at `/nights/[id]/edit`): the same fields, with `night-changed` to everyone going.
4. **`list-nights`** (D1 at `/nights`): the upcoming nights the member can see, soonest first, each with its places left and the member's own stamp; "New game night"; past nights fold away to `/nights/past` (U21); the Nights empty state.
5. **`get-night`**, and the night's page at `/nights/[id]`. For the host, D7 with what this unit owns: the details, who's going, the games on the table, and Edit. Later units add the rest of D7: the night's link, Invite people and the waitlist (U19), What should we play? and Split into tables (U20), and Add to my calendar and Cancel the night (U21).
6. **A friend's page (E3)** gains "Game nights Sam is going to".
7. Times are timestamps shown in Eastern time (KTD9); a date shows its weekday, and its year once that isn't this year.

## Tests

- AE5: a member who isn't invited to a private night sees neither it nor its place in their list.
- A night for friends shows to the host's friends, and to nobody else.
- The capacity counts the host.
- Editing tells everyone going.
- Screens: Create a game night's After each action row, D1's list and its empty state.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] D1, D5, D6 and D7's parts match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U18 nights and a new night`
