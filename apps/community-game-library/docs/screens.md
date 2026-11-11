# Community Game Library: screens

Updated 2026-11-11

Every screen of the app was drawn before any code, on a private design canvas. This file is the record the build works from: which screens exist, the rules they follow, and what happens in the states that weren't drawn. The requirement and decision numbers (R, D) are [build-plan.md](build-plan.md)'s.

The screens were drawn at phone width (390px). On a tablet or laptop the same screens stretch by the rules in build-plan.md's notes for the technical half (R43).

## The screens

A code such as B5 is the screen's name on the canvas. "Serves" lists the requirements a screen is there for.

**A · Getting in**

| Screen | What it is | Serves |
|---|---|---|
| A1 | Welcome | R39 |
| A2 | Make an account, with Google or email | R39 |
| A8 | Sign in | R39 |
| A3 | A friend's link, signed out | R39, R49 |
| A9 | Opened inside a chat app | R39, R43 |
| A4 | Set up your profile and piece | R40, R51 |
| A5 | You're friends, and who else | R49 |
| A6 | Put it on your home screen | R43 |
| A7 | An empty library | R39 |

**B · Library tab**

| Screen | What it is | Serves |
|---|---|---|
| B1 | All friends: one row per game | R10, R11, R15 |
| B10 | Search, in two groups | R2 |
| B2 | Filter | R11 |
| B12 | Sort | R12 |
| B3 | Filtered, and shared | R13 |
| B4 | No games match | R11 |
| B5 | A game's page | R7, R14, R15 |
| B13 | Every state of a copy | R15, R21, R24 |
| B11 | A game you own | R14 |
| B6 | My library | R8, R10, R48 |
| B7 | One of my copies | R8, R9, R23 |
| B14 | Remove a copy | R8 |
| B8 | Add games from the catalog | R2, R3 |
| B9 | Suggest a game | R4 |

**C · Loans tab**

| Screen | What it is | Serves |
|---|---|---|
| C1 | Ask to borrow | R16 |
| C16 | A request I sent | R21 |
| C2 | Answer a request on my game | R16 |
| C17 | Said yes, waiting for pick-up | R18, R21 |
| C3 | Pick it up, and say when | R18 |
| C4 | Loans: everything in one list | R22 |
| C5 | A game I borrowed | R19, R20, R24 |
| C6 | Ask for more time | R20 |
| C13 | Answer a more-time request | R20 |
| C7 | A game I lent | R19, R20, R21 |
| C14 | Change the due date | R20 |
| C15 | Call it back | R20 |
| C8 | Confirm it's back, and when | R19 |
| C9 | Record a loan | R17 |
| C10 | Join the line | R24 |
| C11 | Pass it along | R48 |
| C12 | Past loans | R23 |

**D · Nights tab**

| Screen | What it is | Serves |
|---|---|---|
| D1 | Nights | R33 |
| D2 | A game night | R30, R32, R36 |
| D13 | A night I'm going to | R31, R35, R38 |
| D3 | Change answer or guests | R31, R47 |
| D4 | A full night and its waitlist | R31 |
| D5 | New game night | R29, R30, R47 |
| X1 | Pick a date | R29 |
| D6 | Pick games from my library | R29, R32 |
| D7 | A night I host | R30, R34, R38 |
| D10 | Invite people | R30 |
| D14 | A night's link, signed out | R30, R36 |
| D11 | Cancel a night | R34 |
| D8 | What should we play? | R37 |
| D9 | Split into tables | R46 |
| D12 | Past game nights | R33 |

**E · Friends tab, and You**

| Screen | What it is | Serves |
|---|---|---|
| E1 | Friends | R49 |
| E2 | Your friend link | R49 |
| E3 | A friend's page and library | R10, R40 |
| E4 | Unfriend | R50 |
| E5 | You | R40 |
| E6 | Edit profile and piece | R40, R51 |
| E7 | Notices I get | R28 |
| E8 | Delete my account | R41 |
| E9 | Delete, once nothing is open | R41 |

**F · Inbox, from the bell**

| Screen | What it is | Serves |
|---|---|---|
| F1 | Inbox | R25, R26, R27 |
| F2 | Nothing new | R27 |

