---
title: Community Game Library - Spec
type: feat
date: 2026-11-10
execution: code
---

# Community Game Library - Spec

The spec for building `apps/community-game-library`, served at communitygamelibrary.com. It holds the product half (requirements, decisions, flows and scope), drafted and answered with Hector on 2026-11-10. The technical half (key technical decisions and implementation units) comes after the recipes performance review: this app copies hectors-recipes' code and system architecture, and should start from that review's lessons. A path that starts with `app/`, `src/`, `db/` or `docs/` is inside `apps/community-game-library/`.

---

## Status

| | |
|---|---|
| Phase | Spec: the product half, agreed 2026-11-10 |
| Next | The design system: style tiles in the game box and cardboard direction, then the system |
| Then | The technical half, once the recipes performance review is done |
| Waiting on Hector | H1 (BoardGameGeek registration), and his pick of the style tiles |
| Updated | 2026-11-10 |

---

## How to read this spec

- Requirements (R) say what the app does. Each ends with where it came from: *asked* is from Hector's list or his answers of 2026-11-10, and *gap* is something Claude added because a good library or events app is expected to do it. Any gap can be cut.
- Decisions (D) are product choices with their reasons. Hector agreed every one on 2026-11-10, including the details Claude proposed.
- A requirement or decision that changed after Hector saw it says so, with the date and the question it came from.
- Needs from Hector (H) are steps only he can take.

---

## Goal Capsule

- **Objective:** friends always know who owns which board games, borrow them with due dates nobody has to remember, and set up game nights with the right games for the people coming.
- **Means:** a phone-first web app installed to the home screen (a PWA), in hector-mono on hectors-recipes' architecture: clean architecture, Neon Postgres, Drizzle, Neon Auth and Vercel.
- **Authority:** requirements win on behavior, and the technical half's decisions win on mechanism. The root and app `AGENTS.md` rules (never loosen a check, no write to a real database without Hector's OK at that moment, the public-repo rules) override this spec.
- **Stop conditions:**
  - BoardGameGeek's terms don't allow keeping a copy of its catalog, or showing its images: stop catalog work and bring it back to Hector (D7).
  - Any task would put a member's name, contact or address into the repo: stop, and keep it in the database.
- **Execution profile:** Claude builds. Hector reviews and merges one PR per phase. Account and production-data steps are his (Needs from Hector).

---

## Product Contract

### Summary

A private library for a circle of friends' board games. Each member adds the games they own by picking them from a shared catalog, the way a library catalogs a book once and then tracks each copy. Members see their own and their friends' games in one place, with filters that matter at a table (how many players, how long, how heavy), borrow a copy for a period its owner sets, and are reminded before it's due. A game night has a host, a capacity, a list of games and RSVPs, and tools suggest which games fit the people coming.

### Problem frame

A friend group's games are spread across several homes, and what each person owns lives in their memory. Borrowing happens in the group chat and nobody tracks it, so games stay out for months and owners forget who has what. Game nights are planned in the same chat, where it's hard to see who's coming, whether there's room and which games will be there. Choosing what to play for six people with mixed experience is guesswork.

The app makes friends' shelves visible, makes a loan a record with a due date and reminders on both sides, and makes a game night something to open, join and plan around. It starts with one group of about 12 people who trust each other, and is built so other circles can join without a rebuild: no money, no penalties, no public profiles.

### Actors

- A1. **Member:** a person with an account, on their phone. Adds their games, browses their friends' games, borrows and lends, hosts and joins game nights.
- A2. **Admin:** Hector to start. Runs the catalog: suggestions, games added by hand, corrections and videos.
- A3. Dropped 2026-11-10 (Hector, Q11): the catalog agent. With a full copy of BGG's catalog there's little for an agent to research, so the admin does the catalog work. An AI helper for it is later work.
- A4. **BoardGameGeek (BGG):** the outside database of board games the catalog is copied from (D7).
- A5. **The member's phone:** runs the app from its home screen.

### Words this spec uses

