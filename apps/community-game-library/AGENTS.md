# AGENTS.md — community-game-library

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers app-specific context

## Overview

A private library for a circle of friends' board games: who owns which games, borrowing a copy with a due date nobody has to remember, and game nights with the right games for the people coming. Phone-first and installed to the home screen. Clean architecture on recipes' pattern ([../../docs/clean-architecture.md](../../docs/clean-architecture.md)), with `apps/hectors-recipes` as the reference.

[docs/build-plan.md](docs/build-plan.md) is the spec: requirements (R), decisions (D), key technical decisions (KTD), the code map, and 26 units (U) in 8 batches. Each unit is a task in Hector's private tracker under its U number: start from the task, then follow the spec's How to build a unit. The tables are in [docs/data-model.md](docs/data-model.md), the screens' rules in [docs/screens.md](docs/screens.md), and the catalog's data in [docs/catalog-data.md](docs/catalog-data.md). Every route, folder and name comes from the spec's code map: a unit that needs a name it lacks adds it there in the same change.

## Privacy (R45)

- The repo is public. Code, tests, fixtures, docs, screenshots, commit messages and PR text use fictional people only: the design canvas's cast (You, Alice, Sam, Priya, Jo, Ben, Mei, Dev and Noor, KTD13) and its games. A member's name, phone, email or address never goes in the repo: a task that would put one there stops, and it stays in the database.

## Stack

- Next.js 16 with Cache Components and partial prefetching, React 19 with the compiler, Tailwind CSS and shadcn/ui through `@repo/ui`
- Neon Postgres via `@neondatabase/serverless`, Drizzle ORM, generated migrations in `db/migrations/`
- Auth via `@neondatabase/auth` (Better Auth powered)
- Files in Neon Object Storage, through `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`, pinned to the same release so their types match
- DI via `@evyweb/ioctopus`; tests on `bun:test` with PGlite and happy-dom

## Architecture

The spec's code map, as far as it's built (U1 to U9):

```
app/
  (api)/api/auth/[...path]/  # Neon Auth's endpoints, passed through; logged by status, path and class
  (auth)/welcome/            # where signed-out visitors start: A1, or A9 inside a chat app's browser
                             # (page.tsx, welcome-screen.tsx)
  (auth)/auth/[path]/        # Neon's forms: make an account (A2), sign in (A8); layout.tsx loads the kit
  (start)/start/             # the steps before the app: profile/ (A4), home-screen/ (A6); A5 comes with U10
  (main)/                    # the signed-in app: layout.tsx (the shell, below; account-gate.tsx), page.tsx
                             # (the Library: All friends since U8, search at ?q= since U6, with
                             # library-search.tsx and library-search-results.tsx, shared with My library),
                             # loading.tsx (its header and skeleton); library-views.tsx (All friends | My
                             # library, U7);
                             # games/[id]/ (B5, B11, B13); my-library/ (B6, A7), my-library/add/ (B8) and
                             # my-library/suggest/ (B9); admin/ (G1; suggestions/[id]/ G2, suggestions/answered/
                             # G7, games/ G5, games/new/ G3, games/[id]/ G4; admin-reads.ts, their Not found;
                             # admin-loading.tsx, the skeleton each route's loading.tsx renders);
                             # copies/[id]/ (B7, B14: copy-form.tsx, remove-copy.tsx); you/ (E5) and
                             # you/edit/ (E6)
  account/[path]/            # Neon's account views, under the kit's own layout (no link to it yet)
  removed/                   # a removed account's only page
  _components/               # the look (U2, see Screens): app-header (AppBar, AppHeader), back-link,
                             # bell, changed-notice, confirm-dialog (and LeaveGuardDialog), cover,
                             # cover-thumb, date-sheet, dice, group, icons, list-row, no-connection,
                             # page-column, people-picker, photo-field, piece, seats, share-button,
                             # sheet, stamp, tab-bar, tab-count, track; action-form. U5's: auth-notice,
                             # home-screen-steps, open-in-browser (A9's Copy the link), piece-picker,
                             # profile-form (A4 and E6), steps. U6's: copy-row and copy-state (a copy and
                             # its words, B13), game-row (GameCardRow, CatalogRow), game-video. U7's:
                             # i-own-it (IOwnIt, and AddedTally and AddedSoFar, B8's count), in-my-box,
                             # saved-switch (a switch that saves as it flips). U8's: library-list (the one
                             # list), library-controls (Filter, Sort, chips), filter-sheet (B2), sort-sheet
                             # (B12). U9's: game-form (G3 and G4)
  _lib/                      # current-user, auth-paths, safe-redirect, call-action, use-closes-on-leave,
                             # notify, leave-guard, changed-lines, share, shrink-image. U5's: account
                             # (getAccount and the gate), auth (the browser's auth client), auth-localization,
                             # auth-notice
  _providers/                # auth-provider: Neon's kit, for the sign-in and account layouts only
  actions/                   # shared.ts: ActionState, actionLogger, text, toActionError (not "use server");
                             # profile.ts: createProfile, updateProfile, removePhoto; copies.ts (U7):
                             # addCopy, undoAddCopy, putInBox, saveCopy, setLending, setPassAlongForAll,
                             # removeCopy; suggestions.ts (U9): suggestGame; admin.ts (U9): answerSuggestion,
                             # addGame, updateGame
  layout.tsx, globals.css, error.tsx, not-found.tsx
src/
  entities/
    errors/                  # common.ts (recipes' errors, each naming itself, and ChangedError with its
                             # CHANGED_REASONS), loggable.ts (job-search's)
    models/                  # a Zod model per table (see Data Model), with its own fixed lists;
                             # user, session, transaction, logger
    loan.ts                  # the statuses, LOAN_MOVES and canMove, PASS_ALONG_FOLLOW_ONS, the
                             # periods and datesAtPickUp, isOverdue, lineOf, copyState (KTD6)
    account-state.ts         # AccountState: removed, needs-profile, or ready (KTD3)
    in-app-browser.ts        # IN_APP_BROWSERS and inAppBrowserOf: A9's list, each pattern with its source
    notice-types.ts          # NOTICE_TYPES with their groups, NOTICE_GROUPS in E7's order,
                             # DEFAULT_NOTICES_OFF
    piece.ts                 # PIECE_SHAPES, PIECE_COLORS, PEOPLE_ONLY_COLORS (R51); CoverColor and
                             # coverColorOf, a game's token color
    profile-photo.ts         # what a photo may be (types, 300 KB), its signed address's hour, the
                             # "didn't upload" line
    search-title.ts          # toSearchTitle and SEARCH_MATCH_ABOVE (KTD10); SEARCH_ORDERS, the Library's
                             # shelves first or Add games' closest first
    game-card.ts             # gameCard: a game's card in a list from its copies' states (B1, B10)
    game-facts.ts            # a game's facts and lines in the boards' words, only what it has (rule 14)
    library-filters.ts       # R11 to R13 (U8): the address's view (parseLibraryView, libraryViewSearch),
                             # listLibrary (filter, sort, what to offer, B4's suggestion) over LibraryItems,
                             # countMatches (B2's live count), and the chips', count line's and B4's words
    video-link.ts            # videoEmbed, recipes'
    week.ts                  # dates as "YYYY-MM-DD", todayIn, PLAN_TIME_ZONE = America/New_York (KTD9),
                             # formatDate ("Fri, Nov 20", with the year once it isn't this year),
                             # formatWeekday and formatMonthDay, its parts; formatDay ("today", "yesterday",
                             # "Nov 2") and formatTime ("9:12 AM", U9)
  application/
    repositories/            # interfaces (U4): friendships, loans (reads; U8's pick-up counts), notices (add), removed-users,
                             # user-profiles, user-settings; U6: games (reads, and U9's writes), user-games
                             # (reads, and U7's writes); U9: game-suggestions
    services/                # interfaces: authentication, logger, transaction-manager, file-storage
    use-cases/admin/         # require-admin
    use-cases/catalog/       # get-game, search-games (U6)
    use-cases/copies/        # add-user-game, get-user-game, list-library (U8), list-my-library, put-in-box, remove-user-game,
                             # require-own-copy (a plain function), set-lending, set-pass-along-for-all,
                             # update-user-game (U7)
    use-cases/friends/       # require-friend (KTD4)
    use-cases/suggestions/   # suggest-game, list-suggestions, list-answered-suggestions, get-suggestion,
                             # answer-suggestion, add-game, update-game, find-games-to-edit, get-game-to-edit
                             # (U9); answer-step (answerSuggestion) and game-record (checkFamily,
                             # storeGameImage), plain functions they share
    use-cases/profile/       # create-profile, get-account-state, get-profile, list-taken-pieces,
                             # remove-photo, set-photo, update-profile
  interface-adapters/
    controllers/catalog/     # get-game, search-games
    controllers/copies/      # one per use case of copies/, but require-own-copy
    controllers/suggestions/ # one per use case of suggestions/; form-fields.ts, the forms' field rules
    controllers/profile/     # one per use case of profile/ (they check the user and the input)
  infrastructure/
    drizzle-errors.ts        # names drizzle's query error for the logs
    repositories/            # base.repository.ts, then one per interface, each with its .mock.ts
    services/                # neon-auth, transaction-manager, console-logger, s3-file-storage, with mocks
di/                          # container.ts, types.ts, modules: access (with removed users),
                             # authentication, catalog (games, U6), copies (user games, U6; U7's use cases),
                             # file-storage, suggestions (U9),
                             # friends, loans, logger, notices, profile (profiles and settings), transaction
db/                          # schema.ts (every table, U3), index.ts, migrations/ (0000_all_tables)
lib/                         # auth/server.ts, logger.ts
scripts/                     # check-test-database.ts, require-migrations.ts, migrate-production.ts,
                             # seed.ts (U4); lib/ (migrations.ts, terminal.ts)
tests/                       # bun:test, mirroring the tree; db/schema.test.ts; _support/ (see Testing)
proxy.ts
```