**G · Admin, under You**

| Screen | What it is | Serves |
|---|---|---|
| G1 | Admin | R4, R5, R41 |
| G2 | A suggestion to answer | R4 |
| G3 | Add a game by hand | R1, R5 |
| G4 | A game's record, and its video | R5, R7 |
| G5 | Find a game to correct | R5 |
| G6 | Merge one of ours into BGG's | R5 |
| G7 | Answered suggestions | R4 |
| G8 | Remove an account | R41 |

**Shared**

| Screen | What it is | Serves |
|---|---|---|
| X1 | Pick a date (the sheet every date choice opens) | R16, R20, R29 |
| X2 | What happens next, and when it goes wrong: the patterns in the tables below | |
| W0 to W4 | Wider screens: the rules, the library on a laptop and a tablet, a game's page, a sheet as a dialog | R43 |

## Rules every screen follows

These came from Hector's reviews (D13, D14) and from a usability audit of all 65 first screens on 2026-11-11.

1. **Each thing has one home (D14).** A game, a copy, a loan, a game night and a friend each have a page, and that page is the only place its buttons live. Lists, cards and the inbox show a thing's state and open its page.
2. **One main action per screen.** It is the one filled navy button. Red is only for an action that loses something. Saying no to a request is an ordinary button.
3. **Anything that can't be undone asks first,** in a dialog whose red button names the thing ("Remove Dev's account") and whose other button says what is kept ("Keep it"). The dialog names who is told. The table below lists every such action.
4. **A switch takes effect when it's flipped.** A Save button belongs to the text fields beside it and to nothing else.
5. **Every action says what happened:** a short message naming the result, with Undo where it can be undone, and the thing's row or page changes state.
6. **"Is told" means a line in the inbox,** which the person sees when they next open the app (D9). Where timing matters, such as cancelling a night or calling a game back, the screen says so in those words.
7. **A status stamp says whose move it is in its word, not only its color.** "Requested" is someone asking for your copy; "You asked" is you waiting. On a card in a list the stamp is always the member's own status. Red is only for what waits on the member now.
8. **A person is named wherever their piece appears beside words about someone else.** A game's row says whose copy it is: "Priya's · you're 1st in line".
9. **A guest is a small pawn in the color of the member who brought them,** standing next to that member, and the word "guest" is always written.
10. **One word per thing.** Complexity, not weight. Best at 4. Picked up, for owner to borrower; hand it to, for one borrower to the next; gave it back, for a return. A line is for a copy and a waitlist is for a seat. Games on the table are a night's games. Make an account, and sign in.
11. **Back goes where the person came from.**
12. **What looks tappable is.** A row with an arrow opens a page. Facts are plain text. A chip is only ever a filter.
13. **A title is never cut short.** It wraps to two lines, and a stamp that no longer fits drops under it.

## States that weren't drawn

Proposed on 2026-11-11 from the audit. Hector hasn't gone through these line by line, so any of them can change.

### After each action