- **Game:** one entry in the catalog, such as Wingspan. It exists once, whoever owns it.
- **Copy:** one member's physical box of a game. A game can have many copies among friends.
- **Shelf:** a member's copies.
- **Friend:** a member you've connected with. Friends see each other's shelves and game nights.
- **Library:** every copy on your shelf and your friends' shelves, shown one card per game.
- **Loan:** a copy lent from its owner to a borrower, from the request (or a direct lend) to its return or pass-along.
- **Line:** the friends waiting for a copy that's out, in the order they asked.
- **Pass-along:** a borrower handing a copy straight to the next friend in line, rather than back to its owner.
- **Game night:** an event with a host, a time, a place, a capacity and a list of games.
- **Suggestion:** a member's request to add a game the catalog doesn't have.

### Requirements

**Catalog**

- R1. The catalog holds, for each game: its title and other names, year, cover image (full size and thumbnail), description, player count range and the counts it plays best at, play time, minimum age, complexity (BGG's 1 to 5 weight), categories (the genre, such as party or card game), mechanics (such as deck building or worker placement), designers, publishers, and its expansions or base game. *asked*
- R2. Search finds a game by title as it's typed, ignoring case, punctuation and leading articles, and tolerates a typo or a missing word ("ticket ride" finds Ticket to Ride). Each result shows its cover, year and publisher, so editions and same-named games can be told apart. Search covers every game in the catalog, not only the ones members own. *asked*
- R3. A member adds a game to their shelf with one tap on a search result, and can add several in a row without leaving search. *asked (one tap); gap (several in a row)*
- R4. When search can't find a game, the member suggests it: its title, and optionally its year, publisher, a link and a photo of the box. The admin adds it or declines it with a reason, and the member is told either way. An added game lands on the suggester's shelf. With the catalog a copy of BGG's (D7), a miss is rare: a game newer than the last weekly update, which the admin can pull from BGG at once, or one BGG doesn't list, which the admin adds by hand (R5). *asked; gap (the outcome and the notice)* (Revised 2026-11-10, Hector on Q11: the admin handles suggestions, with no catalog agent.)
- R5. The admin can correct a game's details, set its how-to-play video, and add a game BGG doesn't list, with the same fields a BGG game has (D11). Every change records who made it. *asked*
- R6. Dropped 2026-11-10 (Hector, Q3): no tags of our own for now. Filters use BGG's own attributes (D8), and tags come back only for something that data turns out to lack. *asked*
- R7. A game can carry one how-to-play video, which plays on its page. *asked: optional for now, a later phase*

**Shelves and friends**

- R8. A copy records its game, its owner, the expansions in the box, its condition and any missing parts, whether its owner lends it, whether friends can pass it along (R48), and when it was added. Its owner can edit or remove it, except while it's on loan. *asked; gap (expansions, condition, whether it's lent)*
- R9. A member can own more than one copy of a game, and each copy lends on its own. *gap*
- R10. A member can open their own shelf to manage it and any friend's shelf to browse and borrow from. Someone who isn't a friend sees neither. *asked* (Revised 2026-11-10, Hector on Q1: friends, not one group.)
- R49. Each member has a friend link to share, say in the group chat. Opening it, signed in or after signing up, makes the two people friends at once. A link lasts a week, and making a new one ends the old one. The app also offers one-tap friend requests, which the other person accepts, to a friend's friends and to people from a game night you went to. There's no search of everyone who uses the app. *asked (friends, Q1); gap (how people become friends)*
- R50. Either friend can unfriend the other, and neither is told. From then on they don't see each other's shelves or game nights. A loan still open between them stays visible to both until the game is back, and each leaves the other's lines. *gap*

**Browsing the library**

