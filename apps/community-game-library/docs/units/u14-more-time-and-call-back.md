# U14. More time, due dates and calling back

| | |
|---|---|
| Batch | 4, Loans (`feat/community-game-library-b4-loans`) |
| Model | Standard |
| After | U13 |
| Serves | R20, R52; KTD6, KTD18 |

The borrower asks for more time and the owner answers. The owner changes the due date, or calls the game back, with an offer to text the borrower too.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `C6-MoreTime`, `C13-MoreTimeAnswer`, `C14-ChangeDue`, `C15-CallBack`, `C18-CalledBack`, `X1-DatePicker`.
- [screens.md](../screens.md): After each action, Ask for more time, Answer a request for more time, Change the due date, Call a game back; Actions that ask first, Call a game back; Waiting on someone, the owner to answer a request for more time.
- [data-model.md](../data-model.md): loans' `more_time_` columns and `called_back_at`.
- [build-plan.md](../build-plan.md): R20, R52; KTD6, KTD18.

## Build

1. **Use cases**, each taking the copy's lock:
   - `ask-more-time`: the borrower, on a loan that's out and not called back, for 3 more days, 1 more week or a picked date after the current due date, with an optional note
   - `answer-more-time`: the owner. Yes for the date asked, yes for a date of their own, or no, with an optional note kept as the notice's `answer_note`. Either answer clears the three `more_time_` columns.
   - `change-due-date`: the owner, while it's out, to the days C14 offers
   - `call-back`: the owner, after C15's dialog. It sets `called_back_at`, makes `due_on` today if it was later, clears a waiting request for more time, and ends any pass-along, so the loan can only come back to the owner.
2. **Sheets and pages** on `/loans/[id]`: C6 (the borrower's sheet), C13 (the owner's sheet, with what waiting longer means for anyone in line), C14, C15, and C18 after a call-back: "Called back today", with "Text Jo too" through the share button and `share-message.ts` (R52).
3. **The borrower's page** leads with "Sam wants it back now" once it's called back, and with "You asked for 1 more week · Sam hasn't answered" while a request waits.
4. **Notices:** `more-time-asked` to the owner; `more-time-answered` (with the note), `due-date-changed` and `called-back` to the borrower.

## Not in this unit

The daily run's reminders (U17).

## Tests

- A request for more time is refused on a loan called back; a yes moves `due_on`; a no keeps it; both clear the request.
- A call-back makes the loan due today, clears more time, and stops a pass-along.
- Only the owner answers, changes the date or calls back.
- Screens: each After each action row above, and C15's dialog.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] C6, C13, C14, C15 and C18 match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U14 more time, due dates and calling back`