| Action | What the person sees next |
|---|---|
| "I own it" on a catalog result | The row is stamped "Added" with "Undo" beside it, and a message reads "Harbor Master is in My library", with "Undo" and "Edit copy" |
| "In my box" on an expansion's result | "Low Tide is in the box of your Gull & Anchor", and the copy's page shows it ticked |
| Send a suggestion | "Suggestion sent." My library shows it as "suggested today · waiting on the admin" until it's answered. The answer arrives in the inbox |
| Send a borrow request | "Request sent to Sam." On the game's page that copy now reads "You asked" and opens the request. Loans lists it under "You asked" |
| Withdraw a request | Back on Loans, with "Request withdrawn." The owner is told |
| The owner says yes | The owner's page for the loan reads "Priya hasn't picked it up yet" (C17). The borrower's notice opens the pick-up page (C3) |
| The owner says no | The request leaves both people's Loans. The borrower's notice carries the owner's note |
| "I've picked it up", or the owner's "Priya has it" | The loan starts on the day given. The borrower sees C5 and the owner C7 |
| "I gave it back to Sam" | The borrower's page reads "Waiting for Sam to confirm", with the day they gave. The owner's page leads with "Is it back?" (C8) and counts on their Loans tab |
| The owner's "Yes, it's back" | The loan closes for both and moves to Past loans. The copy is available, or the owner is asked to answer the next person in line |
| The owner's "I don't have it yet" | The loan is running again, and the borrower is told |
| Ask for more time | The borrower's page reads "You asked for 1 more week · Sam hasn't answered". The owner's page leads with the request and counts on their tab |
| Answer a request for more time | The due date changes or stays, and the borrower is told either way |
| Change the due date | The track and the due line change, and the borrower is told |
| Call a game back | The owner's page reads "Called back today". The borrower's page leads with "Sam wants it back now". Any pass-along ends (R20) |
| "I gave it to Jo", passing a game along | The giver's page reads "Waiting for Jo to confirm", with "I still have it" to take it back. The loan stays the giver's until Jo confirms |
| The next person confirms a pass-along | The giver's loan ends, the new one starts for the same period (R48), and the owner is told who has the game |
| Join a line | On the game's page that copy reads "2nd in line", with "Leave the line". Loans lists it under "In line" |
| Record a loan | The loan is out on both people's Loans, from the day given. The borrower is told and doesn't confirm |
| Answer a game night | The night's page shows the member's stamp and, when going, their piece in a seat (D13). The Nights count drops |
| Join a waitlist | The page reads "Waitlist · you're 2nd", with "Leave the waitlist" |
| Create a game night | The host's page (D7). For a night only invited people see, the invite page comes first (D10) |
| Send invitations | Back on the host's page. Each person shows as "Invited" until they answer |
| Cancel a night | It leaves Nights for everyone and shows under past nights as "Cancelled". Everyone going, invited or waiting gets a notice |
| Accept a friend request | They join "Your friends", with "You and Mei are friends." The Friends count drops |
| Decline a friend request | The row goes. The other person isn't told |
| "Add friend" | The row reads "You asked", with "Cancel request" |
| Unfriend | Back on Friends without them. They aren't told (R50) |
| Flip a switch | It takes effect at once, with "Saved." |
| The admin answers a suggestion | It moves to the answered list. The member is told, and an added game lands in their library (R4) |

### Actions that ask first

| Action | The dialog asks | It says | Buttons |
|---|---|---|---|
| Call a game back (C15) | Call Gull & Anchor back? | Jo is told to return it now. It goes to her inbox, so she sees it when she next opens the app. | Call it back · Leave it with Jo |
| Cancel a night (D11) | Cancel Heavy games at mine? | The date, then: everyone going, invited or waiting is told, by name. This can't be undone. | Cancel the night · Keep it |
| Unfriend (E4) | Unfriend Sam? | What stops, what stays open, and that Sam isn't told | Unfriend Sam · Keep Sam |
| Remove a copy (B14) | Remove Salt & Signal from your library? | Your friends stop seeing it. Its loan history goes with it. This can't be undone. | Remove it · Keep it |
| Delete an account (E9) | Delete your account? | What leaves with it, the night that's cancelled, and that it can't be undone | Delete my account · Keep my account |
| Withdraw a request | Withdraw your request for Quarry Lane? | Sam is told. | Withdraw it · Keep it |
| Leave a line | Leave the line for Fenwick Fair? | You lose your place. | Leave the line · Stay in line |
| "I can't pick it up after all" | Cancel this loan? | Sam is told, and the game is free for the next person. | Cancel the loan · Keep it |
| The owner cancels a loan before pick-up | Cancel this loan? | Priya is told. | Cancel the loan · Keep it |
| Take someone out of a line | Take Ben out of the line? | He's told. A note is optional. | Remove Ben · Keep him |
| Take someone off a waitlist | Take Dev off the waitlist? | Dev is told. | Remove Dev · Keep Dev |
| Make a new friend link, or a new link for a night | Make a new link? | The link you already shared stops working. | Make a new link · Keep this one |
| Merge a hand-added game into BoardGameGeek's | Merge Lantern Tag into BoardGameGeek's? | Our details are replaced by BoardGameGeek's, and its copies move over. This can't be undone. | Merge and remove ours · Keep both |
| The admin removes an account | Remove Dev's account? | Dev can't sign in again. Their games disappear from everyone's library. This can't be undone. | Remove Dev's account · Keep it |
| Leave a form with text typed | Leave without saving? | | Leave · Keep editing |

