# U16. Recording a loan, and past loans

| | |
|---|---|
| Batch | 4, Loans (`feat/community-game-library-b4-loans`) |
| Model | Standard |
| After | U13. Build it after U15, so the batch's branch stays linear |
| Serves | R17 (with its audit line), R23; KTD6 |

An owner records a loan made in person, and each member sees their past loans.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `C9-RecordLoan`, `C12-History`, `C4-Loans` (Record a loan), `B7-Copy` (its history).
- [screens.md](../screens.md): After each action, Record a loan; Empty lists, Loans and Past loans.
- [build-plan.md](../build-plan.md): R17, R23; KTD6.

## Build

1. **`record-loan`** (C9 at `/loans/record`): the owner picks a lendable copy of theirs that's home, a friend (the people picker), the pick-up day (today or earlier) and the period. The loan starts `'out'` from that day, and the borrower is told and doesn't confirm.
2. **"Record a loan"** on C4 and in the Loans empty state.
3. **`list-past-loans`** (C12 at `/loans/past`): what the member borrowed and lent, ended, newest first, with "3 days late" when one came back after it was due.
4. **`get-copy-history`** for B7's history, pass-alongs included (R23).
5. **Notice:** `loan-recorded` to the borrower.

## Tests

- Recording refuses a copy that's out or not lent; the due date counts from the day given.
- Past loans list each member's own, newest first, with the late stamp.
- Screens: Record a loan's After each action row, and Past loans when empty.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] C9 and C12 match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U16 recording a loan, and past loans`