## Differences from recipes

The infrastructure is copied from recipes, not shared (D6, KTD1), with job-search's privacy rules. Not copied: the AI reader, live updates (Ably), the page and PDF fetchers, and spaces with their roles. Three things differ on purpose, as in job-search:

- **Environments.** Local development and previews use the Neon test project. Production's values live only in Vercel's Production environment and never pass through a Claude session (Environments).
- **Logging.** Logs carry error classes, codes and record ids, never a field's value, since the database holds friends' names, phone numbers and addresses (Logging Rules).
- **The admin** is the account whose id is `ADMIN_USER_ID` (Auth Rules).

## Cache Components

Recipes' rules carry over ([its AGENTS.md](../hectors-recipes/AGENTS.md#cache-components)):

- `export const dynamic`, `revalidate` and `dynamicParams` fail the build. A page that reads the session, its address or the database in its body has a `loading.tsx` in its own folder, so the prerendered shell is the layout and the skeleton, and the page streams in after. A nested route needs its own too, whatever its parent folders have: `next dev` checks a navigation at each level of the route, deepest first, and the deepest keeps the page's own folder, which only a `loading.tsx` there (or a `<Suspense>` inside the page) covers. Without it, `next dev` logs "Next.js encountered uncached data during prerendering or a navigation" at the page's `await connection()` (U9's admin pages, 2026-11-22; [the lesson](../../docs/solutions/runtime-errors/nested-page-without-its-own-loading-tsx-fails-the-instant-navigation-check.md)). The tests don't catch it: open each new route on the dev server.
- A page without a `loading.tsx` puts what it reads at request time (the session, `searchParams`, the database) inside `<Suspense>`.
- The clock (`new Date()`, `Date.now()`) and `crypto.randomUUID()` fail the build if they run while a page prerenders. Read the session first, then the clock: `todayIn` runs at request time.
- A page waits on `connection()` (`next/server`) before it reads the session, as the Library page does. Without it, the build's prerender, and on Vercel a partial prefetch, start Neon's session read, which fails and logs ("Cookie validation error", then "Failed to get session") when their render ends ([the lesson](../../docs/solutions/runtime-errors/partial-prefetching-runs-page-reads-that-fail-in-production.md)). The U1 Library page logged both in `next build` until it waited (2026-11-21): it has no params or `searchParams` to stop the prerender first, as recipes' pages do. `connection()` also blocks prefetches, so a tab whose data should arrive with its prefetch reads it through a private cache instead (recipes' D87), when a unit chooses that.
- A component above a page's `loading.tsx` that reads the address (`usePathname`) sits inside its own `<Suspense>`, or prerendering a route with params hangs and `next build` fails. CI doesn't build, so run `next build` after changing the shell.
- `next build` needs the auth variables present (`lib/auth/server.ts` throws at import without them), but nothing at build time reaches Neon, the database or storage, so placeholders build. A production build on Vercel is the one exception: its migration check reads production's migrations first (Environments). `next build` prints no errors (2026-11-21); an error in its output is a new problem.

