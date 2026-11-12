# U19. Invites, answers, the waitlist and guests

| | |
|---|---|
| Batch | 5, Nights (`feat/community-game-library-b5-nights`) |
| Model | Standard |
| After | U18 |
| Serves | R30 (invites and the link), R31, R32, R33 (the Nights count), R38, R47, AE4; KTD4, KTD18 |

The host invites people by name or with the night's link. Members answer, bring guests, join the waitlist when it's full, bring games, and say what they'd play.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `D2-Night` (invited), `D13-NightGoing`, `D3-Rsvp`, `D4-NightFull`, `D10-Invite`, `D14-NightLink`, and `D7-NightHost` for the night's link and the waitlist.
- [screens.md](../screens.md): After each action, Answer a game night, Join a waitlist, Send invitations; Actions that ask first, Take someone off a waitlist and a new link for a night; When something goes wrong, More guests than seats and Something changed underneath; Empty lists, A night nobody is invited to yet and Games on the table; Limits to build for, Invite all my friends and a night's card showing at most 12 pieces.
- [data-model.md](../data-model.md): game_night_attendees, game_night_games, game_night_votes, and the notice types `night-invite`, `waitlist-seat` and `removed-from-waitlist`.
- [build-plan.md](../build-plan.md): R30, R31, R32, R33, R38, R47, AE4; KTD4, KTD18.

## Build

1. **`src/entities/night.ts`:** seats taken (1 plus `guest_count` for each member going); whether a member with N guests fits; and the first waitlisted member who fits, in `waitlisted_at` order.
2. **Invites** (D10 at `/nights/[id]/invite`): `invite-to-night` by the host, or by anyone going when `attendees_can_invite` is on ("Only Alice invites people." when it's off). It lists the inviter's friends not yet invited, with Invite all my friends, and says when a full night puts someone on the waitlist ("The night is full, so Alice joins the waitlist after Dev."). Each invite is an `'invited'` row with `invited_by`, and `night-invite`.
3. **The night's link**, on D7 and D10: `make-night-link` (the 8-character code; a new link after the dialog), Share and Copy. `use-night-link` at `/n/[token]`, with its proxy exception: signed out it's D14 (the title, the date and the seats, and never the place), or A9 inside a chat app's own browser, through U5's check (KTD3); signed in, it gives an `'invited'` row with no `invited_by` and opens the night.
4. **Answers:** `answer-night` (D2's buttons, then D3's sheet) for going, maybe or can't go, with guests when `guests_allowed` is on.
   - A full night offers the waitlist (D4). A member with guests waits for their seats, and D3 says "Only 1 seat is left. Go alone, or join the waitlist for 2 seats." (AE4).
   - When someone stops going, the first waitlisted member who fits moves to going and gets `waitlist-seat`, and the one who stopped loses their games on the table and their votes.
   - A seat taken while the sheet was open is `ChangedError('seats-taken')`, with Join the waitlist.
5. **`remove-from-waitlist`** for the host, after the dialog, with `removed-from-waitlist`.
6. **Games and votes:** `add-game-to-night` ("I'll bring a game": a member going picks from their own library, through U18's D6 sheet), `remove-game-from-night`, and `vote` ("I'd play", which reads "You'd play" once pressed; going members only). D7 lists them most wanted first.
7. **The Nights tab's count** (U11) now has rows to count: invites by name with no answer.

## Tests

- AE4: with 6 seats, guests allowed and 5 going, a member bringing a guest goes on the waitlist; when someone going changes to can't go, they move to going and are told.
- Seats never pass the capacity; the waitlist keeps its order and skips someone who doesn't fit.
- Only the host invites, unless the switch is on.
- The link page shows no place signed out, and gives a row signed in.
- Only members going vote; stopping going takes away their votes and their games.
- Screens: each After each action row above, both dialogs, D14, and the two empty states.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] D2, D3, D4, D10, D13, D14 and D7's link and waitlist match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U19 invites, answers, the waitlist and guests`
