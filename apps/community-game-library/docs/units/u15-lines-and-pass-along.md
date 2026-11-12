# U15. Lines and passing it along

| | |
|---|---|
| Batch | 4, Loans (`feat/community-game-library-b4-loans`) |
| Model | Strong: the line's order and the pass-along chain |
| After | U13. Build it after U14, so the batch's branch stays linear |
| Serves | R21 (leaving a line, declining someone in it), R24, R48, AE9, AE10, D15; KTD6 |

A friend joins the line for a copy that's out. With pass-along on, the borrower hands it to the next friend, who confirms; with it off, it comes back to the owner first.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `C10-JoinLine`, `C11-PassAlong`, `C4-Loans` (In line), `B5-Game` and `B13-GameStates` (2nd in line, Leave the line), `B7-Copy` (its pass-along switch).
- [screens.md](../screens.md): After each action, Join a line, "I gave it to Jo", The next person confirms a pass-along; Actions that ask first, Leave a line and Take someone out of a line; Waiting on someone, the next person to confirm a pass-along.
- [data-model.md](../data-model.md): loans, the line, `'passing'`, `'passed-along'` and the chain.
- [build-plan.md](../build-plan.md): R21, R24, R48 (with its audit line), AE9, AE10, D15; KTD6.

## Build

1. **The line**, with use cases that take the copy's lock:
   - joining is U12's `request-loan` on a copy that's out or promised. Only the owner's friends can join (R48).
   - C10 is a sheet on the game's page, with a note for the owner, the order ("Jo, then you"), and "Sam's copy is available. Borrow that instead" when another copy is
   - leaving the line is `withdraw-request`, after the dialog
   - `remove-from-line`: the owner declines someone in the line, after the dialog, with an optional note kept as the notice's `answer_note`
   - a copy's rows and Loans show "1st in line" and "You, 2nd", from `lineOf`
2. **Passing it along**, only on a copy with `pass_along` on, someone in line, and the loan not called back:
   - `pass-along` (C11): the giver's loan goes `'passing'`, and the first request in line goes `'accepted'`, with `previous_loan_id` and the giver's `period_days`. Both see each other's name, and the phone if there is one (R48).
   - `confirm-pass-along`: the next friend says they have it, with the day. Their loan is `'out'` from that day for the same period, and the giver's is `'passed-along'` with that day as `returned_on`.
   - `take-back-pass-along`: the giver's "I still have it" puts both back
   - a loan that's passing can't run overdue (D15)
3. **With pass-along off** (AE10), the borrower who's done is asked to give it back to the owner, and the friend's request waits for the owner's answer after the return.
4. **Whose turn.** When a request becomes first in a copy's line, because the one ahead was withdrawn, declined or finished, that friend gets `turn-in-line`. U12's and U13's moves call the same helper.
5. **Notices:** `line-joined` and `passed-along` to the owner; `turn-in-line`, `pass-along-to-confirm`, `pass-along-taken-back` and `request-declined` (with the note, when taken out of a line) to the friends in line.

## Not in this unit

The daily run (U17).

## Tests

- AE9: on a two-week loan with pass-along on, the next friend confirms on day 10; the first loan ends, the new one is due two weeks from that day, and the owner is told who has it.
- AE10: with pass-along off, the borrower is asked to give it back, and the friend's request waits for the owner.
- "I still have it" puts both loans back; a passing loan is never overdue.
- The line keeps the order people asked in; someone who isn't the owner's friend can't join.
- Screens: each After each action row above, and both dialogs.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] C10, C11 and the line's rows on B5, B13 and C4 match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U15 lines and passing it along`