### Empty lists

| Where | It says | Its button |
|---|---|---|
| All friends, before any friends | No friends yet. Share your friend link to see what your friends own. | Share my friend link |
| All friends, when friends own nothing | Your friends haven't added games yet. | |
| My library (A7) | Your library is empty. Search for a game you own and tap I own it. | Add your first game |
| A filter that matches nothing (B4) | The filter to drop, with how many games that brings back | Clear filters |
| Search with no match | Nothing called "fog lantern" yet. | Suggest a game |
| Add games, before typing | Search for a game you own. | |
| A game none of your friends own | None of your friends own this yet. | I own it |
| Loans | No loans. Borrow a game from the Library, or record one you lent in person. | Record a loan |
| Past loans | Nothing borrowed or lent yet. | |
| Nights | No game nights coming up. | New game night |
| Past nights | No past game nights. | |
| A night nobody is invited to yet | Nobody's invited yet. | Invite people |
| Games on the table | No games on the table yet. | I'll bring a game |
| "What should we play?" when nothing fits | Nothing fits 6 people in 3 hours. Try more time or another complexity. | |
| Friends | No friends yet. | Share my friend link |
| Inbox (F2) | Nothing here yet. | |
| The admin's suggestions | No suggestions waiting. | |

### When something goes wrong

| Case | What the person sees |
|---|---|
| A field is wrong | A line under the field says what to fix. Nothing typed is lost |
| A send fails | "That didn't send." with "Try again". The page keeps what was typed |
| No connection | The screen says so and never fails silently. How much shows offline is for the technical half (R44) |
| Something changed underneath: the copy was lent, the request withdrawn, the last seat taken | The sheet says what changed in one line and offers the next best action, such as "Join the line" or "Join the waitlist". Nothing is sent |
| A friend link that has expired or been replaced | This link no longer works. Ask your friend for a new one. |
| A friend link opened by someone signed in | They're friends at once, and land on the friend's page |
| A link opened inside a chat app's own browser | A9: open it in the phone's browser. Google refuses to sign in there, and the home-screen step is missing |
| An email that already has an account | Under the field: "That email already has an account." with "Sign in instead" |
| A photo that's too large, or fails | Under Photo: "That photo didn't upload. Try a smaller one." |
| Removing a copy that's out (AE2) | The button is switched off: "You can remove it once it's back." |
| Deleting an account with open loans | E8: the loans to settle first, and what else ends |
| More guests than seats (AE4) | On the answer sheet: "Only 1 seat is left. Go alone, or join the waitlist for 2 seats." |
| A day before the pick-up, or before the current due date | Those days are switched off on the date sheet (X1) |

### Waiting on someone

| Waiting for | It shows as | If they never do |
|---|---|---|
| The owner to answer a request | You asked | The borrower can withdraw |
| The borrower to confirm the pick-up | Priya hasn't picked it up yet | The owner can tap "Priya has it" and give the day, or cancel the loan |
| The owner to confirm a return | Waiting for Sam to confirm | The owner is reminded. The loan can't run overdue once the borrower has given the day (R19) |
| The next person to confirm a pass-along | Waiting for Jo to confirm | The giver can tap "I still have it". The owner can call the game back |
| The owner to answer a request for more time | You asked for 1 more week | The due date stays as it was |
| An invited person to answer | Invited | The host sees them under "No answer yet" |
| The admin to answer a suggestion | Waiting on the admin | Nothing |

### Limits to build for

- A circle of 30. The owner filter folds after six owners ("Show all 30"). The invite list has "Invite all my friends". Any "who" choice with more than six people is a searchable list, not a row of buttons. A night's card shows at most 12 pieces, then "+18".
- A long title, such as an expansion's, wraps to two lines in every row.
- A date shows its weekday, and its year once that isn't this year.
- Complexity as a word: light is under 2, medium is 2 up to 3, and heavy is 3 and over, on BoardGameGeek's 1 to 5 scale.
- Each list's rows are the same component on every screen it appears on, so a friend's library sorts and filters like the member's own.
