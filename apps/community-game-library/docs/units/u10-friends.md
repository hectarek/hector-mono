# U10. Friends

| | |
|---|---|
| Batch | 3, Friends and the inbox (`feat/community-game-library-b3-friends`) |
| Model | Standard |
| After | Batch 2 merged |
| Serves | R10, R40, R49, R50, AE8 (a friend's page); KTD4, KTD18 |

Members become friends through a friend link or a one-tap request, see a friend's page and library, and can unfriend.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `E1-Friends`, `E2-FriendLink`, `E3-Friend`, `E4-Unfriend`, `A3-InviteLanding`, `A5-FriendsNow`.
- [screens.md](../screens.md): After each action, Accept, Decline, "Add friend" and Unfriend; Actions that ask first, Unfriend and Make a new friend link; When something goes wrong, the two friend-link rows; Empty lists, Friends.
- [data-model.md](../data-model.md): friendships, friend_requests, friend_links, and the notice type `friend-request`.
- [build-plan.md](../build-plan.md): R40, R49 (with its audit line), R50 (with its audit line); KTD4, KTD18.

## Build

1. **The friend link.** `get-friend-link` and `make-friend-link`: a week long, with an 8-character code (`K7Q2-HARB`, data-model.md's friend_links), and a new one ends the old, after the dialog. E2 at `/friends/link` shows `communitygamelibrary.com/f/<token>` and "Works until Tue, Nov 17", with Share (the share button and a ready message from `share-message.ts`) and Copy.
2. **Opening a link** at `/f/[token]`, with its proxy exception. A3 names nobody, since a signed-out page carries no member's name (R39):
   - signed out: A3, then making an account keeps the token through `redirectTo`, and the two are friends once the profile is set up
   - signed in: friends at once, then the friend's page
   - expired or replaced: "This link no longer works. Ask your friend for a new one."
   - inside a chat app's own browser: A9 in place of sign-in, through U5's check (KTD3), since most links are opened from a chat
3. **Step 2 of setting up (A5)**, after joining through a link: "You're friends with Sam", with people you may know and Add friend. Put it between U5's steps 1 and 3. A4's "Taken by your friends" now shows their pieces.
4. **Friends (E1)** at `/friends`: requests to you (Accept, Decline), your friends, People you may know, and requests you sent ("You asked", with Cancel request). People you may know are friends' friends and people from a past night you went to, from `game_night_attendees`.
5. **A friend's page (E3)** at `/friends/[userId]`: the photo, piece, name, "Friends since", the phone as a call link, their library through U8's `library-list` filtered to them, and Unfriend (E4's dialog). The nights section comes with U18.
6. **Use cases:** `use-friend-link`, `list-friends`, `get-friend` (behind `requireFriend`), `send-friend-request` (to a friend's friend or someone from a night; one per pair), `answer-friend-request` (accepting makes both rows and deletes the request; declining keeps it as `'declined'`, so the sender still sees "You asked"), `cancel-friend-request`, `list-people-you-may-know`, and `unfriend`. Unfriending, with nobody told (R50):
   - deletes both friendship rows
   - withdraws requests between them, and cancels accepted loans not yet picked up
   - takes each out of the other's lines
   - takes each off the other's nights, with their games on the table
   - leaves loans that are out, visible to both until the game is back
7. **Notices:** `friend-request` to the recipient.

## Not in this unit

The nights on a friend's page (U18). The Friends tab's count (U11).

## Tests

- A link makes two people friends at once, both ways; an expired or replaced one says so; a new link ends the old.
- A declined request: the sender still sees "You asked"; cancelling deletes it.
- Unfriending does each thing in R50 and its audit line, and tells nobody.
- AE8 on E3: a member who isn't a friend gets Not found.
- Screens: each After each action row above, E4's dialog, and Friends when empty.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] E1 to E4, A3 and A5 match their boards at 390 px, and work at 768 and 1280 px
- [ ] Committed as `feat(community-game-library): U10 friends`
