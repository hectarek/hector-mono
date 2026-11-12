# Community Game Library: data model

Updated 2026-11-12. Hector confirmed the catalog's tables on 2026-11-12. The rest (members, friends, loans, game nights and notices) were added the same day for his review, under the same rules.

Every table the first release needs, holding only the values the drawn screens and the spec use. Where the catalog's values come from is not decided; the findings are in [catalog-data.md](catalog-data.md). U3 creates all of them in one migration ([build-plan.md](build-plan.md), KTD5). The requirement and decision numbers (R, D, KTD) are build-plan.md's, and screen codes such as B5 are the design canvas's ([screens.md](screens.md)).

## Naming rules

These are the conventions a professional Postgres schema commonly follows; the recipes app's schema follows them too. Every table here, and every table added later, keeps them. Rules 14 and 15, and the second sentences of rules 2, 4, 7, 9 and 10, were added with the rest of the model on 2026-11-12, for Hector's review.

1. A table's name is plural and snake_case. A table of things that belong to another is named for the owner, singular, then the things, plural: `user_games`, `user_game_expansions`, `game_suggestions`, `game_night_votes`.
2. A table that holds things has an `id` (uuid), `created_at` and `updated_at` (timestamptz, set by the database). A table that pairs two things is keyed by the pair, with timestamps only where a screen or a rule reads them, and a table of one row per user is keyed by `user_id`.
3. A foreign key is the table's name, singular, plus `_id`: `game_id`, `user_game_id`. When a table points at its own rows, the role goes first: `base_game_id`, `previous_loan_id`.
4. A member is a user. Whose row it is goes in `user_id`, and who made it in `created_by`; both hold the user's id from Neon Auth. Any other user a row names takes their role before `user_id`: `borrower_user_id`, `friend_user_id`, `recipient_user_id`.
5. A column's name is singular unless it holds a list, and a list is an array: `designers`, `publishers`, `categories`, `best_players`. A unit keeps its plural: `min_players`, `max_minutes`, `period_days`.
6. A link ends in `_url` and is named for what it points at: `image_url`, `video_url`, `source_url`.
7. A value from a fixed set is text, typed as a union and held to it by a check. Its values are lowercase, hyphenated and readable on their own (`'base-game'`, `'like-new'`, `'already-here'`). The column that says what sort of row it is is `type`, and the one that says where a row stands in its life is `status`.
8. A yes-or-no is a plain word with no `is_`: `lendable`, `pass_along`, `guests_allowed`.
9. When something happened is `<verb>_at`, and who did it `<verb>_by`: `answered_at`, `created_by`, `invited_by`. A day with no time of day is `<verb>_on`: `picked_up_on`, `returned_on`, `due_on`.
10. A free-text note is named for what it's about and ends in `_note`: `condition_note`, `decline_note`, `request_note`. A note shown only in the notice it came with is kept on the notice, as `answer_note`.
11. A lower or upper bound is `min_` or `max_` before what it measures: `min_players`, `max_minutes`, `min_age`.
12. Each value lives in one place. A history table is kept only when something reads the history.
13. No column holds an outside source's own id until a source is chosen; the id comes with the source. A value any source could fill, such as `popularity`, is fine.
14. A file the app keeps private is stored by its key in object storage, ending in `_key` (`photo_key`), and shown through a short-lived signed address. A file any signed-in member may see is stored by its address, ending in `_url` (`image_url`).
15. A column kept only so a search is fast starts with `search_`: `search_title`.

---

## The catalog

Confirmed by Hector on 2026-11-12, apart from `search_title`, which the technical half added for search (KTD10).

### games

One row per game or expansion.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `type` | text: `'base-game' \| 'expansion'` | yes, default `'base-game'` | Search ("2021 · expansion") | R1 |
| `base_game_id` | uuid → `games` | only on an expansion | The game's page (Expansions); the expansions in a copy's box | R1, R8 |
| `title` | text | yes | Everywhere | R1 |
| `search_title` | text | yes, written by the app | Not shown. Search matches it (R2) | R2, KTD10 |
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