- R11. The library shows every game on your shelf and your friends' shelves, one card per game, with its cover, its key facts and whether a copy is available now ("1 of 2 available", "Out until Nov 20"). It filters, in any combination, by:
  - player count: plays with N, or plays best with N
  - play time
  - complexity
  - minimum age
  - category and mechanic, as BGG names them (D8)
  - owner
  - available now

  *asked (filters, friends' games); gap (one library view across shelves, availability)*
- R12. Library and shelf lists sort by title, recently added, complexity, play time, year or most borrowed. *gap*
- R13. Filters and sort live in the page's address, so going back keeps them and a filtered view can be shared in the group chat. *gap*
- R14. A game's page leads with its cover at full quality, then its facts (players with the best counts, time, age, complexity), description, categories and mechanics, expansions, the how-to-play video, and which of your friends own it, with each copy's state and a Borrow button. *asked*
- R15. A copy shows its state wherever it appears: available, requested, out (with its due date and how many are in line), or not lent. *gap*

**Lending**

- R16. A member requests a friend's copy that its owner lends, with an optional note ("Can I grab it Friday?"). The owner accepts and sets the loan period (1 week, 2 weeks, a month, or a date), or declines with an optional note. *asked (the owner sets the period); gap (the request and the decline)*
- R17. An owner can record a loan made in person, picking the friend and the period, with no request first. *gap*
- R18. A loan's due date counts from the handoff, which the person receiving the game confirms; a direct lend is handed off at once (D5). *gap*
- R19. The borrower marks a game returned and the owner confirms it, noting any missing parts or damage on the copy. The owner can also mark it returned without waiting. *gap*
- R20. The borrower can ask for more time, which the owner grants with a new due date or declines. The owner can change the due date at any time, and can call a game back, which ends any pass-along. *gap*
- R21. The borrower can withdraw a request or leave a line, and the owner can cancel an accepted loan before the handoff or decline anyone in a line. *gap*
- R22. My loans shows, in one place, games I've lent that are out, games I've borrowed, the lines I'm in, and requests waiting in either direction, overdue ones first. *asked; gap (both directions, requests, lines)*
- R23. A copy keeps its loan history (who had it and when, pass-alongs included), and each member can see their own past loans. *gap*
- R24. A friend can ask for a copy that's out, and joins its line. The line goes in the order people asked. The borrower sees that someone's waiting, and their due date doesn't change. *asked* (Revised 2026-11-10, Hector on Q6: a line, with pass-along, replaces "tell me when it's back".)
- R48. An owner can let friends pass a copy along, for one copy or their whole shelf; it's off until they do. With it on, a borrower who's done hands the copy straight to the next friend in line, rather than back to the owner:
  - the owner's switch approves the next loan in advance, and the owner is told who has the game now
  - the next loan runs the same period the owner gave the one before, counted from its own handoff (D5), not what's left of the last one
  - the owner can still change the due date, decline someone in the line, or call the game back (R20, R21)
  - with no one left in line, the last borrower returns it to the owner

  With it off, the borrower returns the copy, and the owner accepts the next request in line as usual. Only the owner's friends can join a line, since they're the ones who see the copy. The two borrowers needn't be friends: the app shows each the other's name, and phone if they've added one, for the handoff. *asked (Hector, Q6)*

**Notifications**

- R25. The borrower is reminded two days before a loan is due and on the morning it's due. The owner is told on the day it's due back. Once it's overdue, both are told, and again every three days until it's returned. *asked*
- R26. Members are also told about: a request on their copy, the answer to their request, a friend request, someone joining the line for a game they have, their turn coming up in a line, a pass-along to confirm, a request for more time and its answer, a return waiting for them to confirm, a game-night invite, a change to or cancellation of a night they're going to, a place opening for them on a waitlist, the morning of a night they're going to, and the outcome of their suggestion. *gap*
- R27. Every notice lands in an inbox in the app, with an unread count. *gap* (Revised 2026-11-10, Hector on Q7: in the app only for the first release; push comes in a later phase, D9.)
- R28. Each member picks which kinds of notice they get. Loan reminders are on by default. *gap*

**Game nights**

- R29. A member creates a game night with a title, a date and start time, an optional end, a place, a capacity (the most people, host included), a note, and the games that will be there, picked from their own shelf; members going add theirs (R32). *asked*
- R30. A game night shows to the host's friends by default, and anyone who sees it can join while there's room. A private one is seen and joined only by the people its host invites, directly or with the night's link. Only the host invites, unless they turn on "guests can invite others", as a calendar invite allows. People at the same night who aren't friends see each other's names and the night's games, not each other's shelves. *asked* (Revised 2026-11-10, Hector on Q1: shown to friends, not the whole group.)
- R31. Members answer going, maybe or can't go. Going counts against the capacity. Once a night is full, more members can join its waitlist; when a place opens, the first on the waitlist who fits takes it and is told. *gap*
- R47. A host can let members bring guests who don't use the app. A member going then says how many guests they're bringing, and each guest takes a place against the capacity, with no account and no RSVP of their own. It's a separate switch from "guests can invite others". *asked (Hector, Q8)*
- R32. A member who's going can add games from their own shelf to the night's list ("I'll bring it"). *gap*
- R33. Upcoming game nights lists the ones a member can see, soonest first, with the places left. Past nights fold away. *asked*
- R34. The host can edit or cancel a night, and members going are told. *gap*
- R35. A game night can be added to the phone's calendar by downloading its calendar file (.ics). Keeping the calendar in sync as a night changes is later work. *gap; asked (Hector, Q4)*
- R36. A game night's place is shown only to people who can see the night. *gap*

**Game-night tools**

- R37. For a game night, the app suggests games from the night's list, or from the host's library, ranked by how well each fits:
  - the number going, guests included: plays best at that count first, then plays at it
  - the time available
  - the complexity the host wants: light, medium, heavy, or light enough for new players

  Each suggestion says why it fits ("Best at 5 · 60 to 90 min · medium"). *asked*
- R38. Before a night, members going can vote on the games on its list, and the host sees the ranking. *gap (Hector took it on Q9)*
- R46. When more people are going than one game seats, the app proposes tables: a split of the people going, with a game for each table that plays well at its size and fits the time. *gap (Hector took it on Q9)*

**Accounts and access**

- R39. Anyone can sign up, and a new account sees the catalog and nothing else until it has friends. Signed-out visitors see only the welcome page, which carries the app's name and no member's. *gap* (Revised 2026-11-10, Hector on Q1: it had been invite-only, which friends make unnecessary.)
- R40. A member's profile has their name, a photo, and an optional phone number for arranging handoffs, shown only to their friends and to the other person in a loan or a pass-along. *gap*
- R41. A member can delete their account once their loans are settled; their copies leave their friends' libraries with them. The admin can remove an account that misuses the app. *gap* (Revised 2026-11-10, Hector on Q1: the admin runs the catalog, not the membership.)
- R42. Dropped 2026-11-10 (Hector, Q11): the catalog agent's tools. *asked*

**The app**

- R43. The app installs to the home screen on iPhone and Android, opens full screen, and is built for phones first while still working on a laptop. It has a light theme only (D12). *asked* (Revised 2026-11-10, Hector on the first style tiles: it had a dark mode too.)
- R44. Opening the installed app after a day away shows the member's content quickly. The technical half sets the target from the recipes performance review. *gap*

**Privacy**

- R45. The public repo holds no member's name, email, phone or address. Code, tests, fixtures, screenshots, commit messages and PR text use fictional people. *gap*

### Decisions

- D1. **A library, not a list.** A game exists once in the catalog, and members add copies of it. Members don't type in games of their own: a missing game goes through a suggestion (R4). Why: one rich record per game for everyone, no near-duplicates ("Catan" and "Settlers of Catan"), and filters that work across every shelf. *asked*
- D2. **Rules, not AI, in the app.** Game suggestions for a night (R37) and table splits (R46) come from readable rules over the catalog's data, with their reasons shown. Why: answers members can check, and no model costs or keys in the app, as in the job search app.
- D3. **No money, deposits or penalties.** Overdue means reminders, not fees. Why: these are friends.
- D4. **The owner decides.** Only a copy's owner accepts or declines a request on it, sets its period, extends it, turns on pass-along or confirms its return. The admin can't lend someone else's copy.
- D5. **The period counts from the handoff.** The owner picks a period when accepting, and the due date is set when the person receiving the game confirms they have it. Why: a request accepted on Monday and picked up on Saturday shouldn't lose five days. A direct lend (R17) skips the confirmation.
- D6. **Architecture from recipes.** The app copies hectors-recipes' code and system architecture once its performance review is done, and the technical half starts from that review's lessons. *asked*
- D7. **The catalog is our own copy of BoardGameGeek's.** It's filled from BGG before anyone is invited, so the library is full on day one, and a script refreshes it about once a week. The script spaces its calls generously, so it never strains BGG's service, however long the first copy takes. Search runs on our copy, so members never wait on BGG. Why: BGG is the most complete source there is, and there's no reason to rebuild it. (Hector, 2026-11-10, on Q2 and Q10)
- D8. **The catalog's attributes are BGG's.** Players, best player counts, time, age, weight, categories and mechanics come as BGG records them, and the app adds no tags of its own until that data turns out to lack something. BGG's categories include Card Game, which may already separate a card game from a big board game. (Hector, 2026-11-10, on Q3)
- D9. **Notices start in the app, and push follows.** The first release has the in-app inbox only, with no push and no email. Push is a later phase: about as much work again as the inbox (a service worker, storing each phone's subscription, a scheduled sender, the iPhone home-screen step, and testing on real phones), so not the same effort, which was Hector's test. The inbox is built so push is one more way to deliver the same notices, not a rewrite. (Hector, 2026-11-10, on Q7)
- D10. **Friends now, groups later.** Who sees what follows friendship (R10, R30). Groups can come later as a second place to share, as on Facebook, where a post goes to your friends or to a group, each with its own visibility. So a shelf's and a night's audience is stored as where it's shared (friends, or the people invited), and a group would be a new kind of audience, not a rewrite. Why: it fits a circle of about 12 now, and lets other circles join without seeing each other's shelves. (Hector, 2026-11-10, on Q1)
- D11. **Games added by hand match BGG's.** A game BGG doesn't list, such as a card game it lacks, has the same fields as a BGG game, with no exceptions, and is marked as ours, so the weekly refresh leaves it alone. If BGG lists it later, the admin merges ours into BGG's and its copies move over. (Hector, 2026-11-10, on Q11)
- D12. **Light mode only.** The app has one theme, a light one, and ignores the phone's dark setting. Why: none of the first round's dark versions worked for Hector, and the game box look is printed cardboard, which reads as light. (Hector, 2026-11-10, on the first style tiles)

### Key flows

- F1. **Joining and stocking a shelf**
  - **Trigger:** a member shares their friend link in the group chat.
  - **Steps:** a friend opens it, signs up and is friends with them at once. They add the rest of the group from the suggested friends of friends, install the app to the home screen, then search for each game they own and tap to add it, several in a row. They suggest any game the catalog doesn't have.
  - **Outcome:** their games are in their friends' libraries.
  - **Covered by:** R2, R3, R4, R39, R43, R49
- F2. **Borrowing**
  - **Trigger:** a member finds a game they want in their library.
  - **Steps:** they tap Borrow on a friend's available copy and add a note. The owner is told, accepts and picks two weeks. They meet up, and the borrower confirms they have it, which sets the due date. Both see it in My loans.
  - **Outcome:** the loan has a due date both sides can see.
  - **Covered by:** R14, R16, R18, R22, R26
- F3. **A loan coming due**
  - **Trigger:** the due date is two days away.
  - **Steps:** the borrower is reminded, asks for one more week, and the owner grants it. Later the borrower marks it returned, and the owner confirms, noting a missing card.
  - **Outcome:** the copy is available again, its history shows the loan, and its condition notes the missing card.
  - **Covered by:** R19, R20, R23, R25
- F4. **Setting up a game night**
  - **Trigger:** a member wants to host on Saturday.
  - **Steps:** they create the night with a capacity of 6, allow guests, pick three games from their shelf and leave it shown to their friends. One friend going brings a guest. Members join until it's full, and the next one goes on the waitlist. A member going adds a game they'll bring. The host opens the suggestions for six people and two hours, adds two of them, and members vote.
  - **Outcome:** everyone sees who's coming and what will be there.
  - **Covered by:** R29 to R33, R37, R38, R47
- F5. **A suggestion**
  - **Trigger:** search can't find a member's game.
  - **Steps:** they suggest it with a photo of the box. The admin finds it's a card game BGG doesn't list and adds it by hand, with BGG's fields. The game lands on the member's shelf, and the member is told.
  - **Outcome:** the catalog has the game for everyone.
  - **Covered by:** R4, R5, R26, D11
- F6. **A pass-along**
  - **Trigger:** Sam owns a game with pass-along on, Alice has it, and Bob, Sam's friend, asks for it.
  - **Steps:** Bob joins the line, and Alice sees someone's waiting. When she's done, she hands it to Bob, and Bob confirms he has it. Alice's loan ends, and Bob's starts with Sam's two weeks. Sam is told Bob has it now. With no one else in line, Bob returns it to Sam.
  - **Outcome:** the game reached Bob without a trip back to Sam, and Sam knew where it was throughout.
  - **Covered by:** R18, R23, R24, R48

### Acceptance examples

- AE1. **Covers R11, R15.** Given two copies of a game, one out until Nov 20, when the library shows it, then its card says 1 of 2 available, and the game's page shows the second copy as out until Nov 20.
- AE2. **Covers R8.** Given a copy that's out, when its owner tries to remove it from their shelf, then the app refuses and says who has it and until when.
- AE3. **Covers R25.** Given a loan due on a Friday that isn't returned, then the borrower is reminded on Wednesday and on Friday morning, the owner is told on Friday, and from Saturday both are told every three days until the owner confirms it's back.
- AE4. **Covers R31, R47.** Given a night with a capacity of 6, guests allowed, and 5 going, when a member going with one guest asks to join, then they go on the waitlist, since they need two places; when someone going changes to can't go, they move to going and are told.
- AE5. **Covers R30, R36.** Given a private night, when a member who isn't invited opens the list of game nights, then they see neither the night nor its place.
- AE6. **Covers R37.** Given 5 going and 90 minutes, then a game that plays best at 4 to 5 in 60 minutes ranks above one that plays at 5 but best at 3, and a game longer than 90 minutes isn't suggested.
- AE7. **Covers R16, D4.** Given a request on a member's copy, when any other member tries to accept it, the admin included, then the app refuses.
- AE8. **Covers R10, R11.** Given two members who aren't friends, when one opens the other's shelf, then the app shows nothing of it, and none of the other's games appear in their library.
- AE9. **Covers R48.** Given a two-week loan with pass-along on, when the next friend in line confirms they have the game on day 10 of the first loan, then the first loan ends, the new one is due two weeks from that day, and the owner is told who has it.
- AE10. **Covers R48.** Given a copy with pass-along off, when its borrower is done and a friend is in line, then the borrower is asked to return it to the owner, and the friend's request waits for the owner.

### Success criteria

- A new member joins through a friend's link, adds the rest of the group as friends, and adds the 20 games they own, in under five minutes on their phone.
- Borrowing takes the borrower three taps from a game's page, and the owner two to accept.
- No loan passes its due date without the reminders reaching both people's inboxes.
- A host sets up a game night with its games in under two minutes.
- The group uses the app, not the group chat, to find out who has a game and to plan nights.

### Scope boundaries

**Outside this product**

- Buying, selling or trading games, and any money: deposits, fees or fines.
- Public profiles, or searching everyone who uses the app for people.
- Chat. The group chat stays where it is, and a request or a loan carries a note.
- App store apps. It's a web app installed to the home screen.

**Deferred to later work**

- Groups, as a second place to share (D10).
- Push notifications (D9). Email isn't planned.
- How-to-play videos (R7), until the core is in use.
- An AI helper for the admin's catalog work (A3).
- Importing a member's own collection from BGG by username.
- Tags of our own (R6), if BGG's attributes turn out to lack something.
- Keeping a phone's calendar in sync as a night changes (R35).
- Logging plays, scores and stats.
- Recurring game nights.
- Scanning a box's barcode to add it.
- Reading the library offline.

### Questions and answers

Every question from the first draft has Hector's answer (2026-11-10):

- Q1 (who sees what), with Q5 (who sees a shelf) and Q12 (the group's size) folded in: friends now, about 12 people to start, and groups as a later addition (D10, R10, R30, R39, R41, R49, R50).
- Q2 (the catalog source) and Q10 (getting started with a big collection): our own copy of BGG's catalog, filled before anyone is invited and refreshed weekly, with calls spaced generously (D7).
- Q3 (tags): BGG's attributes, and no tags of our own for now (D8; R6 dropped).
- Q4 (invites): the host invites people to a night, with a "guests can invite others" switch, and a night downloads as a calendar file (R30, R35).
- Q6 (a game that's out): a line, plus pass-along between friends (R24, R48).
- Q7 (push and email): in the app first; push in a later phase, since it isn't the same effort (D9).
- Q8 (guests): a host can let members bring guests without accounts, counted against the capacity (R47).
- Q9 (game-night tools): a vote on the night's games and a split into tables (R38, R46).
- Q11 (the catalog agent): no agent; the admin handles suggestions and adds games BGG lacks with BGG's fields (D11; A3 and R42 dropped).
- Q13 (the folder): `apps/community-game-library`.

### Needs from Hector

- H1. Register the app for BGG's XML API (boardgamegeek.com/applications) and keep its token for the build. BGG warns that approval can take a week or more, so this is worth starting now.

---

## Notes for the technical half

For the session that writes the technical half, once the recipes performance review is done. Leads to check, not decisions:

- The catalog copy (D7). Facts gathered 2026-11-10 from search results and third-party clients, since BGG's own pages refuse automated reads; confirm each in a browser:
  - BGG holds more than 100,000 games, ranked and unranked, of which about 20,000 or more are ranked.
  - A data dump (`boardgamegeek.com/data_dumps/bg_ranks`, signed in) lists the id, name, rank and average rating of every game, and BGG treats it as part of the XML API for licensing. It's a list of ids to fetch, not the details.
  - The XML API's `thing` call takes at most 20 ids, and `stats=1` adds the weight (`averageweight`) and ratings. The `suggested_numplayers` poll gives each player count's Best, Recommended and Not Recommended votes, and expansions come as `boardgameexpansion` links.
  - BGG publishes no rate limit. Clients space calls 2 to 5 seconds apart and back off on 429; Hector wants the gap generous (D7). A first copy of every game's details is thousands of calls and hours of running: a script, not a Vercel function. A weekly refresh can be light: the new ids in the dump, plus the games on shelves.
  - Still unread: BGG's rules on keeping a copy of its data and on showing or copying its images. These decide whether covers are copied or linked.
- Games added by hand (D11) need ids that can't collide with BGG's, and the merge moves copies, loan history and night lists to the BGG game.
- Search runs on our copy (R2): typo-tolerant title search over 100,000 or more rows, such as Postgres trigram search, sized before choosing.
- Visibility (D10): friendships are mutual rows; a night's audience is stored as where it's shared, so a group can be added as another audience. Recipes' spaces, invite links and roles are worth reading as the later groups' model, and its invite links as the friend link's.
- Loans form a chain under pass-along (R48): each loan is its own row, linked to the one it followed, so history and reminders stay per borrower.
- Reminders and notices need a scheduled job (a daily run), which neither recipes nor the job search app has, or in-app due reminders worked out when the app opens. Push (D9, later) needs the scheduled job and a service worker, which recipes doesn't have; the performance review's cold-open findings point at a service worker too.
- The sign-in methods members get (Google, email codes, Apple), checked against what Neon Auth supports. Sign-up is open (R39).

---

## Session log

- **2026-11-10:** first draft of the product half, from Hector's list of requirements, with gaps marked and open questions. The repo's planning format, the new-app checklist and the job search and recipes apps were read for patterns. BGG's API pages refused automated reads, so its terms here come from search results. **Next:** Hector's answers to Q1 to Q13, then the design system's style tiles.
- **2026-11-10:** Hector's first answers. Taken: our own weekly-refreshed copy of BGG's catalog, filled before launch (D7); BGG's attributes with no tags of our own (D8, R6 dropped); in-app notices only for now (D9); the host invites to a night, with a "guests can invite others" switch and a calendar file (R30, R35); a vote and a table split (R38, R46); the folder name. Q1 became the visibility model (one group, friends or groups), with Q5 and Q12 folded in. Q6, Q8 and Q11 were reworded, and Q7 asked again with what push costs. Hector suggested a tabletop theme for the design. **Next:** Q1, then Q6, Q7, Q8 and Q11.
- **2026-11-10:** Hector's second answers. Friends now and groups later, for about 12 people to start (D10, with friend links R49 and unfriending R50). A line for a game that's out, plus pass-along between friends, which Hector proposed (R24, R48). Guests without accounts, behind a host's switch (R47). No catalog agent: the admin adds games BGG lacks with BGG's fields (D11). Push isn't the same effort as the inbox, so it's a later phase (D9). The design goes toward game box and cardboard. **Next:** Hector checks the proposed items, then the style tiles.
- **2026-11-10:** Hector agreed the product half as it stands, the proposed details included (D2 to D5, D10, D11, R48, R49). **Next:** the design system's style tiles.
- **2026-11-10:** Hector's take on the first style tiles: Box lid and Punchboard, leaning Punchboard, and light mode only (D12, R43 revised). **Next:** round two of the style tiles, around those two.
