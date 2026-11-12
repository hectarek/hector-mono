# U4. Shared reads, the cast and the seed

| | |
|---|---|
| Batch | 1, Foundation (`feat/community-game-library-b1-foundation`) |
| Model | Strong: the repository and fixture patterns later units copy |
| After | U3 |
| Serves | R10; KTD4, KTD7, KTD13, KTD21 |

The repositories more than one batch reads (people's profiles and settings, friendships, the writer for notices, and loans' reads for a copy's state), the canvas's cast as test fixtures, and the seed that fills a local or test database with the same people and games.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- [data-model.md](../data-model.md); [build-plan.md](../build-plan.md): KTD4, KTD7, KTD13, KTD21.
- `apps/hectors-recipes/AGENTS.md`, Testing; recipes' `tests/_support/app.ts`, `base.repository.ts`, and its spaces repository with its mock, as the pattern.
- The canvas's kit, with the Artifact tool: `project/kit/KIT.md`, for the cast, the games and their facts.

## Build

1. **Repositories**, each an interface in `src/application/repositories/`, a Drizzle implementation on `BaseRepository`, a mock, a DI module, and tests on both backends:
   - `IUserProfilesRepository`: `getByUserId`, `getManyByUserIds` (names and pieces for display), `create`, `update`
   - `IUserSettingsRepository`: `getByUserId`, `create`, `update`
   - `IFriendshipsRepository`: `areFriends(a, b)`, `listFriendIds(userId)`, `add(a, b)` and `remove(a, b)`, each writing both rows
   - `INoticesRepository`: `add(notice)`, inside the caller's transaction. U11 adds the reads.
   - `ILoansRepository`, reads only: `listOpenForCopies(copyIds)` (`'requested'` to `'passing'`), `getCurrentForCopy`, `listHistoryForCopy` (loans that were picked up, newest first). Batch 4 adds the writes.
   - `IRemovedUsersRepository`: `isRemoved(userId)`
2. **`requireFriend`** (KTD4) in `src/application/use-cases/friends/require-friend.ts`. A stranger gets recipes' `NotFoundError`, so they can't tell an account exists.
3. **`tests/_support/cast.ts`:** the canvas's people (You as a mustard pawn, Alice a brick house, Sam an ocean house, Priya a moss cone, Jo a plum cone, Ben a bone pawn, Mei a rose cone, Dev a charcoal pawn, Noor a teal ship), their friendships as the boards show them, the games with their facts and expansions, the copies, and loans in the states the boards show. Insert them through the repositories that exist and through Drizzle for the tables that don't have one yet. Add `makeCast()` helpers that later units extend.
4. **`scripts/seed.ts`** writes the cast to the database in `DATABASE_URL`. A dry run by default; `--commit` writes. It refuses any database that doesn't carry the test project's comment, as recipes' guard does, so it never reaches production. Neon Auth users can't be made by the seed, so `--as <name>=<user id>` maps cast members to real test accounts (You to the account you sign in with), and the rest get generated ids. Run it on the test project only with Hector's OK at that moment.

## Not in this unit

Screens. Repositories only one batch uses, which come with their units.

## Tests

- Each repository, on both backends.
- `requireFriend` refuses a stranger (AE8's rule, at the use case).
- The seed's dry run lists what it would write, and it refuses a database without the test comment.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] The seed's dry run on the test project prints the cast; with Hector's OK, the seed is committed there
- [ ] The app's `AGENTS.md` Testing section names the cast, its helpers and the seed
- [ ] Committed as `feat(community-game-library): U4 shared reads, the cast and the seed`