A check keeps `base_game_id` set exactly when `type` is `'expansion'`. What should we play?'s fourth choice, "New players", isn't stored: it picks light games (R37).

`search_title` is the title in lower case, without accents, punctuation or a leading "the", "a" or "an". The app writes it whenever it writes the title (`src/entities/search-title.ts`), and a trigram index on it serves search (KTD10). It isn't a generated column, since Postgres's accent-stripping function can't be used in one.

Only `type` and `title` are required, since a game can be known by its title before its details are. A screen shows a value only when the game has it: no line, fact, inked die or filter appears for a value that's missing (Hector, 2026-11-12). Rows, filters and suggestions lean on players and play time, so a game in someone's library should have those.

Credits for outside data are shown once per source, at the foot of a game's page and of search results, and on About the catalog (Y1). Which credit shows is settled with the source.

### user_games

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

My library's switch (B6) sets `pass_along` on every copy the user owns, and is their default for copies added later: `user_settings.default_pass_along`, below.

### user_game_expansions

The expansions in a copy's box.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `user_game_id` | uuid → `user_games` | yes | | R8 |
| `game_id` | uuid → `games` | yes | The copy's page ("Expansions in the box"), the copy rows on the game's page ("with Night Tide") | R8 |

Its key is the pair. The expansion's `base_game_id` is the copy's game.

`base_game_id` can't stand in for this table: it says which expansions a game has, not which ones a user owns. Storing an owned expansion as its own `user_games` row would make every list, count and loan of copies skip those rows, give them a condition and switches that mean nothing, and lose which of two copies holds it. Hector agreed to keep the table on 2026-11-12.

### game_suggestions

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

---

## Members

### user_profiles

One row per member, made when they set up their profile (A4). It's what their friends see of them.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `user_id` | uuid | yes, the key | | |
| `name` | text | yes | Everywhere a person is named | R40 |
| `piece_shape` | text: `'pawn' \| 'cone' \| 'house' \| 'ship'` | yes | Everywhere a person appears | R51 |
| `piece_color` | text: `'brick' \| 'pumpkin' \| 'mustard' \| 'moss' \| 'teal' \| 'ocean' \| 'plum' \| 'rose' \| 'charcoal' \| 'bone'` | yes | The same | R51 |
| `phone` | text | no | A friend's page (E3), the pick-up page (C3), a pass-along's handoff | R40, R48 |
| `photo_key` | text | no | The member's own page (E5) and their page for friends (E3) | R40 |
| `created_at`, `updated_at` | timestamptz | yes | | |

The name the app shows is this one. Neon Auth's own name is only the starting value at sign-up: the Google account's name, or what was typed. Two friends can have the same piece (A4: "Two friends can share a piece"), so nothing about a piece is unique. A member who has signed in but has no row yet is sent to set up their profile.

The phone and the photo are shown only to the member's friends and to the other person in a loan or a pass-along (R40, KTD4). The photo lives in the private bucket (rule 14, KTD11).

### user_settings

One row per member, made with their profile.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `user_id` | uuid | yes, the key | | |
| `default_pass_along` | boolean | yes, default `false` | My library's switch (B6); copied to each copy added later | R48 |
| `notices_off` | text[] of notice groups (Notices, below) | yes, default `{night-mornings}` | Notices I get (E7) | R28 |
| `created_at`, `updated_at` | timestamptz | yes | | |

A group in `notices_off` is hidden from the inbox and from the bell's count. Its notices are still written, and the tabs' counts don't change (E7: "the red counts on the tabs stay"). Every group starts on except the morning-of-a-night reminder, as E7 draws them.

### removed_users

An account the admin removed (G8).

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `user_id` | uuid | yes, the key | | R41 |
| `removed_at` | timestamptz | yes | | R41 |

The member's rows go as a deleted account's do (below). This row stays, so the account can't come back: a session whose user is here sees only that the account was removed. A member who deletes their own account leaves no row here.

---

## Friends

### friendships