## Screens

The look is Punchboard (D13), as `packages/ui/src/styles/themes/community-game-library.css` (KTD12), and the design system (its link is in Hector's tracker) is the spec for every component; a board's words, order and states are its screen's. U2 built the theme, the components and the shell; each later unit builds its pages from them.

- **Colors are tokens only.** Navy is `foreground`/`primary`/`border`, kraft `background`, chipboard `card`/`popover`, bone `secondary`/`muted`, text-brown `muted-foreground`, stamp-red `destructive`, and `text-white` is the kit's white. The theme's own colors come through data attributes it styles, never a class: `data-color="<piece color>"` paints a piece or a token (the fill of an SVG or a shape in one, the background of anything else), and `data-ink="smudge"` sets the brown of an on-hold stamp or a small caps label. A switched-off control is any disabled button: the theme draws it dashed in switched-off.
- **The shared components' look is the theme's.** It restyles Button, the fields, the choices, the toggles, Drawer, Dialog, AlertDialog, the Toaster and Empty by `data-slot`, unlayered, so their utilities can't change it; `no-restyle` forbids trying, and layout classes still work. A Button's kind is its variant (`default` the one primary, `secondary`, `destructive` the solid red, `link` the quiet dashed link) and its size its size (`lg` a screen's 48px main action, `sm` a button in a row or the header). The app's own components (stamp, piece, list-row and the rest) are utilities over the tokens.
- **Type sizes** are Tailwind's and the shared stylesheet's: `text-10`, `text-13`, `text-15`, `text-22` and `text-26` are the kit's own, with the font's own line height. `cn` from `@repo/ui/lib/utils` knows them; `cn` straight from the `cn` package takes `text-13` for a color and drops it beside one (2026-11-21).
- **One breakpoint for the shell, 768px** (`md:`): the tabs move into the AppBar, a sheet becomes a 480px dialog. Browsed lists add a third column from 1100px, written `min-[68.75rem]:`: Tailwind sorts a px breakpoint before `md`'s rem one, so `min-[1100px]:` loses to `md:` (2026-11-21).
- **A page** is a `PageColumn` (`read`: 640 wide inside its sides; `browse`: 1080) whose `header` is an `AppHeader`: a tab's stencil title (with the bell and the piece on a phone) or a pushed page's `back` link named for where it goes. Its `loading.tsx` renders the same header. The `(main)` layout holds the AppBar, the bottom TabBar, the no-connection line and the leave guard's dialog; the piece is the member's own since U5 (a bone pawn while it loads), and U11 gives the bell and the tabs their counts.
- **The shared patterns** (KTD16 to KTD18; screens.md): `ConfirmDialog` (controlled; `onConfirm` answers with its error, if any, and the dialog stays open to show it), `Sheet` and `SheetActions` (the Drawer on a phone, a dialog from 768px; both close on leave), `DateSheet` (X1), `notify` and `notifyNotSent` ("That didn't send." with Try again), `ShareButton`, `PhotoField`, `ChangedNotice` (an action state's `changed`, from `ChangedError`), `PeoplePicker` (buttons up to six, searched past six), the leave guard (a form calls `useLeaveGuard(hasTypedText)`; a link that leaves calls `confirmLeave`), `NoConnection`, @repo/ui's `Empty` (the punched-out box) and `FieldError` (the field's error line). Dates on screen go through `formatDate`.
- **U6's patterns, for every later list and page.** A game in a list is `GameCardRow` (`game-row.tsx`), its card from `gameCard` (`src/entities/game-card.ts`): one rule gives all nine of B1's cards (your own loan or request decides, then news of your own copy, then how many are free, "1 of 2 available"), and U8's library list uses it too. A catalog game is `CatalogRow`, its title underlined. A copy is `CopyRow` with `copyWords` (`copy-state.tsx`): each fact in mono on a line of its own, only the next in line beside a piece, and the stamp the member's own status. A page reads through one loader beside it (`loadGame` in `games/[id]/page.tsx`), which turns Not found or a bad id into `notFound()`; its return type is inferred, since `app/` can't import a use case's types. A game's facts and lines come from `game-facts.ts`, each only when the game has it (rule 14), and its token color from `coverColorOf`, since the catalog keeps none (an expansion takes its base game's). A link from search carries `?q=`, so the game's way back returns to the results.
- **U7's patterns.** An action says what it did through `notify`, with Undo where it can be undone: `IOwnIt` stamps its row Added with Undo under it, and a page that counts what's added wraps its rows in `AddedTally` (B8's "1 added"). A switch that saves as it flips is `SavedSwitch` ("Saved.", or back as it was with the error), given its server action bound to the thing it changes (`setLending.bind(null, copyId, "lendable")`). A form with Save keeps its fields in state and compares them with the props its page renders, which the save's revalidation refreshes, so its leave guard needs no copy of what was saved (`copy-form.tsx`). A form that stays on its page after a save sends from `onSubmit`, in a transition, not through the form's `action`: React resets a form once its action ends, which put B7's controlled condition back to the one the page loaded with while the copy kept the new one (2026-11-22); a screen test checks the field after "Saved.". A catalog row shows its own action: I own it on a base game, In my box on an expansion of a game you own. Only a copy's owner opens its page (`requireOwnCopy`); anyone else gets Not found. An action whose dialog ends on another page returns its message, and the dialog pushes the route and shows it (`removeCopy`).
- **U8's patterns.** A library is one list: `LibraryList` (`library-list.tsx`) over `listLibrary`'s result, with the page's own rows as its children, used by All friends and My library and, from U10, a friend's library. Its view lives in the address (R13): a page parses it with `parseLibraryView`, writes it with `libraryViewSearch`, and every control pushes a new address, so Back undoes a change; search keeps it (`LibrarySearch`'s `keep`), so clearing a search brings the filters back. B2's sheet stages its choices and applies them with Show N games, counting them with `countMatches` over `inView` (every game in view's facts, small enough for the client). Each of its changes goes through `onDraft(change)`, applied to the latest draft: a Base UI switch's or toggle group's change can render after the next tap's, so a handler that spread a draft it read earlier lost one of the two (found in a screen test, 2026-11-22). A filter shows only when some game in view has its value (R11's revision), or while it's on. A filter keeps a game when any of its copies matches, and the card stays whole (B3).
- **U9's patterns.** Only the admin reads or writes a suggestion's answer or the catalog: each of those use cases starts with `requireAdmin`, and each admin page reads through `adminRead` (`app/(main)/admin/admin-reads.ts`), which turns a refusal into Not found, so a member can't tell the page exists. E5's Admin row is a read of the waiting suggestions that a refusal hides. The answering steps (`answerSuggestion` in `answer-step.ts`) are a plain function that `answer-suggestion` and `add-game` both call inside their transaction, so a game added from a suggestion answers it, puts it on the suggester's shelf (base games only, R3) and tells them in one write. A picture the admin or a member sends goes to the public `catalog-images` bucket (`storeGameImage`, `suggest-game`), and the file is removed when its row isn't written. G4 edits the whole record in G3's form (`game-form.tsx`), whose picture is an upload or an address, the upload winning when both are given.

## Data Model

[docs/data-model.md](docs/data-model.md) is the source for every table, column, check and index, and says why each exists. `db/schema.ts` holds all sixteen, made by U3's one migration (KTD5), and each table has a Zod model in `src/entities/models/` named for it (`loans` → `loan.model.ts`). A later unit changes the schema only when its task says so: one migration per batch at most, additive before the deploy that uses it and drops after (recipes' Backend Rules), and never in two open batches at once.

The database refuses on its own: a value outside its fixed list, an expansion without a base game or a base game with one, a friendship with oneself, a night with no seats or one that ends before it starts, negative guests, a loan from `'out'` on without its pick-up day and due date, a second loan holding a copy (`'out'`, `'returning'` or `'passing'`), a second yes waiting for its pick-up, a second open loan by one borrower on one copy, a second reminder of a type on one day for one loan or night, a second friend request between two people either way round, and a token already in use. `tests/db/schema.test.ts` shows each. Every writer keeps the rest true:

- **The fixed lists live in the entities**, and the checks are built from them: the statuses in `loan.ts`, the notice types and groups in `notice-types.ts`, the pieces in `piece.ts`, and each table's other lists in its model (`GAME_TYPES` in `game.model.ts`). A value added to a list needs a migration that rebuilds its check.
- **`games.search_title`** is `toSearchTitle(title)`, written in the same write as the title (KTD10).
- **A loan moves only as `canMove` allows**, after the copy's row lock (`select … for update` on `user_games`, KTD6). A pass-along writes both loans in one transaction (`PASS_ALONG_FOLLOW_ONS`). A yes sets `period_days` or, for a picked date, `due_on`, and the pick-up sets the other (`datesAtPickUp`). Overdue and the line are worked out when read (`isOverdue`, `lineOf`), never stored.
- **A request for more time** sets the three `more_time_` columns together, and either answer clears all three.
- **A friendship is two rows**, made and deleted together: `IFriendshipsRepository.add` and `remove` write both in one statement, and `add` is a no-op for two people who are friends already. Accepting a friend request deletes it, and its notice goes with it.
- **A notice** is written in its change's own transaction (KTD7) and points at one thing. A reminder has no `created_by` and carries `reminded_on`; the daily run inserts it with `on conflict do nothing`.
- **User ids are Neon Auth's, with no foreign key.** The database deletes only what hangs off a copy, a loan, a night, a suggestion or a friend request (data-model.md, What goes with a copy or an account); deleting a member (U22) deletes the rest of their rows itself.
- **An expansion in a copy's box** has the copy's game as its `base_game_id`. No key checks it.
- **`updated_at`** moves on every update drizzle writes (`$onUpdate` in the schema). Raw SQL that updates a row sets it itself.
- **The first migration starts with `create extension if not exists pg_trgm`**, added by hand: drizzle-kit writes no extensions. A migration is never edited once it's applied anywhere, since its hash is recorded there and the migration scripts would then take that database for another app's.

## Backend Rules

- Reads go page → controller (through `getInjection`) → use case → repository. Writes go through a server action in `app/actions/<domain>.ts`, then `revalidatePath` for every page its change shows on (KTD16). Build a feature inward-out (`docs/clean-architecture.md` §9).
- Errors are typed classes from `src/entities/errors/common.ts`, thrown below the action and caught in it with `toActionError` (`app/actions/shared.ts`), never returned. A new error class sets `override name = "<ClassName>"`, as the others do, and goes in the transaction manager's `DOMAIN_ERRORS` if it can be thrown inside a transaction, or the action sees "Transaction failed" instead.
- `toActionError` gives each field its message through `FIELD_LABELS`, the form's labels in its board's words (A4 and E6's `name`, `phone` and `photo` so far): each form adds its fields, and a test that names one.
- Writes check access and mutate inside one `startTransaction`, so the check and the write see the same state, and every read inside a transaction passes `tx`: a read without it hangs on PGlite's one connection. Timeouts are Postgres-side (`set local statement_timeout`).
- Another member's copies, profile, phone, photo or nights are read only after `requireFriend(friendships, viewerId, otherUserId, tx)` (`src/application/use-cases/friends/require-friend.ts`, KTD4), a plain function a use case calls, as recipes' `requireSpaceRole`. A stranger gets the `NotFoundError` an id with no account gets, so they can't tell an account exists (AE8). Nobody is their own friend: a use case that shows members their own things checks for that first.
- A list of people reads `IUserProfilesRepository.getManyByUserIds`, which gives names and pieces only (`NameAndPiece`): the people in a loan's line or at a night needn't be the viewer's friends. The whole profile, with the phone and photo, comes from `getByUserId`, after `requireFriend` or for the other person in a loan (KTD4).
- A notice is written through `INoticesRepository.add(notice, tx)`, whose transaction isn't optional: the change's own (KTD7).
- **Search** (KTD10): `toSearchTitle` on what's typed, then pg_trgm's `word_similarity` above `SEARCH_MATCH_ABOVE` (0.5; measured 2026-11-22, a one-letter typo and two typed letters pass, one letter doesn't). The shelves' games, from `IUserGamesRepository.listVisible` (the read that joins friendships), come first, then closeness, popularity and the title in code-point order (`collate "C"`). Postgres refuses a constant in `ORDER BY`, so with no shelves the repository leaves that term out. `MockGamesRepository` ports pg_trgm's `iterate_word_similarity`, so both backends rank and cut off alike (it matched PGlite on 103,360 pairs). A two-word search whose one word is another title's still matches it ("safe harbor" scores Harbor Lights 0.58), and the shelves' group comes first: U24 sizes the threshold on the real catalog.
- Dates are `YYYY-MM-DD` strings end to end, and "today" is `todayIn(PLAN_TIME_ZONE)` on the server, never the phone (KTD9).
- Files (KTD11) go through `IFileStorage` (`src/application/services/file-storage.service.interface.ts`): `put(bucket, key, bytes, contentType)`, `remove(bucket, key)`, `signedUrl(bucket, key, seconds)` and `publicUrl(bucket, key)`, over the two buckets in `BUCKETS`. `profile-photos` is private: a row keeps the key (`photo_key`), and a page shows the photo through a signed address of an hour, made only for someone who may see the person. `catalog-images` is public-read: a row keeps the address `publicUrl` gives (`image_url`). Checked on the test project on 2026-11-21: a private file's public address answers 403 and its signed one 200, a public-read file answers 200 either way, and removing a file twice is no error.
- An adapter whose vendor SDK only some requests use imports it on first use (`await import()` in the method, `type` imports at the top), as `S3FileStorageService` does: the DI container builds every adapter when a server function starts (KTD2). `tests/di/container.test.ts` lists the packages kept out of start-up; a new one goes there too.
- A vendor's name appears only on the adapter that wraps it (`S3FileStorageService`, `NeonAuthService`); interfaces, DI symbols, use cases, controllers and pages stay neutral (`IFileStorage`).
- Never import infrastructure in `app/`: use DI symbols. Oxlint's layer rules enforce it, and a forbidden import (`@/db` in an entity) fails `bun check` (checked 2026-11-21).
- In `di/container.ts`, `di/types.ts`, the code map and this file, add lines in alphabetical place within their list, and resolve a merge conflict there by keeping both sides (the spec's Code map).

## Auth Rules

- Route all auth access through `IAuthenticationService` in actions and pages; the signed-in user comes from `getCurrentUserId` (`app/_lib/current-user.ts`). `lib/auth/server.ts` is only for the auth route, the auth pages (U5) and `NeonAuthService`.
- The session's signed copy lasts a day (`sessionDataTtl` in `lib/auth/server.ts`, KTD2), so the proxy checks with Neon Auth about once a day, not on every open. Don't shorten it below the usual gap between opens.
- `proxy.ts` is recipes': a cookie check, and a refresh of the session's copy through `/api/auth/get-session` when it's missing. It sends every signed-out request to `/welcome?redirectTo=<path>`, server actions included, as recipes' does, except `/welcome` and Neon's forms under `/auth` (the matcher). A page that opens signed out (KTD3: `/f/<token>`, `/n/<token>`, `/sw.js`, the manifest, the icons, the link-preview images) adds its own line there, with a proxy test. Route handlers under `/api` check their own access (`/api/cron/daily` its secret, KTD8).
- Redirect targets go through `safeRedirect` (`app/_lib/safe-redirect.ts`), which keeps only same-app paths.
- The admin is the account whose id is `ADMIN_USER_ID` (KTD1), never an email. `di/modules/access.module.ts` reads it, and anything only the admin does starts with `IRequireAdmin` (`src/application/use-cases/admin/require-admin.ts`), which refuses anyone else with `UnauthorizedError`. A missing or malformed id makes nobody the admin, and the first refusal it causes is logged once, as a warning. Production's id is set after Hector's first sign-in there, then a redeploy (H3). Tests have no admin: the preload drops `ADMIN_USER_ID`.
- Neon's sign-in kit (`@neondatabase/auth/react` and the browser's auth client) is 870 KB of JavaScript, so it loads only in the sign-in and account layouts, never the root or `(main)` layout (KTD2). `tests/app/layout.test.ts` fails if they reach it, or if the steps, welcome, removed, You or Edit profile pages do. Sign out and the account pages are plain links (`SIGN_OUT_HREF`, `ACCOUNT_HREF`), so the kit stays out of the pages that link to them.
- **The gate after sign-in** is `gate(landing)` in `app/_lib/account.ts`, over `getAccount()` (read once a request, `IGetAccountStateController`): no `user_profiles` row goes to `/start/profile`, a `removed_users` row to `/removed`, everyone else gets the app; signed out goes to `/welcome`. The `(main)` layout runs it beside the page (`account-gate.tsx` in `<Suspense>`, so the shell still prerenders and a redirect arrives as the stream does), and each step page and `/removed` calls it for its own landing. A page that calls it waits on `connection()` first. The header's piece reads the same `getAccount()` (`MyPiece`, a bone pawn until it resolves): an async component never resolves in a screen test, so the tests see the bone pawn and call `MyPiece()` directly.
- **The sign-in views** (`app/_providers/auth-provider.tsx`): Google on (`social`), the email code on sign-up (`emailVerification: { otp: true }`), the board's words (`app/_lib/auth-localization.ts`), light only (`defaultTheme="light"`, and `suppressHydrationWarning` on `<html>`, since the kit's theme provider sets a class and `color-scheme` on it). Neon's own toast isn't shown: the provider's `toast` hands each message to `AuthNotice`, a line under the form. Neon's sign-up error for a taken email carries only a message ("User already exists. Use another email.", code `USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL`), not the `error.code` the kit's `localization` is looked up by, so `toAuthMessage` words it by the message (checked on the test project, 2026-11-21). `globals.css` imports Neon's Tailwind sources and declares the layer order first, as recipes does; without them the kit's classes (`gap-6`) generate no CSS. The kit's fields are its own components, so the theme's restyle of the shared fields doesn't reach them: `CLASS_NAMES` in the auth page gives them the 44px field and 2px edge. A class like `text-15` merges away the text color there (Neon's `cn` takes it for one): use `text-base`.
- **The test project's sign-up code check is off** (KTD3), so an email account is made without a code there. The code step is Neon's own (`EMAIL_VERIFICATION`, `/auth/email-verification?email=`), and Hector checks it on production before friends join (H4). Google signs in on Neon's shared credentials on the test project: the button reaches Google's sign-in page, and a real Google sign-in is Hector's on a preview.
- **A9** (`src/entities/in-app-browser.ts`): each in-app browser's pattern is from UAParser.js's published list, with its link beside it, and a test per app. WhatsApp's, Telegram's, Slack's and iMessage's own web views that carry no marker can't be told apart, and aren't listed. The welcome page (and U10's and U19's link pages) show A9 in place of the ways in.
- Safari can't sign in on `http://localhost` (Neon Auth's cookies are always `Secure`), as in recipes: check iPhone Safari on a preview.

## Logging Rules

- Never call `console.*` directly. Use `ILoggerService` in server-side app code and the layers, and `lib/logger.ts` in root files that wrap `lib/auth/server.ts` (the auth route).
- Log error classes, codes and record ids, never a field's value, an error's message, a response body or a token: pass an error through `loggable(err)` (`src/entities/errors/loggable.ts`). The transaction manager, `BaseRepository.handleError` (record ids only), `toActionError`, `NeonAuthService` and the auth route do, each with a test that a fictional value never reaches the logs.
- The production build renames classes, and `loggable` names an error by its `name`, so each error class sets its own. Drizzle's `DrizzleQueryError` doesn't, so `src/infrastructure/drizzle-errors.ts` names it on its prototype; the repositories and the transaction manager import it. A library error that would log under a short made-up name gets the same.

## Environments

- Env names, in `.env.example` and `turbo.json`: `DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_COOKIE_SECRET`, `ADMIN_USER_ID`, `STORAGE_AWS_ENDPOINT_URL_S3`, `STORAGE_AWS_REGION`, `STORAGE_AWS_ACCESS_KEY_ID`, `STORAGE_AWS_SECRET_ACCESS_KEY` (Neon's quickstart names with `STORAGE_` in front, so they never mix with the `AWS_` variables a function's platform sets), `CRON_SECRET` (the token Vercel's schedule sends the daily run, KTD8; production only, set by Hector before U17 merges) and `LOG_LEVEL`. `turbo.json` also lists `VERCEL_ENV` for the migration check. Turborepo withholds from `next build` any variable `turbo.json` doesn't list.
- The local `.env` holds the Neon test project's values only: `community-game-library-test` (AWS US East, N. Virginia), whose database carries that name as its comment, with Neon Auth trusting localhost, its sign-up code check off, and both buckets. Its storage credential is "community-game-library local and previews" (U1, 2026-11-21). `ADMIN_USER_ID` is You's account (Robin Vale, the canvas's admin on E5), since U4 (2026-11-21).
- Vercel's Preview environment holds the same test project's values, entered through the Vercel connector when H7's project was made (2026-11-21): the pooled database, Neon Auth's address, a cookie secret of its own, You as `ADMIN_USER_ID`, and a storage credential of its own, "community-game-library previews", so the previews' key can be revoked without touching local work. Secrets are Vercel's sensitive type, so they can't be read back or renamed: to change one, make a new value and replace it, and to fix a name, add the variable again under the right one and delete the old (the API refuses a sensitive variable's new name, 2026-11-22).
- **The cast's accounts** (U4, 2026-11-21): each of the canvas's nine people has an account on the test project, `robin@example.com` for You and `<name>@example.com` for the rest, made through Neon Auth's sign-up behind the auth route, all with one generated password. `.cast-accounts.json` in this folder holds each member's email and user id and the password: gitignored, never committed, never copied into a doc, and meant for agents to sign in with on the dev server. Claude Code's auto-mode classifier refused reading the password into a session (2026-11-22), so a screen check signs in instead as a test account made through the app's sign-up and given friends on the test project, as U6 did with Kit Sample (`kit.u6@example.com`, Sam's and Alice's friend; its password isn't kept), while the screen tests cover what only You sees. The seed's `--as` takes its ids. The test project also has U2's shell account, `robin.u2-shell@example.com`, which isn't the cast's.
- The `.env` lives in the build's one worktree, which every batch keeps using (KTD20): `.worktreeinclude` copies `apps/*/.env` only from the main checkout, and agents can't read or copy a `.env`. The repo's settings deny reading `.env` files, and that covers the Write and Edit tools too, so an agent writes one with a shell heredoc (`umask 077; cat > .env <<'EOF'`), which reads nothing. A command that needs `.env` (the dev server, `db:migrate`, `scripts/check-test-database.ts`) runs outside Claude Code's sandbox, and nothing prints its values.
- `bun scripts/check-test-database.ts` (from this folder, outside the sandbox) stops unless `.env`'s database carries the test project's comment and its auth is on the same Neon endpoint. Run it before anything that writes to `.env`'s database from a terminal.
- Hector's rules of 2026-11-20:
  - **The test project.** Under KTD1's standing OK, agents write to the Neon test project without asking each time: migrations, the seed, its storage key, and each preview's address in Neon Auth's trusted domains. Production keeps Hector's OK at that moment.
  - **Test accounts.** The test project's sign-up code check is off, so agents make the fictional cast's accounts through the app's sign-up (through the auth route until U5's pages exist) and run the sign-in flows. Production keeps the code: H4 turns its check on before launch, since production's Neon Auth had it off when checked on 2026-11-21.
  - **Merging.** Each batch is one PR, which an agent merges itself once every check passes. Batches run one after another, each starting from main, in one worktree.
- Production: a Vercel project rooted at `apps/community-game-library`, with Skip deployment on and no Ignored Build Step, so `vercel.json` has no `ignoreCommand` (KTD20). Production's values live only in Vercel's Production environment, as sensitive variables, and never pass through a Claude session. A preview signs in only at its branch alias, once the test project's Neon Auth trusts it, and production only at communitygamelibrary.com, which H4 makes its Neon Auth's one trusted domain. Production's Neon project runs Postgres 18 (made 2026-11-21); the test project and PGlite run 17.
- Production gets its migrations with Hector's OK at that moment: from his terminal (`bun run db:migrate:production`, `scripts/migrate-production.ts`, which reads the URL from a hidden prompt and applies only when he types `migrate`), or through the Neon MCP when he asks, as job-search's Environments describe. The app's `build` runs `scripts/require-migrations.ts` before `next build`: on a production build (`VERCEL_ENV` is `production`) it fails while the journal holds a migration production hasn't recorded, and Vercel keeps the live deploy serving. Apply the migration, then redeploy. Preview and local builds skip it. A PR whose code needs a migration opens its description with it.
- Through the Neon MCP, as for Batch 1's `0000_all_tables` (2026-11-22), two things job-search's steps don't cover. A database's first migration also creates drizzle's own schema and table ahead of the record, as drizzle-orm 0.45's `migrate()` does (`CREATE SCHEMA IF NOT EXISTS "drizzle"`, then `"drizzle"."__drizzle_migrations"` with `id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint`). And before completing, compare the temporary branch's schema with the test project's, which `db:migrate` built from the same files: an md5 over `information_schema.columns`, each `pg_constraint` row's `pg_get_constraintdef` and `pg_indexes`, leaving out `contype = 'n'`, since Postgres 18 lists every NOT NULL as a constraint and 17 doesn't. Batch 1's matched at 223 items.
- Ports: `next dev` on 3102 (`.claude/launch.json`); the browser flows' own server on 3302 (U25).

## Testing

- `tests/` mirrors the source tree (`proxy.ts` → `tests/proxy.test.ts`); run tests from this folder so `bunfig.toml`'s preload applies.
- `tests/_support/preload.ts` runs before every test. It deletes the variables `.env` holds (all but `LOG_LEVEL`), so no test reaches the test project, points `@/db` at PGlite, swaps `@/lib/auth/server` for `tests/_support/neon-auth.ts` (its route handler records what reached Neon, and a test sets `neonAuth.answer` or `neonAuth.getSession` to make Neon fail, then calls `neonAuth.reset()`), makes `redirect()` throw `Redirected` and `notFound()` throw `NotFoundPage` (`tests/_support/next.ts`), lets `connection()` go on at once, and stubs `next/cache`, the router and `getCurrentUserId` (`nextState.userId`; `signInAsNewUser()` in `beforeEach`).
- Database: PGlite with the real migrations (`tests/_support/database.ts`), loading `pg_trgm` from PGlite's contrib, which the first migration needs. A test that makes a database of its own, as the migration scripts' tests do, makes it with `newPGlite()`; a bare `new PGlite()` fails on that first line. `resetDatabase()` in `beforeEach` migrates once, then empties every table in `public`, which it finds itself, so a new table needs no line there. `sql()` runs raw checks, never inside an open transaction. The transaction manager's tests write temporary tables of their own.
- Constraints are tested on PGlite alone (KTD22), in `tests/db/schema.test.ts`: each refusal by its Postgres code and constraint name (`{ code: "23514", constraint: "games_type_check" }`), so a test can't pass on another error. It also holds each model to its table: every table has one, its type is drizzle's row type (a difference fails `bun ts`), and it parses every row drizzle reads back. A new column goes in the table, its model and that test's filled rows together.
- Use-case tests use `describeEachBackend` and `makeApp()` (`tests/_support/app.ts`, recipes' harness): each runs on the mocks and on the real repositories over PGlite, and one that fails only on `[postgres]` means a mock has drifted from the SQL. Each unit adds its repositories and use cases there; `postgresRepositories()` is for a block that runs on PGlite alone. A repository no use case reads yet is tested the same way, through `makeApp().repos`, in `tests/src/infrastructure/repositories/`, with any check only the database can show (both rows of a friendship, a notice going with its failed change) in a block of its own (U4).
- A mock mirrors its SQL: the same filters, the same order (a timestamp, then the id), the table's defaults, and its refusals as `DatabaseOperationError` (a second profile, a friendship with oneself). A mock whose table has no writes yet takes its rows from the tests: `MockLoansRepository.rows` until Batch 4, `MockRemovedUsersRepository.userIds` (through `addRemovedUser`) until U22.
- **The cast** (`tests/_support/cast.ts`, KTD13) is the design kit's world on its today, Tue Nov 10, 2026 (`CAST_TODAY`): the nine people with their pieces and the boards' phones; the circle of six (You, Alice, Sam, Priya, Jo, Ben) all friends, with Mei and Dev Alice's friends and Noor Sam's; Sam's pass-along on; the 11 games and 2 expansions with the kit's facts (complexity from its weight: under 2 light, from 3 heavy); the 11 copies; and 15 loans, the open ones in the boards' states (Jo has your Gull & Anchor, a day overdue, and asked for more time; you have Sam's Moss & Mortar, due Fri) and the five that ended (B7's and C12's histories). Tests name rows by key (`CAST.people.you.id`, `CAST.copies.yourGullAndAnchor.id`, `CAST.loans.joHasGullAndAnchor.id`), whose ids are fixed (`00000000-…`) and no account's. `tests/src/infrastructure/repositories/loans.repository.test.ts` checks each copy reads back with its board's stamp.
- `makeApp().makeCast()` puts the cast in the current backend: its people (profiles, settings, friendships) through their repositories, `writeCastPeople`; on PGlite the games, copies, boxed expansions and loans through drizzle, `insertCastRows`; on the mocks the loans into `MockLoansRepository.rows`. A unit that gives a table its writes moves the cast's rows to them, and one that needs more of the boards' world (friend requests in U10, notices in U11, nights in U18) adds it to the cast with its writes. A row written through a repository is dated when it's written, so a friendship's "Friends since" (E3) reads the seed's month, not July.
- **The seed** (`scripts/seed.ts`, KTD21) writes the cast to `.env`'s database and stops unless it carries the test project's comment. A dry run by default; `--commit` writes, in one transaction; `--as <name>=<user id>` maps a member to their account (`.cast-accounts.json`), and the rest keep the cast's ids. It writes what's missing and skips what's there, so it's safe to run again, and a unit that extends the cast runs it again (Commands). Its test runs it on PGlite with the comment and without. U4 ran it on the test project on 2026-11-21, every member mapped.
- `RecordingLogger` (`tests/_support/logger.ts`) keeps every line logged, so a test can show a value never reached the logs.
- A page's test against its board signs in with `signInAsYouWithTheCast()` (`tests/_support/members.ts`), which puts the cast in the container's repositories once per file, and pins the clock to the kit's today with bun's `setSystemTime(new Date("2026-11-10T09:00:00-05:00"))`, reset after. Find a row within the render's own container (`within(view.container)`): `render`'s queries cover the whole document, earlier renders included. `makeApp().addGames()` and `addCopies()` add rows the cast doesn't have, such as a game with a popularity or a stranger's copy, until U7 and U9 give those tables their writes.
- Screen tests are `*.test.tsx`: `bunfig.toml` leaves them out of a plain `bun test`, `bun run test:screens` runs them in happy-dom (`tests/_support/dom.ts`), each file isolated, and `bun run test` runs both. Fire `submit` at a form, never a button: React builds the form's data from the event's target, which happy-dom can't do for a button. A link-styled `Button` (`nativeButton={false}`) has the button role: check its `href` through `closest("a")`. A link with `target="_blank"` opens a tab that happy-dom loads, so give it `about:blank`, not an outside address: recipes' `use-closes-on-leave` test fetched example.com on every run.
- The preload drops `ADMIN_USER_ID`, so a screen test of the admin's pages imports `tests/_support/as-admin.ts` first, which makes You the admin before the container reads it (U9). The use-case harness makes You the admin itself, as on the canvas's E5, and `app.noticesOf(userId)` reads what a member was told on either backend.
- `tests/_support/controller.ts` (`controllerBasics`, recipes') came with U5's first controllers: a controller test names its valid input, what the use case should receive and the inputs to reject. `tests/_support/focus.ts` (`focused()`) came with U2's dialog and sheet tests. `tests/_support/members.ts` signs a test in as a member with a profile (`signInAsMember`) through the container's own controllers, for page, action and gate tests: the container's mock repositories live for the whole run, so each test signs in as a new user.
- A Base UI switch or checkbox inside its own `<label>` flips twice on one click in happy-dom (U7, 2026-11-22), so its label sits beside it with `htmlFor`; Base UI gives the `id` to its hidden input, which the label then clicks (`SavedSwitch`, B7's expansions; [the lesson](../../docs/solutions/test-failures/base-ui-control-inside-its-label-flips-twice-in-happy-dom.md): Chromium and user-event flip it once). The visible control's own id is another, so a test names it through its `aria-labelledby` (U8's `nameOf` in the Library's page test). A Base UI toggle group's change inside a dialog renders a moment later: wait for what it changes (`findByRole`).
- Base UI's dialogs and sheets in happy-dom (U2): a dialog closes after its exit transition, so wait for it with `waitFor`, and poll absence as a boolean (`expect(view.queryByRole("dialog") === null).toBe(true)`): Bun prints a whole element when an expectation on one fails, which takes seconds and starves `waitFor`'s retries. `fireEvent.click` doesn't focus a button as a tap does, so focus the opener first to test where the cursor goes back. A sheet takes the phone's Drawer when `happyDOM.setInnerWidth(390)` (the window's `happyDOM`, cast). Sonner's toasts are global to a test file, so a toast from one test still shows in the next. next/image calls `onLoad` after the picture decodes, a moment after the load event.
- Fallow (`bun run dead-code`) counts test files as entry points, so a helper copied with its test is in use before any page needs it. The scripts are entry points in the root `.fallowrc.json` (`apps/community-game-library/scripts/*.ts`).
- The migration scripts' tests run on the real journal, with job-search's tests of a run that applies it: typing `migrate`, another answer stopping it, and a migration still unapplied afterwards.
- Browser flows (Playwright, on the test project, behind `scripts/check-test-database.ts`) come with U25.

## Commands

```bash
bun run --cwd apps/community-game-library dev --port 3102   # the dev server (.claude/launch.json's community-game-library)
bun run build --filter=community-game-library               # outside the sandbox, with placeholder auth values (Cache Components)
bun run --filter=community-game-library db:generate --name=<what>   # after editing db/schema.ts; read the SQL
bun run --filter=community-game-library db:migrate          # the test project (.env), outside the sandbox
cd apps/community-game-library && bun run db:migrate:production   # production, from Hector's own terminal only
cd apps/community-game-library && bun scripts/check-test-database.ts   # .env is the test project's
cd apps/community-game-library && bun scripts/seed.ts $(jq -r '.members | to_entries | map("--as \(.key)=\(.value.userId)") | join(" ")' .cast-accounts.json)   # the cast, a dry run; add --commit to write (outside the sandbox)
bun run test --filter=community-game-library                # both passes; or from this folder: bun test tests/proxy.test.ts
cd apps/community-game-library && bun run test:screens ./tests/app/_components/action-form.test.tsx   # one screen file
```

A local build, outside the sandbox: `DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder NEON_AUTH_BASE_URL=https://placeholder.example/neondb/auth NEON_AUTH_COOKIE_SECRET=<32 or more characters> bun run build --filter=community-game-library`. Values set on the command win over `.env`'s. `bun install` runs outside the sandbox too, which refuses Bun's temporary folder (2026-11-21).

## Before Finishing

```bash
bun check --filter=community-game-library && bun ts --filter=community-game-library
bun run dead-code
cd apps/community-game-library && bun run test
```

A unit with screens checks each one at 390 px beside its board, and again at 768 and 1280 px (the spec's Verification). A config change also runs the local build. To compare with a board, U2 copied the board's markup (its `<helmet>` and the `<x-dc>` body) into a page under `public/` and measured both with the browser's `getBoundingClientRect`, then deleted the copies. With the browser pane hidden, check in Playwright's headless browser instead (the Playwright MCP): a hidden pane runs the page in the background, where React's first Suspense reveal waits for an animation frame, so a streamed page stays on its skeleton (2026-11-22). Playwright hides the caret with an inline style, which the dev overlay then reports as a hydration mismatch on a text field; that one isn't the app's. The admin's screens need the signed-in test account to be the admin: `next dev` reads `.env.development.local` over `.env`, so a heredoc writing `ADMIN_USER_ID=<the test account's user id>` there, then a restart of the server, makes it the admin (U9, 2026-11-22). The permission rules let an agent write that file but not delete it, so ask Hector to delete it once the check is done.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
