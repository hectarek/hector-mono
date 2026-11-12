# U12. Ask and answer

| | |
|---|---|
| Batch | 4, Loans (`feat/community-game-library-b4-loans`) |
| Model | Strong: the first loan writes, with the copy's lock and the notices |
| After | Batch 3 merged |
| Serves | R16, R21 (withdrawing; the owner cancelling), R22 (requests), D4, AE7; KTD6, KTD7, KTD16 |

A member asks to borrow a friend's copy, with a note. The owner says yes for a period or no with a note, and either can call it off before the pick-up.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `C1-AskToBorrow`, `C16-RequestSent`, `C2-AnswerRequest`, `C17-LoanAccepted`, `C4-Loans`, `X1-DatePicker`, and `B5-Game` and `B13-GameStates` for Borrow on a copy's row.
- [screens.md](../screens.md): After each action, Send a borrow request, Withdraw a request, The owner says yes, The owner says no; Actions that ask first, Withdraw a request and The owner cancels a loan before pick-up; Waiting on someone, the first two rows; Empty lists, Loans; When something goes wrong, Something changed underneath.
- [data-model.md](../data-model.md): loans (`'requested'`, `'accepted'`, `'declined'`, `'withdrawn'`, `'cancelled'`) and the notice types this unit writes.
- [build-plan.md](../build-plan.md): R16, R21, R22, D4, AE7; KTD6, KTD7, KTD16.
- Batch 5 runs beside this one: follow the code map's rule for `di/container.ts`, `di/types.ts`, the code map and `AGENTS.md`.

## Build

1. **Writes.** `ILoansRepository`: `create`, `lockCopy(userGameId, tx)` (`select … for update` on `user_games`), and `update`. Every loan write in Batch 4 locks the copy first (KTD6).
2. **Use cases:**
   - `request-loan`: a friend's lendable copy, not one's own, with no open loan by this borrower on it, and an optional note. On a copy that's home with nobody ahead, the owner answers it now; otherwise it waits in line, which U15 offers as Join the line through this same use case.
   - `withdraw-request`: the borrower, while `'requested'`
   - `answer-request`: the owner only, on the first request in line while the copy is home. Yes takes 1 week, 2 weeks or a month (`period_days` 7, 14 or 30), or a picked date (`due_on`). No takes an optional note, kept as the notice's `answer_note`.
   - `cancel-loan`: an `'accepted'` loan before its pick-up, by the owner here (C17) or the borrower (U13's C3)
   - `list-loans`: C4's request sections, "Asked you" and "You asked"
   - `get-loan`: what the borrower or the owner may see, and Not found for anyone else
3. **Pages and sheets:**
   - Ask to borrow (C1) is a sheet on the game's page; copy rows that are available get Borrow
   - `/loans/[id]` shows C16 to the borrower while it's requested, C2 to the owner while it's requested, and C17 to the owner once it's accepted ("Priya hasn't picked it up yet", with Cancel the loan; U13 adds "Priya has it")
   - `/loans` (C4) with its request sections, and the Loans empty state
4. **Changes underneath (KTD16):** `'copy-lent'` when another request was said yes to first (its next action is Join the line), `'request-withdrawn'` when the owner answers a request just withdrawn, and `'request-answered'` when it was already answered.
5. **Notices:** `loan-requested` and `request-withdrawn` to the owner; `request-accepted` and `request-declined` (with the note) to the borrower; `loan-cancelled` to the other side.

## Not in this unit

The pick-up and the return (U13). Lines (U15). More time (U14). Recording a loan (U16).

## Tests

- AE7: anyone but the owner, the admin included, is refused when answering.
- Two answers at once: one lands, and the other gets `ChangedError` (the lock).
- A withdrawn request can't be answered; a borrower can't have two open requests on one copy.
- A picked date sets `due_on`; a period sets `period_days`.
- Each use case writes its notices.
- Screens: each After each action row above, both dialogs, and the Loans empty state.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] C1, C16, C2, C17 and C4 match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U12 ask and answer`