Two rows per friendship, one from each side, made and removed together, so a member's friends are one lookup.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `user_id` | uuid | yes | | R10, R49 |
| `friend_user_id` | uuid | yes | Friends (E1), a friend's page (E3), everything a friend shares | R10, R49 |
| `created_at` | timestamptz | yes | "Friends since Jul 2026" (E3) | R49 |

Its key is the pair, and a check keeps the two ids apart. Who sees what follows these rows (D10, KTD4).

### friend_requests

A one-tap request to a friend's friend or to someone from a night (R49).

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `created_by` | uuid | yes | The request on Friends (E1) | R49 |
| `recipient_user_id` | uuid | yes | | R49 |
| `status` | text: `'waiting' \| 'declined'` | yes, default `'waiting'` | | R49 |
| `created_at`, `updated_at` | timestamptz | yes | | |

Accepting makes the friendship and deletes the request. Declining keeps it as `'declined'`: the recipient stops seeing it, and the sender still sees "You asked", so they aren't told (R49). The sender's Cancel request deletes it. There's one request per pair of people, either way round. People you may know (friends' friends, people from a night you went to) are worked out when Friends is read, not stored.

### friend_links

Each member's friend link (R49, E2).

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `user_id` | uuid | yes, the key | | R49 |
| `token` | text | yes, unique | Your friend link (E2) | R49 |
| `expires_at` | timestamptz | yes | The same | R49 |
| `created_at`, `updated_at` | timestamptz | yes | | |

There's one live link per member: making a new one replaces the token and the date, so the old link stops working. A link lasts a week (R49). A token is the code E2 draws: 8 random characters in two groups of four (`K7Q2-HARB`), from Crockford's base 32, which has no look-alike characters. The link is `communitygamelibrary.com/f/<token>`.

---

## Loans

### loans

One row per loan of a copy, from the request to its end. A copy's line is its open requests, oldest first (R24). A pass-along is a chain: each loan is its own row, pointing at the one it followed, so history and reminders stay per borrower.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `user_game_id` | uuid → `user_games` | yes | | R16 |
| `borrower_user_id` | uuid | yes | Every loan's row and page | R16 |
| `previous_loan_id` | uuid → `loans` | only in a pass-along | The copy's history (B7) and past loans (C12) | R23, R48 |
| `status` | text, below | yes, default `'requested'` | Every stamp and page about the loan | R16 to R24, R48 |
| `request_note` | text | no | The request (C2), the line (C10) | R16, R24 |
| `period_days` | integer | once accepted for 1 week, 2 weeks or a month; at the pick-up for a picked date | | R16, D5, R48 |
| `due_on` | date | once picked up, or once accepted for a picked date | Due lines and the track (C5, C7) | R16, R18, R20 |
| `picked_up_on` | date | once picked up | The track, the history | R18 |
| `returned_on` | date | once given back or handed on | The history, Is it back? (C8) | R19, R48 |
| `more_time_due_on` | date | while a request for more time waits | The answer (C13) | R20 |
| `more_time_note` | text | no | The same | R20 |
| `more_time_asked_at` | timestamptz | while a request for more time waits | | R20 |
| `called_back_at` | timestamptz | once called back | "Called back" (C15, C18) | R20 |
| `answered_at` | timestamptz | once the owner said yes or no | | R16 |
| `created_at`, `updated_at` | timestamptz | yes | | |

**Statuses.** A loan is in one at a time, and moves only as the table shows. `src/entities/loan.ts` holds the moves and who may make each (KTD6).

| Status | It means | It can move to |
|---|---|---|
| `'requested'` | Asked for. It's the owner's to answer when it's first in the copy's line and the copy is home; otherwise it waits in line | `'accepted'`, `'declined'`, `'withdrawn'` |
| `'accepted'` | The owner said yes, or their pass-along switch said yes in advance; waiting for the pick-up | `'out'`, `'cancelled'`, `'requested'` (a pass-along taken back) |
| `'out'` | Picked up and running | `'returning'`, `'passing'`, `'returned'` |
| `'returning'` | The borrower gave it back on `returned_on`; waiting for the owner | `'returned'`, `'out'` ("I don't have it yet") |
| `'passing'` | Handed to the next friend in line; waiting for them to confirm | `'passed-along'`, `'out'` ("I still have it") |
| `'returned'` | Back with its owner | |
| `'passed-along'` | The next friend confirmed they have it | |
| `'declined'` | The owner said no, or took the request out of the line | |
| `'withdrawn'` | The borrower withdrew it or left the line | |
| `'cancelled'` | Called off after a yes and before the pick-up, by either side | |

