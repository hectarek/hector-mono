# U22. Deleting an account, and the admin's removal

| | |
|---|---|
| Batch | 6, Accounts and the phone (`feat/community-game-library-b6-accounts`) |
| Model | Standard: data-model.md lists everything that goes |
| After | Batches 4 and 5 merged |
| Serves | R41 (with its audit line); KTD4 |

A member deletes their account once their loans are settled, and is told first what else ends. The admin removes an account that misuses the app.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `E8-DeleteAccount`, `E9-DeleteConfirm`, `G8-RemoveAccount`, and `G1-Admin` for its accounts section.
- [screens.md](../screens.md): Actions that ask first, Delete an account and The admin removes an account; When something goes wrong, Deleting an account with open loans.
- [data-model.md](../data-model.md): What goes with a copy or an account; removed_users.
- [build-plan.md](../build-plan.md): R41; KTD4.
- Neon's docs on deleting a user, searched from `neon.com/docs/auth`, to choose how the Neon Auth user goes. Write what you chose in the task and in the app's `AGENTS.md`.

## Build

1. **`list-what-ends`** (E8 at `/you/delete`):
   - the loans to settle first: any of the member's loans, as borrower or owner, that's out, returning or passing
   - what else ends: the nights they host (cancelled, and everyone told), their requests, their places in line, and requests on their copies
   - the count of their games that leave their friends' libraries
   
   Delete my account stays switched off while a loan is open.
2. **`delete-account`** (E9's dialog): refused while a loan is open. Otherwise it does everything in data-model.md's What goes, in one transaction: their copies with their loans, their requests and places ended with no notices, the nights they host cancelled with `night-cancelled`, their friendships, friend requests, friend link, places on others' nights and votes, their settings, profile and notices, and their photo removed from storage. It then deletes their Neon Auth user, the way chosen above, and signs them out. Their past loans of others' copies stay, shown as "A former member".
3. **The admin's removal** (G8 at `/admin/accounts/[userId]`, from G1's accounts section): `remove-account`, after the dialog, does the same, and adds a `removed_users` row. U5's gate already sends that account to `/removed`.
4. **E5 gets** its Delete my account row.

## Tests

- Deleting is refused while any loan is out, returning or passing.
- Each item in What goes is gone afterwards, and each item it keeps is kept; past loans show "A former member".
- Nights they hosted are cancelled, and their attendees are told.
- Only the admin removes an account, and a removed account sees only `/removed`.
- Screens: E8 with open loans and with none, E9's dialog, and G8's dialog.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] E8, E9 and G8 match their boards at 390 px, and work at 768 and 1280 px
- [ ] How the Neon Auth user is deleted is written in the task and the app's `AGENTS.md`
- [ ] Committed as `feat(community-game-library): U22 deleting an account, and the admin's removal`
