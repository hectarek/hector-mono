# U13. Pick-up and return

| | |
|---|---|
| Batch | 4, Loans (`feat/community-game-library-b4-loans`) |
| Model | Strong: the dates and D15's generous return |
| After | U12 |
| Serves | R18, R19, R22 (loans out), R23 (a copy's history), D5, D15; KTD6 |

The borrower confirms the pick-up and its day, and the loan runs with its track and due date. The borrower gives it back with the day, and the owner confirms it, or says they don't have it yet. A loan given back can't run overdue (D15).

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `C3-ConfirmHandoff`, `C5-LoanBorrowed`, `C7-LoanLent`, `C8-ConfirmReturn`, `C4-Loans`, `B7-Copy` (where it is, and its history), `X1-DatePicker`.
- [screens.md](../screens.md): After each action, "I've picked it up" or the owner's "Priya has it", "I gave it back to Sam", the owner's "Yes, it's back" and "I don't have it yet"; Waiting on someone, the pick-up and the return rows; Actions that ask first, "I can't pick it up after all"; When something goes wrong, a day before the pick-up.
- [data-model.md](../data-model.md): loans' dates, statuses and D15's week.
- [build-plan.md](../build-plan.md): R18 (with its audit line), R19, R22, R23, D5, D15; KTD6.

## Build

1. **Use cases**, each taking the copy's lock:
   - `confirm-pick-up`: the borrower, or the owner's "Priya has it" (R18's audit line), with the day: today or an earlier day, not before the yes. The loan goes `'out'`, with `due_on` as the day plus `period_days`, or the picked date, whose `period_days` it now sets.
   - `give-back`: the borrower, with the day (from the pick-up to today). The loan goes `'returning'` and can't run overdue from then on.
   - `confirm-return`: the owner. "Yes, it's back" takes the day (the borrower's to start) and any new missing or damaged part, added to the copy's `condition_note`, and the loan is `'returned'`. "I don't have it yet" sends it back to `'out'`.
   - The owner can also mark a loan that's out as returned without waiting, with the day.
   - The borrower's "I can't pick it up after all" on C3 uses U12's `cancel-loan`.
2. **Pages**, on `/loans/[id]`: C3 for the borrower once it's accepted (the owner's name and phone for arranging the pick-up), C5 and C7 for the borrower and the owner while it's out, with the `track`, and Is it back? (C8) as the owner's sheet while it's returning.
3. **Loans (C4)** gains its borrowed and lent sections, overdue first (R22). B7's where it is and history now show the loans.
4. **When a loan ends** and someone is in the copy's line, the owner is asked to answer the next request (After each action, the owner's "Yes, it's back"). U15 sends that person their `turn-in-line`.
5. **Notices:** `return-to-confirm` to the owner; `return-not-confirmed` to the borrower. The daily run (U17) closes a return left a week.

## Not in this unit

More time, due dates and calling back (U14). Passing it along (U15). The daily run's reminders and closing (U17).

## Tests

- Due dates: a period from the pick-up day, a month as 30 days, and a picked date.
- A pick-up day after today, or before the yes, is refused, and the date sheet switches those days off.
- A loan that's returning is never overdue (D15).
- `confirm-return` adds to the copy's note; "I don't have it yet" puts the loan back out.
- Only the owner confirms, and only the borrower gives back.
- Screens: each After each action row above, and C4's sections in order.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] C3, C5, C7, C8, C4 and B7 match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U13 pick-up and return`