**Dates.** A week is 7 days, two weeks 14, and a month 30. The due date is the pick-up day plus `period_days`. A picked date sets `due_on` when the owner says yes, and `period_days` becomes the days from the pick-up to it, so a pass-along's next loan can copy it (R48). A request for more time holds the date asked for until the owner answers; a yes moves `due_on` to it or to the owner's date, and either answer clears the three `more_time_` columns.

**Overdue isn't stored.** A loan is overdue when it's `'out'` and today, in Eastern time, is past `due_on`. A `'returning'` or `'passing'` loan never is (D15).

**A pass-along.** The giver's loan moves to `'passing'`, and the first request in the copy's line moves to `'accepted'`, with `previous_loan_id` and the giver's `period_days`. When that friend confirms the pick-up, their loan is `'out'` from that day, and the giver's becomes `'passed-along'` with that day as `returned_on`. "I still have it" puts both back.

**A call-back** sets `called_back_at`, makes `due_on` today if it was later, clears a waiting request for more time, and ends any pass-along: the loan can only come back to its owner (R20).

**D15's week.** A `'returning'` loan the owner hasn't answered 7 days after `returned_on` becomes `'returned'`, on `returned_on`, in the daily run (KTD8).

The database holds three of these: at most one loan per copy holds it (`'out'`, `'returning'` or `'passing'`), at most one waits for its pick-up (`'accepted'`), and a borrower has at most one open loan per copy (`'requested'` to `'passing'`), each a partial unique index. A check keeps `picked_up_on` and `due_on` set for every status from `'out'` on.

The owner's note when they say no, or take someone out of the line, is shown only in the borrower's notice, so it's that notice's `answer_note` (rule 10). The same goes for the owner's note on a more-time answer.

---

## Game nights

### game_nights

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `created_by` | uuid | yes | "Alice is hosting" | R29 |
| `title` | text | yes | Everywhere | R29 |
| `starts_at` | timestamptz | yes | Everywhere | R29 |
| `ends_at` | timestamptz | no | The night's page | R29 |
| `place` | text | yes | The night's page and its card, for people who can see the night | R29, R36 |
| `address` | text | no | The night's page, for people who can see the night | R29, R36 |
| `host_note` | text | no | The night's page | R29 |
| `capacity` | integer | yes | Seats (D2, D4) | R29, R31 |
| `audience` | text: `'friends' \| 'invited'` | yes, default `'friends'` | Who sees it (D5) | R30, D10 |
| `attendees_can_invite` | boolean | yes, default `false` | "People going can invite others" (D5) | R30 |
| `guests_allowed` | boolean | yes, default `false` | "People can bring guests" (D5) | R47 |
| `link_token` | text | no, unique | The night's link (D10, D14) | R30 |
| `cancelled_at` | timestamptz | once cancelled | "Cancelled" under past nights (D12) | R34 |
| `created_at`, `updated_at` | timestamptz | yes | | |

The host is `created_by`. The capacity counts the host and every guest, and a check keeps it above zero; another keeps `ends_at` after `starts_at`. `audience` is where the night is shared (D10): `'friends'` shows it to the host's friends, `'invited'` only to people invited by name or by the link. A group, later, is another value. A new link replaces `link_token`, so the old one stops working (R30). Its token takes the friend link's form (`7QK2-MARR`, D7 and D10), and the link is `communitygamelibrary.com/n/<token>`. The signed-out link page (D14) shows the title, the date and the seats, never the place or the address.

### game_night_attendees

