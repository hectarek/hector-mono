# U11. The inbox, the counts and notice settings

| | |
|---|---|
| Batch | 3, Friends and the inbox (`feat/community-game-library-b3-friends`) |
| Model | Standard |
| After | U10 |
| Serves | R25, R26 (reading them), R27, R28, R33 (the Nights count), D14; KTD7 |

The bell opens an inbox of every notice, in plain words, each linking to its thing. Each tab counts what waits on the member there, and each member picks which notices they get. This unit words every notice type now, so Batches 4 and 5 only write them.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `F1-Inbox`, `F2-InboxEmpty`, `E7-Notices`, and the tab bar on any board for the counts. For the things notices name: `C2-AnswerRequest`, `C16-RequestSent`, `C17-LoanAccepted`, `C8-ConfirmReturn`, `C11-PassAlong`, `C13-MoreTimeAnswer`, `D2-Night`, `D10-Invite`, `G2-Suggestion`.
- [data-model.md](../data-model.md): notices, its types and groups, and `user_settings.notices_off`.
- [build-plan.md](../build-plan.md): R25 to R28, R33, D14; KTD7.

## Build

1. **Reads.** `INoticesRepository`: `listForUser` (newest first, joined to the loan, its copy and game, the night, the suggestion, the friend request, and `created_by`'s profile), `unreadCount` (without the groups switched off), and `markRead`.
2. **Words.** `app/_lib/notice-text.ts`, with one file per area in `app/_lib/notice-text/` (loans, nights, friends, suggestions), turns each of data-model.md's 31 types into its line and its link, using the code map's routes. An `answer_note` is quoted. The lines follow F1's style.
3. **The inbox** at `/inbox` (F1, and F2 when empty): it marks the member's notices read when it opens. The bell in the header shows the unread count.
4. **`get-tab-counts`** (KTD7), shown in the tab bar:
   - Loans: requests to answer (first in line on the member's copy, with the copy home); pick-ups to confirm in a pass-along (the member's `'accepted'` loan whose previous loan is `'passing'`); returns to confirm (`'returning'` loans of the member's copies); more-time requests to answer
   - Nights: invites by name (`'invited'` with `invited_by` set) on nights not cancelled or past
   - Friends: friend requests waiting for the member
5. **Notices I get (E7)** at `/you/notices`: the thirteen switches in E7's groups and order, each saved as it flips, with the morning-of-a-night reminder off to start. E5 gets its row.

## Not in this unit

Writing notices: each unit writes its own, through U4's `add`.

## Tests

- Table-driven: every type gives a line and a link.
- A group switched off is hidden from the inbox and the bell, and the tabs' counts don't change.
- Each tab's count, from cast fixtures in each state.
- Opening the inbox marks its notices read.
- Screens: F1, F2 and E7.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] F1, F2 and E7 match their boards at 390 px, and the counts show in the tab bar
- [ ] Committed as `feat(community-game-library): U11 the inbox, the counts and notice settings`
- [ ] Batch 3 is pushed and its PR opened