One row per member on a night's list: the host, anyone invited, and anyone who answered.

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `game_night_id` | uuid → `game_nights` | yes | | |
| `user_id` | uuid | yes | The night's seats and lists | R31 |
| `status` | text: `'invited' \| 'going' \| 'maybe' \| 'cant-go' \| 'waitlisted'` | yes | Stamps and seats (D2, D4, D13) | R31 |
| `guest_count` | integer | yes, default `0` | "5 going + 1 guest" | R47 |
| `invited_by` | uuid | when invited by name | Invite people (D10); the Nights tab's count | R30, R33 |
| `waitlisted_at` | timestamptz | while waitlisted | The waitlist's order | R31 |
| `created_at`, `updated_at` | timestamptz | yes | | |

Its key is the pair. The host's row is made with the night, as going. The seats taken are 1 plus `guest_count` for each `'going'` row, and never pass the capacity. When seats open, the earliest waitlisted member whose 1 plus `guest_count` fits moves to `'going'` and is told (R31, AE4).

Someone who opens a night's link gets a row as `'invited'` with no `invited_by`, so the night stays theirs to see. Only an invite by name counts on their Nights tab (R33).

### game_night_games

The games on the table: copies the host or someone going will bring (R29, R32).

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `game_night_id` | uuid → `game_nights` | yes | | R29 |
| `user_game_id` | uuid → `user_games` | yes | "Sam brings it" (D2) | R29, R32 |
| `created_at` | timestamptz | yes | The list's order before any votes | |

Its key is the pair. A copy can be on a night's table only while its owner hosts or is going. When they stop going, their games leave the table, with their votes (Claude's rule). Removing a copy (B14) takes it off every night.

### game_night_votes

Who'd play each game on the table (R38: "I'd play").

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `game_night_id`, `user_game_id` | uuid → `game_night_games` | yes | | R38 |
| `user_id` | uuid | yes | "3 want to play"; "You'd play" | R38 |

Its key is the three. Only members going vote (D2: "Answer to say what you'd play"), and a member's votes go when they stop going.

---

## Notices

### notices

One row per person told (R25 to R27).

| Column | Type | Required | Shown on | Spec |
|---|---|---|---|---|
| `id` | uuid | yes | | |
| `user_id` | uuid | yes | The inbox (F1) | R27 |
| `type` | text, below | yes | The line's words and where it links | R25, R26 |
| `created_by` | uuid | no | "Sam said yes" | |
| `loan_id` | uuid → `loans` | for a loan's notice | It links to the loan | |
| `game_night_id` | uuid → `game_nights` | for a night's notice | It links to the night | |
| `game_suggestion_id` | uuid → `game_suggestions` | for a suggestion's notice | It links to the game, or the admin's suggestion | |
| `friend_request_id` | uuid → `friend_requests` | for a friend request | It links to Friends | |
| `answer_note` | text | no | Quoted in the line | R16, R20, R21 |
| `reminded_on` | date | for a reminder | | R25 |
| `read_at` | timestamptz | once seen | The bell's count | R27 |
| `created_at`, `updated_at` | timestamptz | yes | The inbox's dates | |

A notice is written by the change that causes it, in the same transaction (KTD7). Its words come from its type and the rows it points at, when it's read (`app/_lib/notice-text.ts`); only a note a member typed is kept on it. It points at one thing, links to that thing's page, and goes when that thing goes. A reminder (the daily run, KTD8) has no `created_by` and carries the day it's for, and a unique index on `user_id`, `type`, the loan or night, and `reminded_on` lets each be written once.

**Types.** Each belongs to one of Notices I get's groups (E7), or to none, and then it always shows. Two are Claude's additions, marked, so a member isn't left wondering.

| Type | Who's told | Group (E7) | Spec |
|---|---|---|---|
| `loan-requested` | The owner | `requests-on-my-games` | R26 |
| `line-joined` | The owner | `line-updates` | R26 |
| `request-withdrawn` | The owner | none | R21 |
| `request-accepted` | The borrower | `answers-to-my-requests` | R26 |
| `request-declined` | The borrower, also when taken out of a line, with the owner's note | `answers-to-my-requests` | R16, R21 |
| `turn-in-line` | The friend who's now first in a line | `line-updates` | R26 |
| `loan-cancelled` | The other side, when a loan is called off before the pick-up | none | R21 |
| `loan-recorded` | The borrower of a loan the owner recorded | none | R17 |
| `return-to-confirm` | The owner | `pick-ups-and-returns` | R26 |
| `return-not-confirmed` | The borrower, after "I don't have it yet" | none | R19 |
| `return-closed` | The owner, when a return closes by itself (Claude's addition) | none | D15 |
| `pass-along-to-confirm` | The next friend in line | `pick-ups-and-returns` | R26 |
| `pass-along-taken-back` | The next friend, after "I still have it" (Claude's addition) | none | R48 |
| `passed-along` | The owner, told who has it now | none | R48 |
| `more-time-asked` | The owner | `more-time-requests` | R26 |
| `more-time-answered` | The borrower, with the owner's note | `more-time-requests` | R26 |
| `due-date-changed` | The borrower | none | R20 |
| `called-back` | The borrower | none | R20 |
| `due-soon` | The borrower, two days before | `due-date-reminders` | R25 |
| `due-today` | The borrower, the morning it's due | `due-date-reminders` | R25 |
| `due-back-today` | The owner, the day it's due back | `due-date-reminders` | R25 |
| `overdue` | Both, the day after it's due and every three days after | `overdue-reminders` | R25 |
| `friend-request` | The recipient | `friend-requests` | R26 |
| `night-invite` | The member invited by name | `night-invites` | R26 |
| `night-changed` | Everyone going | `night-changes` | R34 |
| `night-cancelled` | Everyone going, invited or waitlisted | `night-changes` | R34 |
| `waitlist-seat` | The member moved from the waitlist to going | `waitlist-seats` | R31 |
| `removed-from-waitlist` | The member the host took off the waitlist | none | R31 |
| `night-today` | Everyone going, the morning of the night | `night-mornings` (off to start) | R26 |
| `suggestion-answered` | The member who suggested it | `suggestion-answers` | R4 |
| `suggestion-arrived` | The admin | none | R26 |

The groups, in E7's order: `due-date-reminders`, `overdue-reminders`, `requests-on-my-games`, `answers-to-my-requests`, `line-updates` (E7's "The line"), `pick-ups-and-returns`, `more-time-requests`, `friend-requests`, `night-invites`, `night-changes`, `waitlist-seats`, `night-mornings`, `suggestion-answers`.

The tabs' counts (D14) aren't notices. Each counts what waits on the member there, read from the rows above (KTD7).

---

## What goes with a copy or an account

- **Removing a copy** (B14, refused while it's out, AE2) deletes its expansions, its loans with their notices, and its place on nights' tables with their votes. The dialog says its loan history goes with it.
- **Deleting an account** (R41, E8 and E9, once no loan of theirs is open) deletes their copies as above, ends their requests and places in line with no notices, cancels the nights they host and tells everyone going, invited or waitlisted, and deletes their friendships (both rows), friend requests either way, friend link, places on others' nights with their votes, settings, profile, photo and notices. Their Neon Auth user is deleted too (U22 confirms how). Kept: their past loans of other members' copies, which show them as "A former member", the notices others got about them, and their suggestions, which are catalog work.
- **The admin's removal** (G8) does the same and adds a `removed_users` row.

---

## Not in the model

Hector reviewed the first draft on 2026-11-12, asked for names that follow one pattern, and confirmed the catalog's tables. The rows below the line came with the rest of the model.

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
| A copy's audience | Every copy is shared with friends. A group, later, adds `user_games.audience` defaulting to `'friends'` (D10) | None |
| Who called off or declined a loan | The notice says it at the time (rule 12) | None |
| A notice's words | Made from its type when it's read | None |
| A phone's push subscription | Push is a later phase (D9) | None |
| A night's calendar entry | The calendar file is made when it's downloaded (R35) | None |
| Plays, scores and stats | Outside the first release (scope) | None |
