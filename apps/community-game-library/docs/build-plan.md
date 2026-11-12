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
| Phase | The plan is agreed (2026-11-12): the whole data model ([data-model.md](data-model.md)), the technical half's decisions and code map (below), and 26 units in 8 batches, each a task in Hector's tracker. The design is finished ([screens.md](screens.md)) |
| Next | This spec's PR merging; then Batch 1, with H7 before its push and H3's production project before its merge |
| Then | Batches 2 to 8, with motion last (D13). The catalog's source is its own effort beside the build, and decides when the first friends are invited (KTD21, [catalog-data.md](catalog-data.md)) |
| Waiting on Hector | The spec PR's merge; H3 and H7 before Batch 1; H2, H4 and H9 before launch; H6, the catalog's source, beside the build, with H1 if it's BoardGameGeek |
| Updated | 2026-11-12 |

---

## How to read this spec

- Requirements (R) say what the app does. Each ends with where it came from: *asked* is from Hector's list or his answers of 2026-11-10, and *gap* is something Claude added because a good library or events app is expected to do it. Any gap can be cut.
- Decisions (D) are product choices with their reasons. Hector agreed every one on 2026-11-10, including the details Claude proposed.
- A requirement or decision that changed after Hector saw it says so, with the date and the question it came from.
- Needs from Hector (H) are steps only he can take.
- Key technical decisions (KTD) are the technical half's choices of mechanism, with their reasons. Claude proposed them on 2026-11-12, and Hector agreed them the same day.
- Units (U) are the build's steps. Each is a task in Hector's tracker under the same U number, holding why it exists, what to read first, its plan, its references and its acceptance criteria; this spec holds what every unit shares. A batch is the units one PR holds.
- A line marked "Audit, 2026-11-11" is a rule Claude added from the usability audit of the screens, where a screen couldn't be drawn without one. Hector agreed them on 2026-11-12.
- The screens drawn for these requirements, the rules they follow and the states between them are in [screens.md](screens.md).

---

## Goal Capsule

- **Objective:** friends always know who owns which board games, borrow them with due dates nobody has to remember, and set up game nights with the right games for the people coming.
- **Means:** a phone-first web app installed to the home screen (a PWA), in hector-mono on hectors-recipes' architecture: clean architecture, Neon Postgres, Drizzle, Neon Auth and Vercel.
- **Authority:** requirements win on behavior, and the technical half's decisions win on mechanism. The root and app `AGENTS.md` rules (never loosen a check, no write to a real database without Hector's OK at that moment, the public-repo rules) override this spec.
- **Stop conditions:**
  - BoardGameGeek's terms don't allow keeping a copy of its catalog, or showing its images: stop catalog work and bring it back to Hector (D7).
  - Any task would put a member's name, contact or address into the repo: stop, and keep it in the database.
- **Execution profile:** agents build, one batch of units per PR (KTD20). Hector reviews and merges each PR, looks at two gates, and takes the account and production steps (Needs from Hector).

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

On screen the app says it differently, in Hector's words of 2026-11-11: a member's shelf is their library ("My library", "Sam's library"), and the library across friends is the view called "All friends", which includes the member's own games. The screens never say "shelf". This spec keeps its own words above, so its requirements read the same as when they were agreed.

### Requirements

**Catalog**

- R1. The catalog holds, for each game or expansion: its title, year, one image, description, player count range and the counts it plays best at, play time, minimum age, complexity (light, medium or heavy), categories (the genre, such as party or card game), designers, publishers, its expansions or base game, a how-to-play video, and a popularity that orders search. Only the title is required, and a screen shows a value only when the game has it. The tables are in [data-model.md](data-model.md). *asked* (Revised 2026-11-12, Hector on the data model: other names, mechanics, ratings and a second image size are left out of the first release, complexity is a word rather than BGG's 1 to 5 weight, and the video is in.)
- R2. Search finds a game by title as it's typed, ignoring case, punctuation and leading articles, and tolerates a typo or a missing word ("ticket ride" finds Ticket to Ride). Each result shows its cover, year and publisher, so editions and same-named games can be told apart. Search covers every game in the catalog, not only the ones members own, and shows its results in two groups: first the games on the member's own and their friends' shelves, then the rest of the catalog. Among close matches, more popular games come first. *asked* (Revised 2026-11-11, Hector on the screens: the two groups. Revised 2026-11-12, Hector on the data model: popularity orders close matches.)
- R3. A member adds a game to their shelf with one tap on a search result, and can add several in a row without leaving search. Adding starts from the member's own shelf or from a catalog result in search. The view of everyone's games has no add button of its own, since it shows what people already have. *asked (one tap); gap (several in a row)* (Revised 2026-11-11, Hector on the screens: where adding starts.) *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* An expansion isn't added as a game of its own. It's ticked on the member's copy of the base game (R8).
- R4. When search can't find a game, the member suggests it: its title, and optionally its year, publisher, a link and a photo of the box. The admin adds it or declines it with a reason, and the member is told either way. An added game lands on the suggester's shelf. With the catalog a copy of BGG's (D7), a miss is rare: a game newer than the last weekly update, which the admin can pull from BGG at once, or one BGG doesn't list, which the admin adds by hand (R5). *asked; gap (the outcome and the notice)* (Revised 2026-11-10, Hector on Q11: the admin handles suggestions, with no catalog agent.) *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* The admin can also answer that the game is already in the catalog, which points the member to it and adds it to their shelf. A decline needs its reason.
- R5. The admin can correct a game's details, set its how-to-play video, and add a game the catalog lacks, with the same fields as any other game. The game's row holds its current details, and no history of changes is kept. *asked* (Revised 2026-11-12, Hector on the data model: no history, since the row is the one source of truth and there is one admin. This replaces "every change records who made it" and the audit's rule that the admin can go back to BGG's value. Whether a correction survives a refresh is settled with the source.)
- R6. Dropped 2026-11-10 (Hector, Q3): no tags of our own for now. Filters use BGG's own attributes (D8), and tags come back only for something that data turns out to lack. *asked*
- R7. A game can carry one how-to-play video, which plays on its page. *asked* (Revised 2026-11-12, Hector on the data model: in the first release, as an optional link; it had been a later phase.)

**Shelves and friends**

- R8. A copy records its game, its owner, the expansions in the box, its condition and any missing parts, whether its owner lends it, whether friends can pass it along (R48), and when it was added. Its owner can edit or remove it, except while it's on loan. A copy its owner doesn't lend, such as a special edition, still shows to friends, marked not lent, and can't be requested. A copy's page links to its game's page (R14). *asked; gap (expansions, condition, whether it's lent)* (Clarified 2026-11-11, Hector on the screens: a copy that isn't lent, and the link.)
- R9. A member can own more than one copy of a game, and each copy lends on its own. *gap*
- R10. A member can open their own shelf to manage it and any friend's shelf to browse and borrow from. Someone who isn't a friend sees neither. *asked* (Revised 2026-11-10, Hector on Q1: friends, not one group.)
- R49. Each member has a friend link to share, say in the group chat. Opening it, signed in or after signing up, makes the two people friends at once. A link lasts a week, and making a new one ends the old one. The app also offers one-tap friend requests, which the other person accepts, to a friend's friends and to people from a game night you went to. There's no search of everyone who uses the app. *asked (friends, Q1); gap (how people become friends)* *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* A member can decline a friend request, which the sender isn't told, and can cancel one they sent.
- R50. Either friend can unfriend the other, and neither is told. From then on they don't see each other's shelves or game nights. A loan still open between them stays visible to both until the game is back, and each leaves the other's lines. *gap* *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* Each is also taken off the other's game nights, and a request between them is withdrawn.

**Browsing the library**

- R11. The library shows every game on your shelf and your friends' shelves, one card per game, with its cover, its key facts and whether a copy is available now ("1 of 2 available", "Out until Nov 20"). It filters, in any combination, by:
  - player count: plays with N, or plays best with N
  - play time
  - complexity
  - minimum age
  - category
  - owner
  - available now

  The filters people reach for most come first: available now, owner, player count and play time. Complexity, category and minimum age are folded away until opened.

  *asked (filters, friends' games); gap (one library view across shelves, availability)* (Revised 2026-11-11, Hector on the screens: the order, and folding the rest away.) *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* Play time filters as a cap (30 minutes or less, an hour or less, two hours or less), and the player count starts on "plays with". (Revised 2026-11-12, Hector on the data model: no mechanic filter in the first release, and, by his rule that what has no data isn't shown, a filter appears only when some game in view has its value.)
- R12. Library and shelf lists sort by title, recently added, complexity, play time, year or most borrowed. Sorting is its own control, apart from the filters. *gap* (Revised 2026-11-11, Hector on the screens: apart from the filters.)
- R13. Filters and sort live in the page's address, so going back keeps them and a filtered view can be shared in the group chat. *gap*
- R14. A game's page leads with its cover at full quality, then its facts (players with the best counts, time, age, complexity), description, categories, expansions, the how-to-play video, and which of your friends own it, with each copy's state and a Borrow button. A member who owns a copy sees it there too, with a link to the copy's own page, where they manage it (R8). *asked* (Revised 2026-11-11, Hector on the screens: the game's page and the copy's page stay separate and link to each other. Revised 2026-11-12, Hector on the data model: no mechanics, and only what the game has is shown.)
- R15. A copy shows its state wherever it appears: available, requested, out (with its due date and how many are in line), or not lent. *gap*

**Lending**

- R16. A member requests a friend's copy that its owner lends, with an optional note ("Can I grab it Friday?"). The owner accepts and sets the loan period (1 week, 2 weeks, a month, or a date), or declines with an optional note. *asked (the owner sets the period); gap (the request and the decline)*
- R17. An owner can record a loan made in person, picking the friend and the period, with no request first. *gap* *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* The owner also gives the day it was handed over, which starts as today, so a loan recorded late doesn't gain days.
- R18. A loan's due date counts from the day of the handoff. The person receiving the game confirms it and gives the day they picked it up, which starts as today and can be set to an earlier day, so confirming late doesn't move the due date. A direct lend is handed off at once (D5). *gap* (Revised 2026-11-11, Hector on the screens: the pick-up day, since most people confirm late.) *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* The owner can confirm the pick-up too, giving the day, so a loan never waits on a borrower who forgets.
- R19. The borrower marks a game returned and gives the day it came back, which starts as today. From then on the loan can't run overdue and its reminders stop (D15). The owner confirms it, noting any missing parts or damage on the copy, or says they don't have it yet, which starts the loan running again. A return the owner hasn't answered a week later closes by itself, on the borrower's day. The owner can also mark it returned without waiting, giving the day. *gap* (The return day was added 2026-11-11 by Claude to match R18's pick-up day. Confirmed 2026-11-12, Hector: a generous default that assumes good intent, so a loan doesn't show as overdue when the game is back, D15.)
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

  With it off, the borrower returns the copy, and the owner accepts the next request in line as usual. Only the owner's friends can join a line, since they're the ones who see the copy. The two borrowers needn't be friends: the app shows each the other's name, and phone if they've added one, for the handoff. *asked (Hector, Q6)* *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* A pass-along stays the giver's loan until the next friend confirms they have the game, and the giver can take it back until then. Meanwhile it can't run overdue (D15, 2026-11-12).

**Notifications**

- R25. The borrower is reminded two days before a loan is due and on the morning it's due. The owner is told on the day it's due back. Once it's overdue, both are told, and again every three days until it's returned. *asked* (Revised 2026-11-12, Hector on the return day: the overdue reminders stop once the borrower says they've handed the game over, D15.)
- R26. Members are also told about: a request on their copy, the answer to their request, a friend request, someone joining the line for a game they have, their turn coming up in a line, a pass-along to confirm, a request for more time and its answer, a return waiting for them to confirm, a game-night invite, a change to or cancellation of a night they're going to, a place opening for them on a waitlist, the morning of a night they're going to, and the outcome of their suggestion. *gap* *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* The admin is told when a suggestion arrives.
- R27. Every notice lands in an inbox in the app, with an unread count. The inbox lists what happened and links to it; what waits on a member is also counted on the tab it lives in (D14). *gap* (Revised 2026-11-10, Hector on Q7: in the app only for the first release; push comes in a later phase, D9. Revised 2026-11-11, Hector on the screens: the inbox links and doesn't act.)
- R28. Each member picks which kinds of notice they get. Loan reminders are on by default. *gap*
- R52. Where timing matters, the app offers to pass the news on directly, since a notice reaches only the inbox and is seen when its reader next opens the app (D9). After cancelling a night or calling a game back, the member is offered a ready message through the phone's share sheet, to send by text or in the group chat. *gap (from the usability audit of 2026-11-11; Hector agreed 2026-11-12)*

**Game nights**

- R29. A member creates a game night with a title, a date and start time, an optional end, a place, a capacity (the most people, host included), a note, and the games that will be there, picked from their own shelf; members going add theirs (R32). *asked*
- R30. A game night shows to the host's friends by default, and anyone who sees it can join while there's room. A private one is seen and joined only by the people its host invites, directly or with the night's link. Only the host invites, unless they turn on "guests can invite others", as a calendar invite allows. People at the same night who aren't friends see each other's names and the night's games, not each other's shelves. *asked* (Revised 2026-11-10, Hector on Q1: shown to friends, not the whole group.) *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* The host can make a new link for a night, which ends the old one.
- R31. Members answer going, maybe or can't go. Going counts against the capacity. Once a night is full, more members can join its waitlist; when a place opens, the first on the waitlist who fits takes it and is told. *gap*
- R47. A host can let members bring guests who don't use the app. A member going then says how many guests they're bringing, and each guest takes a place against the capacity, with no account and no RSVP of their own. It's a separate switch from "guests can invite others". *asked (Hector, Q8)*
- R32. A member who's going can add games from their own shelf to the night's list ("I'll bring it"). *gap*
- R33. Upcoming game nights lists the ones a member can see, soonest first, with the places left. Past nights fold away. *asked* *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* A night waits on a member, and counts on the Nights tab, when they were invited by name and haven't answered.
- R34. The host can edit or cancel a night, and members going are told. *gap*
- R35. A game night can be added to the phone's calendar by downloading its calendar file (.ics). Keeping the calendar in sync as a night changes is later work. *gap; asked (Hector, Q4)*
- R36. A game night's place is shown only to people who can see the night. *gap*

**Game-night tools**

- R37. For a game night, the app suggests games from the night's list, or from the host's library, ranked by how well each fits:
  - the number going, guests included: plays best at that count first, then plays at it
  - the time available
  - the complexity the host wants: light, medium, heavy, or light enough for new players

  Each suggestion says why it fits ("Best at 5 · 60 to 90 min · medium"). *asked* (Revised 2026-11-12 by Claude, to match the approved screen D8: the games come from the night's games on the table, or from all the member's friends' games, their own included, not only the host's library. Hector agreed the same day.)
- R38. Before a night, members going can vote on the games on its list, and the host sees the ranking. *gap (Hector took it on Q9)*
- R46. When more people are going than one game seats, the app proposes tables: a split of the people going, with a game for each table that plays well at its size and fits the time. *gap (Hector took it on Q9)*

**Accounts and access**

- R39. Anyone can sign up, with Google or an email address, and a new account sees the catalog and nothing else until it has friends. Signed-out visitors see only the welcome page, which carries the app's name and no member's. *gap* (Revised 2026-11-10, Hector on Q1: it had been invite-only, which friends make unnecessary. Revised 2026-11-11, Hector on the screens: Google and Apple sign-in. Revised again the same day: Apple is left out, since it isn't a quick setup; the reason is in the notes for the technical half.) *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* A link opened inside a chat app's own browser asks the person to open it in their phone's browser, since Google sign-in and the home-screen step don't work there.
- R40. A member's profile has their name, a photo, and an optional phone number for arranging handoffs, shown only to their friends and to the other person in a loan or a pass-along. *gap* (Hector, 2026-11-11: keep the photo, with a simple file bucket to hold it.)
- R51. Each member picks a playing piece, a shape and a color, which stands for them wherever they appear: in a seat at a game night, in a line, and next to a loan or a copy (D13). There are four shapes (a pawn, a cone, a house and a ship) and ten colors, so every friend in a circle can have their own. *asked (Hector, 2026-11-11, on the screens: more variety than one pawn in twelve colors. Later that day he kept three of the five shapes drawn and asked for more colors, and on 2026-11-12 he added the ship.)*
- R41. A member can delete their account once their loans are settled; their copies leave their friends' libraries with them. The admin can remove an account that misuses the app. *gap* (Revised 2026-11-10, Hector on Q1: the admin runs the catalog, not the membership.) *Audit, 2026-11-11 (added by Claude; Hector agreed 2026-11-12):* Deleting an account also cancels the nights its member hosts and ends their requests and places in line, and the page says so first.
- R42. Dropped 2026-11-10 (Hector, Q11): the catalog agent's tools. *asked*

**The app**

- R43. The app installs to the home screen on iPhone and Android, opens full screen, and is built for phones first. On a tablet or laptop it is the same app with more room: the same pages in the same order, with the tabs moved into the header, browsing lists in columns and sheets shown as dialogs. No page or feature exists at one size only. It has a light theme only (D12). *asked* (Revised 2026-11-10, Hector on the first style tiles: it had a dark mode too. Revised 2026-11-11, Hector: no separate laptop layout, so the experience doesn't differ by device.)
- R44. Opening the installed app after a day away shows the member's content quickly. The technical half sets the target from the recipes performance review. *gap*

**Privacy**

- R45. The public repo holds no member's name, email, phone or address. Code, tests, fixtures, screenshots, commit messages and PR text use fictional people. *gap*

### Decisions

- D1. **A library, not a list.** A game exists once in the catalog, and members add copies of it. Members don't type in games of their own: a missing game goes through a suggestion (R4). Why: one rich record per game for everyone, no near-duplicates ("Catan" and "Settlers of Catan"), and filters that work across every shelf. *asked*
- D2. **Rules, not AI, in the app.** Game suggestions for a night (R37) and table splits (R46) come from readable rules over the catalog's data, with their reasons shown. Why: answers members can check, and no model costs or keys in the app, as in the job search app.
- D3. **No money, deposits or penalties.** Overdue means reminders, not fees. Why: these are friends.
- D4. **The owner decides.** Only a copy's owner accepts or declines a request on it, sets its period, extends it, turns on pass-along or confirms its return. The admin can't lend someone else's copy.
- D5. **The period counts from the handoff.** The owner picks a period when accepting, and the due date counts from the pick-up day the person receiving the game gives when they confirm they have it (R18). Why: a request accepted on Monday and picked up on Saturday shouldn't lose five days, and someone who confirms a few days late shouldn't gain them. A direct lend (R17) skips the confirmation. (Revised 2026-11-11, Hector on the screens: the pick-up day.)
- D6. **Architecture from recipes.** The app copies hectors-recipes' code and system architecture once its performance review is done, and the technical half starts from that review's lessons. *asked*
- D7. **The catalog is our own copy of BoardGameGeek's.** It's filled from BGG before anyone is invited, so the library is full on day one, and a script refreshes it about once a week. The script spaces its calls generously, so it never strains BGG's service, however long the first copy takes. Search runs on our copy, so members never wait on BGG. Why: BGG is the most complete source there is, and there's no reason to rebuild it. (Hector, 2026-11-10, on Q2 and Q10)
- D8. **The catalog's attributes are BGG's.** Players, best player counts, time, age, weight, categories and mechanics come as BGG records them, and the app adds no tags of its own until that data turns out to lack something. BGG's categories include Card Game, which may already separate a card game from a big board game. (Hector, 2026-11-10, on Q3)
- D9. **Notices start in the app, and push follows.** The first release has the in-app inbox only, with no push and no email. Push is a later phase: about as much work again as the inbox (a service worker, storing each phone's subscription, a scheduled sender, the iPhone home-screen step, and testing on real phones), so not the same effort, which was Hector's test. The inbox is built so push is one more way to deliver the same notices, not a rewrite. (Hector, 2026-11-10, on Q7)
- D10. **Friends now, groups later.** Who sees what follows friendship (R10, R30). Groups can come later as a second place to share, as on Facebook, where a post goes to your friends or to a group, each with its own visibility. So a shelf's and a night's audience is stored as where it's shared (friends, or the people invited), and a group would be a new kind of audience, not a rewrite. Why: it fits a circle of about 12 now, and lets other circles join without seeing each other's shelves. (Hector, 2026-11-10, on Q1)
- D11. **Games added by hand match BGG's.** A game BGG doesn't list, such as a card game it lacks, has the same fields as a BGG game, with no exceptions, and is marked as ours, so the weekly refresh leaves it alone. If BGG lists it later, the admin merges ours into BGG's and its copies move over. (Hector, 2026-11-10, on Q11.) On hold with the source since 2026-11-12: the data model records no source, so a game isn't marked as ours and the merge (G6) is out of the first release.
- D12. **Light mode only.** The app has one theme, a light one, and ignores the phone's dark setting. Why: none of the first round's dark versions worked for Hector, and the game box look is printed cardboard, which reads as light. (Hector, 2026-11-10, on the first style tiles)
- D13. **The look is Punchboard.** The inside of a game box: kraft and chipboard, navy ink, stencilled labels, rubber stamps and dashed die-cut edges. A stamp is a status, and a dashed edge marks something die-cut, a thing you can pick up. Color comes from game pieces, and each kind has one job on every screen: a pawn is a person, dice are a player count or a suggestion, a punch token is a copy, and a track with the borrower's pawn on it is the days on a loan. Why: of the eight style tiles it read most like a real board game, and the stamps and dashed edges were what people pointed to. One job per piece keeps the theme carrying information, not sitting on top of it. (Hector, 2026-11-10, on the style tiles.) The home-screen icon is Three pieces, and motion is added last, once everything else is built (Hector, 2026-11-12).
- D14. **Each thing has one home, and it's changed only there.** A game, a copy, a loan, a game night and a friend each have a page, and that page is the only place its buttons live. Lists, cards and the inbox show a thing's state and open its page. The app has four tabs (Library, Nights, Loans, Friends), each showing a count of what waits on the member there. The inbox opens from a bell beside the member's piece, lists what happened and links to it, and has no buttons of its own. Why: in the first screens one borrow request showed in four places with a button in two, and Hector couldn't tell where he was meant to act. The other choices were to make the inbox the one to-do list, which leaves requests visible on the loans tab that can't be answered there, or to add a home tab, which repeats things on purpose. A later push notification can open the same page. (Hector, 2026-11-11, on the screens)
- D15. **Assume good intent.** A member's word that they handed a game over counts. Once a borrower says they gave a game back, or gave it to the next friend in line, their loan can't run overdue and its reminders stop. A return the owner hasn't answered a week later closes by itself, on the day the borrower gave. Why: these are friends who trust each other, and a game that's back on its shelf shouldn't show as overdue because someone didn't tap a button. (Hector, 2026-11-12, on the return day. Claude applied it to a pass-along too and picked the week, and Hector agreed the same day.)

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
- A game's mechanics, other names and ratings (R1).
- Merging a hand-added game into a source's record (D11), and anything else that needs a data source, until one is chosen.
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
- H2. Set up Google sign-in for Neon Auth before launch (R39): a Google OAuth client with its consent screen verified. The steps are in the notes for the technical half.
- H3. Neon, before U1's database steps. An OK for Claude to create the test project, `community-game-library-test`, in AWS US East (N. Virginia), with Neon Auth and object storage. Then, before Batch 1 merges, create the production project yourself in the same region, since object storage runs only in some regions (KTD11), and put its values in Vercel's Production environment, so no production secret passes through a Claude session (KTD1). Hector gave the OK on 2026-11-12, and Claude made the test project that day, with Neon Auth (sign-up checked by a code, localhost allowed), the test-database comment and both buckets. Its storage credential is left for U1, so the secret goes straight into the app's `.env`. The production project is still Hector's.
- H4. Neon Auth on production, before launch: your own email sender (SMTP), the application name "Community Game Library", the production domain as its trusted domain, and localhost access off (KTD3).
- H5. An OK, before U2, on how the theme reaches what tokens can't: restyling the shared components by `data-slot` inside the theme file (KTD12, the design system's building.md). Given 2026-11-12.
- H6. The catalog's source, before U24 ([catalog-data.md](catalog-data.md), KTD21). The build doesn't wait on it; the first friends' invitations do. Hector's call (2026-11-12): settle it as a separate effort while the app is built.
- H7. Vercel, before Batch 1's first push: the project rooted at `apps/community-game-library`, with Skip deployment on and no Ignored Build Step (KTD20); communitygamelibrary.com pointed at it; Preview's variables, the test project's values, which Claude can enter with your OK once U1 has made the storage credential; Production's variables from H3; `CRON_SECRET` before U17 merges (KTD8).
- H8. The gates: the shell and getting in on Batch 1's preview, and the first full slice after U6 (Batches and units).
- H9. Launch, once U25 has checked production: open the app on your phone after a day away (KTD2), then share your friend link with the circle.

---

## Notes for the technical half

For the session that writes the technical half, once the recipes performance review is done. Leads to check, not decisions. The technical half below settled them on 2026-11-12, and they stay as the research behind its decisions:

- The catalog copy (D7). Facts gathered 2026-11-10 from search results and third-party clients, since BGG's own pages refuse automated reads; confirm each in a browser:
  - BGG holds more than 100,000 games, ranked and unranked, of which about 20,000 or more are ranked.
  - A data dump (`boardgamegeek.com/data_dumps/bg_ranks`, signed in) lists the id, name, rank and average rating of every game, and BGG treats it as part of the XML API for licensing. It's a list of ids to fetch, not the details.
  - The XML API's `thing` call takes at most 20 ids, and `stats=1` adds the weight (`averageweight`) and ratings. The `suggested_numplayers` poll gives each player count's Best, Recommended and Not Recommended votes, and expansions come as `boardgameexpansion` links.
  - BGG publishes no rate limit. Clients space calls 2 to 5 seconds apart and back off on 429; Hector wants the gap generous (D7). A first copy of every game's details is thousands of calls and hours of running: a script, not a Vercel function. A weekly refresh can be light: the new ids in the dump, plus the games on shelves.
  - Read on 2026-11-12, from BGG's own pages: its rules on access, on keeping a copy and on what its license covers, with a survey of every other source. They are in [catalog-data.md](catalog-data.md). Its proposed changes to D7, R1, R5 and R11 assume one way of sourcing the data and are undecided. Hector's direction (2026-11-12): a simple data model first, holding only the values the spec and the drawn screens use, with no plan yet for how the data is sourced. The catalog's model, which Hector confirmed on 2026-11-12, is in [data-model.md](data-model.md).
- Games added by hand (D11) need ids that can't collide with BGG's, and the merge moves copies, loan history and night lists to the BGG game.
- Search runs on our copy (R2): typo-tolerant title search over 100,000 or more rows, such as Postgres trigram search, sized before choosing.
- Visibility (D10): friendships are mutual rows; a night's audience is stored as where it's shared, so a group can be added as another audience. Recipes' spaces, invite links and roles are worth reading as the later groups' model, and its invite links as the friend link's.
- Loans form a chain under pass-along (R48): each loan is its own row, linked to the one it followed, so history and reminders stay per borrower.
- Reminders and notices need a scheduled job (a daily run), which neither recipes nor the job search app has, or in-app due reminders worked out when the app opens. Push (D9, later) needs the scheduled job and a service worker, which recipes doesn't have; the performance review's cold-open findings point at a service worker too.
- Sign-in (R39). Neon Auth's docs, read 2026-11-11 (`neon.com/docs/auth/guides/setup-oauth`), list Google and Apple among its social sign-in providers, beside email and password, email codes and magic links:
  - Google works in development on credentials Neon shares, which show Neon's name on the consent screen. Production needs our own Google OAuth client, and Google's verification before anyone outside a test list can use it.
  - Apple is left out (Hector, 2026-11-11). It has no shared credentials: it needs four values from an Apple Developer account (a Services ID, a `.p8` key, the Team ID and the Key ID), and an HTTPS return address, so it can't be tried on localhost. That account has to be a paid one: an Apple engineer's answer on Apple's developer forum says "Sign in with Apple requires membership in the Apple Developer Program" (`developer.apple.com/forums/thread/766107`), and Apple lists that program at "$99 annual membership" (`developer.apple.com/programs`); both read 2026-11-11. Neon Auth lists Apple as a provider, so it can be added later.
  - Each Neon branch has its own auth address, so each provider's return address is registered per branch.
  - Recipes renders Neon's own sign-in view (`AuthView`), so the screen's layout is mostly Neon's, restyled.
- Uploaded images: the box photo on a suggestion (R4), the cover of a game added by hand (R5) and the profile photo (R40). Recipes stores no files, so this is new ground. Hector's pick is a bucket in Neon. Neon Object Storage (`neon.com/docs/storage/overview`, read 2026-11-11) is S3-style, branches with the database, includes 5 GB on the free plan, and runs only in some regions (US East Ohio and N. Virginia, Frankfurt, Singapore), so the project's region decides whether it can be used.
- Wider screens (R43). One breakpoint, at 768px, and nothing that exists at one size only:
  - The four tabs move from the bottom bar into the header beside the app's name; the bell and the member's piece stay top right.
  - A page is one centered column: 640px for a page that's read or filled in, 1080px for a list that's browsed.
  - Browsing lists (the library, adding games, a friend's library, picking games for a night) show the same rows in two columns from 768px and three from 1100px. A page about one thing keeps its groups stacked in one column.
  - A sheet becomes a centered dialog 480px wide with the same content.
  - Tap targets and type sizes don't change. A pointer gets hover states, and keyboard focus is the dashed ring.
  - No side panels, split views or tables.

---

## The technical half

Written 2026-11-12, after the recipes performance review (`docs/fast-first-open.md`), with job-search's build as the precedent. Hector asked for every decision, the code map and every unit up front, so building is following them, and for PRs that hold several units, so the free plans' daily build limit isn't spent in a day. Claude proposed everything here on 2026-11-12, and Hector agreed it the same day, taking Claude's recommendation on each open choice. A decision that changes later is marked revised with its date, not rewritten.

### How to build a unit

For the agent building one:

1. Start from the unit's task in Hector's tracker, under its U number. Its description says why the unit exists, its batch and branch, the model it wants, what to read first and what it leaves to other units. Its plan holds the build steps and tests, written with this spec. Its references name the parts of this spec, [data-model.md](data-model.md) and [screens.md](screens.md) it touches, the canvas's boards, and the files to copy. Its acceptance criteria say what's true when it's done. The tracker's own task-execution guide (`backlog instructions task-execution`) says how to work a task.
2. Read the root `AGENTS.md`, this app's `AGENTS.md` (from U1 on), `packages/ui/AGENTS.md` for any screen, and `docs/clean-architecture.md`. Then read the parts of this spec the task names, and the code map below for every name.
3. Read each board the task names from the design canvas with the Artifact tool (`read`, with `path` set to `project/<board>.dc.html`), and the design system pages it names (`project/components/<Name>/README.md`). The links to both are in the tracker, since they're private and this repo is public. A board's words, order and states are its screen's spec, and the design system's rules hold on every screen.
4. Check the task's plan against the code as it now stands and revise it there, as the tracker's guide says, then build inward-out (`docs/clean-architecture.md` §9): the entity and its tests, the repository and its mock, the use case with tests on both backends, the controller, the action, then the page and its screen tests. Copy the files the task names as exemplars rather than starting a pattern of your own.
5. Work through the acceptance criteria. Commit once per unit on the batch's branch, as `feat(community-game-library): U<n> <summary>`. Don't push until the batch is ready for review, or a gate asks for a preview (KTD20).
6. Before stopping, record progress in the task: its criteria, notes and status. Change this spec only for a decision that changes it, marked revised with its date. Where the task and a board disagree, the board wins on words and layout and the spec on behavior; say so in the task.

### Key technical decisions

**Setup**

- KTD1. **Copied from recipes, with job-search's privacy rules.** The app copies `apps/hectors-recipes`' infrastructure rather than sharing it (D6), as job-search did. Next.js 16 with Cache Components and partial prefetching, React 19 with the compiler, Tailwind through `@repo/ui`, Neon Postgres through `@neondatabase/serverless`, Drizzle with generated migrations, Neon Auth, DI with `@evyweb/ioctopus`, and `bun:test` with PGlite. Not copied: the AI reader, live updates (Ably), the page and PDF fetchers, and spaces with their roles. U1 copies, renamed for this app:
  - `lib/auth/server.ts` (with the day-long session copy, KTD2), `lib/logger.ts`, `db/index.ts` and `proxy.ts`
  - `app/(api)/api/auth/[...path]/route.ts`, `app/actions/shared.ts`, and in `app/_lib/`: `call-action.ts`, `current-user.ts`, `safe-redirect.ts`, `auth-paths.ts` and `use-closes-on-leave.ts`; and in `app/_components/`: `back-link.tsx` and `action-form.tsx`
  - `src/entities/errors/common.ts` and `src/entities/week.ts`, with job-search's `src/entities/errors/loggable.ts`
  - `src/infrastructure/repositories/base.repository.ts`, and the `neon-auth`, `transaction-manager` and `console-logger` services with their mocks
  - `di/container.ts`, `di/types.ts`, and the authentication, logger and transaction modules
  - `tests/_support/` (`preload`, `next`, `app`, `database`, `controller`, `dom`, `focus`, `form`, `static-imports`), `tests/di/container.test.ts`, `tests/app/layout.test.ts` and `scripts/check-test-database.ts`
  
  Three things differ from recipes, as in job-search:
  - Local development and previews use a Neon test project. Production's values live only in Vercel's Production environment and never pass through a Claude session, and production migrations run with Hector's OK at that moment, through the Neon MCP or his terminal (job-search KTD17). Recipes uses its production database locally, and `.worktreeinclude` copies `.env` into every worktree.
  - Logs carry error classes, codes and record ids, never a field's value (job-search KTD20, `loggable`), since the database holds friends' names, phone numbers and addresses.
  - The admin is the account whose id is `ADMIN_USER_ID`.
- KTD2. **A fast first open from the first deploy (R44).** The target: opened from the home screen after a day away, the page last read shows at once from the phone's saved copy, and the fresh page arrives within about three seconds of a cold start (recipes measured 33 ms and 3.0 s, `docs/fast-first-open.md`). Every pattern in that doc's checklist applies:
  - the session copy lasts a day
  - the object-storage client loads on first use, with recipes' container import test
  - a request's first reads run in a row
  - Neon's sign-in kit sits only in the sign-in and account layouts, with recipes' layout test
  - the service worker keeps saved copies (U23)
  
  U25 measures a cold open on production and records the numbers here.
- KTD3. **Accounts: Neon Auth, with Google and email (R39).**
  - Email and password, with sign-up checked by a code. Neon's shared sender can send codes and password resets, but not verification links (Neon's Auth production checklist, read 2026-11-12). Google signs in on Neon's shared credentials in development, and on our own OAuth client in production (H2).
  - Before launch, on the production project: our own email sender (SMTP), the application name "Community Game Library", the production domain as the only trusted domain, and localhost access off (H4). The test project trusts localhost and each preview branch's alias, as job-search's does.
  - The sign-in pages render Neon's `AuthView`, restyled through `classNames` and `localization`, as recipes does.
  - After sign-in, a member with no `user_profiles` row goes to set up their profile (A4). One with a `removed_users` row sees only that the account was removed. Everyone else gets the app.
  - A link opened inside a chat app's own browser (A9). The welcome page and both link pages check the user agent against a short list of known in-app browsers (`src/entities/in-app-browser.ts`, each with a test) and show A9 in place of sign-in. U5 checks the list against each app's published user agent.
  - The proxy (recipes' `proxy.ts`) sends signed-out requests to `/welcome`, except `/welcome`, `/auth/*`, `/f/<token>`, `/n/<token>`, `/sw.js`, the manifest, the icons, the link-preview images and `/api/cron/daily`, which checks its own secret. Each exception has a proxy test.

**Data and rules**

- KTD4. **Who sees what is checked in every use case (D10, R10, R30, R36).**
  - Another member's copies, profile, phone, photo or nights are read only after `requireFriend` (`src/application/use-cases/friends/require-friend.ts`), and repository reads take the viewer's id and join `friendships`, so a stranger's rows never load (AE8). The other person in an open loan or a pass-along sees the name, piece and phone, friends or not (R40, R48).
  - A night is read only after `canSeeNight`: the host, anyone with an attendee row, or the host's friends when its audience is `'friends'`. The place, address and list load only after it (AE5). People at one night see each other's names and pieces, never each other's libraries (R30).
  - A link, a friend's or a night's, opens only what it's for. Its token is the 8-character code the boards draw (`K7Q2-HARB`, data-model.md), checked for its form before any read, as recipes checks its share tokens.
  - Every repository and use case that reads another member's rows has a test with a stranger, on both backends.
- KTD5. **Every table in one migration.** U3 creates the whole of [data-model.md](data-model.md) in the app's first migration, with its checks and indexes. A later unit changes the schema only when its task says so, with one migration per batch at most, additive before the deploy that uses it and drops after (recipes' Backend Rules). Two batches in progress never both touch `db/schema.ts`.
- KTD6. **Loans are one state machine.** `src/entities/loan.ts` (U3) holds data-model.md's statuses and moves as pure functions:
  - which moves each person may make: the owner, the borrower, or the next friend in line
  - the dates, with a month as 30 days
  - when a loan is overdue
  - the copy's line
  - a copy's state for whoever is looking (R15, B13): available, requested, you asked, 2nd in line, out until Nov 20, not lent, yours
  
  Every loan write takes the copy's row lock first (`select … for update` on `user_games`), so two answers can't both land. A change that no longer applies throws `ChangedError` with a reason, which the screen turns into its line and next action (KTD16). Only a copy's owner answers, sets the period, extends, changes the due date, calls back or confirms a return, and anyone else, the admin included, is refused (D4, AE7).
- KTD7. **Notices are written with their change and read with their words.**
  - The use case that makes a change writes one `notices` row for each person told, in the change's own transaction, through `INoticesRepository.add` (U4), with a type from data-model.md's list.
  - `app/_lib/notice-text.ts` (U11) turns a type and its rows into the inbox line and its link, for every type, so each type's words live in one place.
  - The inbox (F1) lists the member's notices newest first, leaves out the groups they switched off, and marks them read when it opens. The bell counts the unread ones it shows.
  - The tabs' counts (D14) are read from the rows, not from notices, by one use case the shell calls (`get-tab-counts`, U11). Loans counts requests to answer, pick-ups to confirm, returns to confirm and more-time requests to answer; Nights counts invites by name with no answer (R33); Friends counts friend requests waiting.
- KTD8. **The daily run.** As job-search's (its KTD24): a Vercel schedule with a path target posts to `/api/cron/daily` at 7:00 America/New_York, and the route accepts only `Authorization: Bearer <CRON_SECRET>`, a secret Hector sets in Vercel (H7). On Hobby a schedule runs at most every 15 minutes, within a 15-minute window, up to 5,000 runs a billing period, and a run is a function invocation, not a deployment (Vercel's Schedules docs, read 2026-11-12). The run:
  - writes R25's reminders due today: `due-soon` two days before, `due-today`, `due-back-today`, and `overdue` the day after and every three days after, plus `night-today`
  - closes each return its owner hasn't answered for 7 days (D15), with `return-closed`
  - writes nothing twice: a reminder carries `reminded_on` under a unique index, so a second run the same day adds nothing
  
  No screen waits on it: whether a loan is overdue or due today is worked out when a page reads it.
- KTD9. **One time zone, America/New_York**, as recipes' `PLAN_TIME_ZONE` and job-search's KTD18. Dates are `YYYY-MM-DD` strings end to end, and "today" comes from `todayIn` on the server, never the phone. A night's start and end are timestamps shown in Eastern time. A date shows its weekday, and its year once that isn't this year (screens.md). Revisit when a circle elsewhere joins.
- KTD10. **Search runs on our copy, with trigrams (R2).** `games.search_title` holds the normalized title (`src/entities/search-title.ts`, U3) under a `pg_trgm` index. Neon has the extension, and so does the PGlite the tests use (0.5.11 ships `pg_trgm`). The input is normalized the same way and matched by word similarity above a threshold. Results come in R2's two groups, games on the member's and their friends' copies first and then the rest, each ordered by closeness and then popularity. "ticket ride" finding Ticket to Ride is a test. U24 sizes it on the real catalog.
- KTD11. **Photos in Neon Object Storage (R4, R5, R40).**
  - Two buckets in the Neon project. `profile-photos` is private: a page that shows a photo gets a signed address that lasts an hour, made only for someone who may see the person (KTD4). `catalog-images` is public-read, for covers of games added by hand and box photos on suggestions, kept as their address in `image_url` (data-model rule 14).
  - The browser shrinks a picture to at most 800 px on its long side and under 300 KB (`app/_lib/shrink-image.ts`) before a server action stores it. Server Actions take 1 MB by default and Vercel's functions 4.5 MB (Vercel's limits, read 2026-11-12). The action checks the type and size again.
  - `IFileStorage` (application) with an S3 adapter over `@aws-sdk/client-s3`, imported on first use (KTD2), and a mock for tests, all in U1. Neon's storage is S3-style: an S3 SDK points at the branch's endpoint with a Neon credential (Neon's docs, read 2026-11-12).
  - The Neon project has to be in a region with object storage, here AWS US East (H3). The Free plan includes 5 GB a project.

**Screens**

- KTD12. **The look: Punchboard, as a theme in `@repo/ui` (D12, D13).** The design system's `building.md` maps it, and this decides what it left open.
  - `packages/ui/src/styles/themes/community-game-library.css`, with `data-theme="community-game-library"` on `<html>`, named for the app as `recipes.css` and `job-search.css` are (building.md suggested `punchboard.css`). The dark blocks the theme test requires repeat the light values. There's no `ThemeProvider`, since the app is light only.
  - Fonts through `next/font/google`: IBM Plex Sans (`--font-sans`), Stardos Stencil 700 (`--font-heading`, always uppercase) and IBM Plex Mono 500 (`--font-mono`).
  - What tokens can't reach (2px edges, 44 px targets, the dashed focus ring, the solid red button, the navy toast) comes from restyling the shared components by `data-slot` inside the theme file, as `neobrutalist.css` does: building.md's first way, which asked for the owner's OK first. Hector gave it on 2026-11-12 (H5).
  - The kit's type sizes (10, 13, 15, 22 and 26 px) become named sizes in the shared stylesheet, as `text-2xs` was. The arbitrary-values rule stays on.
  - Piece colors are the theme's own custom properties (`--piece-brick` and so on, as `neobrutalist.css` has `--neo-*`), set through a `data-color` attribute that the theme file styles, so no raw color or arbitrary value reaches the app. U2 checks that the design lint accepts this before building on it.
  - The app's own components come from the design system's `components/bundle.css`: Stamp, TabCount, Piece, Seats, CoverThumb and Cover, Dice, Track, ListRow, Header, TabBar and Group. The shared ones are restyled: Button, the fields (Input, Textarea, NativeSelect), Checkbox, RadioGroup, Switch, ToggleGroup (SegmentedControl and FilterChip), Drawer (Sheet), AlertDialog (Dialog), the Toaster (Toast) and Empty.
- KTD13. **Screens are built from the canvas, with its cast as the fixtures.** Each unit's task names its boards, and a board's HTML is the spec for its words, order, states and sizes, under screens.md's Rules every screen follows. The canvas's fictional people (You, Alice, Sam, Priya, Jo, Ben, Mei, Dev and Noor) and its games are `tests/_support/cast.ts` and the local seed (U4), so a screen can be checked against its board at 390 px with the same data. The words come from the design system's Words table.
- KTD14. **Wider screens come from the shell and the shared components (R43).** U2 builds the notes' rules into them: one breakpoint at 768 px, where the tabs move into the header; pages are one centered column, 640 px for one you read or fill in and 1080 px for one you browse; list rows run in two columns from 768 px and three from 1100 px; and a sheet becomes a centered dialog 480 px wide. A unit gets them by using those components, and checks its screens at 768 and 1280 px.
- KTD15. **Names in code.** Below the screens, names follow the schema in camelCase: `userGame`, `loan`, `gameNight`, `gameNightAttendee`, `friendship`, `friendRequest`, `friendLink`, `notice`, `userProfile`. Routes and components use the screens' words: `/copies/[id]`, `CopyPage`, `copy-state.tsx`. The code map pairs them. Values are data-model.md's readable ones everywhere, with no second name for any of them in code.
- KTD16. **Actions and errors as recipes'.** Typed domain errors are caught in the action with `toActionError`, and `ActionState` carries each field's error. Taps go through `callAction`, forms submit with `onSubmit` and `startTransition`, and each action revalidates every page its change shows on, found from the code map's routes. One error is new: `ChangedError` with a reason (`'copy-lent'`, `'request-withdrawn'`, `'request-answered'`, `'seats-taken'`, `'night-cancelled'`, `'not-friends'`). The screen turns it into screens.md's one line and next best action, such as "Join the line", and sends nothing.
- KTD17. **Ask first, say what happened, offer Undo** (screens.md's rules 3 and 5). `ConfirmDialog` (`app/_components/confirm-dialog.tsx`, U2) asks before every action in screens.md's Actions that ask first: its red button names the thing, the other says what's kept, and it names who's told. `notify` (`app/_lib/notify.ts`, U2, job-search's pattern with the app's own toaster id) says what happened, with Undo where the action can be undone. Each row of screens.md's After each action is a screen test in the unit that builds its action.
- KTD18. **Links people share.** A friend link is `/f/<token>` (R49) and a night's link `/n/<token>` (R30), as E2, D7 and D10 draw them, with an 8-character code a person can read aloud. Signed out, they show A3 or D14, and a night's shows only its title, date and seats. Signed in, the friend link makes the two people friends at once and opens the friend's page, and the night's link gives the member an attendee row as `'invited'` and opens the night. An expired or replaced link says "This link no longer works." (screens.md). Sharing (E2, D10, C18, D15, R52) opens the phone's share sheet (`navigator.share`) with a ready message, and falls back to copying it, with a toast (`app/_components/share-button.tsx`, U2). The welcome page and both links have link-preview images (Y2, U23).
- KTD19. **The home screen and saved copies (R43, R44).** `app/manifest.ts` with the name, "Game Library" as the short name, and kraft and navy as its colors; icons drawn from the design system's Three pieces SVG, in recipes' `app-icon.tsx` pattern. The service worker is recipes', with this app's saved pages (the Library and My library, a game, a copy, Loans and a loan, Nights and a night, Friends and a friend, the inbox and You) and every form left to the network. A6 shows iPhone's Share then Add to Home Screen, and on Android the browser's own install prompt when it offers one. Offline, a saved page shows with screens.md's no-connection line, and nothing else works offline, since reading the library offline is deferred.

**Building**

- KTD20. **Batches, pushes and the free plans (Hector, 2026-11-12).**
  - Vercel's Hobby plan allows 100 deployments a day for the whole account, and counts a build its Ignored Build Step cancels as a full deployment. Its own skipping of projects a push doesn't affect isn't counted, works with Bun workspaces, and is on by default for a new project (Vercel's limits, project settings and monorepo docs, read 2026-11-12). So this app's `vercel.json` has no `ignoreCommand`, and its project keeps Skip deployment on (H7). Until U1 adds the app's `package.json`, Vercel treats a change in its folder as a root change, and a root change deploys every app.
  - Units go in batches: one branch and PR per batch, one commit per unit. An agent commits locally and pushes when the batch is ready for review, or once for a gate's preview, so a batch costs one to three preview builds rather than one per unit. Hector made batching the default for all work in the repo on 2026-11-12 (root `AGENTS.md`): the detail lives in each commit, not in a PR of its own.
  - CI runs on GitHub's runners, which are free for a public repo. Tests use PGlite and previews the test project, so no Neon branch is made per preview (Neon's Free plan: 10 branches and 100 compute hours a project a month).
  - Hobby is for non-commercial personal use, which this app is (D3).
  - Of the repo's other apps, hectors-recipes and job-search already skipped pushes that didn't touch them, while relationship-meter and main-portfolio paid a canceled deployment on every push through their `ignoreCommand`. hectarek/hector-mono#118 (open when this was written) turns their skipping on and removes all four `ignoreCommand`s.
- KTD21. **The catalog during the build (D7, on hold).** Until the source is chosen, the catalog is the canvas's fictional games, put into the local and test databases by `scripts/seed.ts` (U4). Real games reach production only through the admin's Add a game by hand (G3) or U24's import. Launch needs the source decided (H6), with H1 if it's BoardGameGeek, and so do the source's credits (Y1). The decision is its own effort, run while the app is built (Hector, 2026-11-12).
- KTD22. **Tests as recipes'.** Use cases run on both backends (`describeEachBackend`), constraints are tested on PGlite alone, controllers through `controllerBasics`, and screens with happy-dom against the real actions. Every acceptance example (AE1 to AE10) is a named test in the unit that builds it. Browser flows (Playwright) come in U25 only, on the test project, behind recipes' test-database guard with the comment `community-game-library-test`: making an account, then borrowing and giving back a game.
- KTD23. **What should we play? and tables are rules (R37, R46, D2).** Pure functions in `src/entities/what-to-play.ts` and `src/entities/tables.ts`, each answer with its reason. Claude wrote the rules to match D8 and D9, and marked the choices the boards don't make; Hector agreed each on 2026-11-12.
  - **The inputs** are D8's: the people playing (going plus guests to start), the time (1 hour, 90 minutes, 2 hours or 3 hours), the complexity, and where from: the games on the table, or all the member's friends' games and their own (R37 as revised).
  - **The defaults:** the time starts at the longest choice that fits the night's length, or 2 hours when the night has no end (Claude's choice). Where from starts on the games on the table when there are any. No complexity is picked to start, meaning any, and tapping the picked one clears it (Claude's choice). "New players" means light.
  - **A fit:** a game fits when it plays at that many people (`min_players` to `max_players`), its time is within the time (`max_minutes`, or `min_minutes` when it has no maximum), and its complexity is the one picked. A game missing a value a filter needs doesn't fit, and is left out with that reason.
  - **The order:** best fits first: games that play best at that many people, then those that play at it, then more votes for games on the table, then popularity, then title. AE6 holds.
  - **The reasons:** each fit says why, from the facts the game has ("Plays 6, best at 5", "90 min · medium"), who brings it, and "On the table" when it is. Left out gives each game that didn't fit one short reason ("Harbor Lights seats 5 at most.").
  - **Tables:** the people going, guests included, are split among the games on the table, or all friends' games when nothing on the table fits. The split uses the fewest tables whose sizes some game fits, with sizes as even as possible, and gives each table the best fit for its size from the rules above, no game twice. The host sits at the first table and each guest at their member's; the rest go in the order they answered. "Or one table for all 6" shows a game that seats everyone when one does, "Use one table" shows that instead, and "Try another split" moves to the next best split.
  - **Sharing a split** stores nothing: "Share with everyone going" opens the share sheet with the split as a ready message (Claude's reading of D9's "Only you see this until you share it").
- KTD24. **A night's calendar file (R35).** `/nights/[id]/calendar` answers `text/calendar`, made on request for someone who can see the night (KTD4), with its title, times, place and address. Nothing keeps a calendar in sync.
- KTD25. **Motion last (D13).** Nothing moves between screens until U26, which takes the design system's Motion proposals to Hector first.

### Code map

Every route, folder and name the units build, fixed now so agents don't make names up. A unit that needs a name not here adds it here in the same change.

```
apps/community-game-library/
  app/
    (api)/api/auth/[...path]/       # Neon Auth's endpoints (recipes)
    (api)/api/cron/daily/           # the daily run (KTD8, U17)
    (auth)/welcome/                 # A1, and A9 inside a chat app's browser (U5)
    (auth)/auth/[path]/             # Neon's forms: make an account (A2), sign in (A8); the sign-in kit's layout
    (start)/start/profile/          # A4, step 1 of 3 (U5)
    (start)/start/friends/          # A5, step 2 (U10)
    (start)/start/home-screen/      # A6, step 3 (U5)
    f/[token]/                      # a friend link: A3 signed out, friends at once signed in (KTD18, U10)
    n/[token]/                      # a night's link: D14 signed out (KTD18, U19)
    removed/                        # a removed account's only page (U5)
    (main)/                         # header, tab bar, bell and piece (U2)
      page.tsx                      # Library, All friends: B1 to B4, B10, B12; ?q, filters and sort in the address (R13)
      my-library/                   # B6; add/ (B8), suggest/ (B9)
      games/[id]/                   # a game's page: B5, B11, B13; the Ask to borrow (C1) and Join the line (C10) sheets
      copies/[id]/                  # a copy's page: B7, B14
      loans/                        # Loans: C4; record/ (C9), past/ (C12)
      loans/[id]/                   # a loan's page: C2, C3, C5, C7, C16, C17, C18, with C6, C8, C11 and C13 to C15
      nights/                       # Nights: D1; new/ (D5, D6), past/ (D12)
      nights/[id]/                  # a night's page: D2, D7, D13, with D3, D4 and D11; edit/, invite/ (D10),
                                    # what-to-play/ (D8), tables/ (D9), calendar/ (KTD24)
      friends/                      # Friends: E1; link/ (E2)
      friends/[userId]/             # a friend's page and library: E3, E4
      inbox/                        # F1, F2
      you/                          # E5; edit/ (E6), notices/ (E7), delete/ (E8, E9), catalog/ (About the catalog, Y1)
      admin/                        # G1; suggestions/[id]/ (G2), suggestions/answered/ (G7), games/ (G5),
                                    # games/new/ (G3), games/[id]/ (G4), accounts/[userId]/ (G8)
    account/[path]/                 # Neon's account views (email, password), with the sign-in kit's layout
    _components/                    # app-header, tab-bar, tab-count, bell, piece, seats, stamp, cover-thumb, cover,
                                    # dice, track, list-row, group, confirm-dialog, share-button, date-sheet (X1),
                                    # photo-field, changed-notice, people-picker, back-link, action-form, saved-copy;
                                    # by area: game-row, copy-row, copy-state, library-list, filter-sheet, sort-sheet,
                                    # loan-row, loan-track, night-row, attendee-list, friend-row, notice-row,
                                    # piece-picker, profile-form
    _lib/                           # current-user, auth-paths, safe-redirect, call-action, notify, notice-text,
                                    # notice-text/ (one file per area), changed-lines, library-params (R13), share,
                                    # shrink-image, use-closes-on-leave, leave-guard, app-icon
    actions/                        # shared.ts, profile.ts, copies.ts, catalog.ts, suggestions.ts, friends.ts,
                                    # loans.ts, nights.ts, notices.ts, account.ts, admin.ts
    manifest.ts, apple-icon.tsx, pwa-icon/[size]/, opengraph-image.tsx, error.tsx, not-found.tsx
  src/
    entities/
      errors/common.ts, errors/loggable.ts   # recipes' errors with ChangedError (KTD16); job-search's loggable
      models/                       # game, user-game, user-game-expansion, game-suggestion, user-profile,
                                    # user-settings, friendship, friend-request, friend-link, loan, game-night,
                                    # game-night-attendee, game-night-game, game-night-vote, notice, user, session,
                                    # transaction, logger
      week.ts                       # recipes' dates and todayIn, with PLAN_TIME_ZONE (KTD9)
      search-title.ts               # KTD10 (U3)
      loan.ts                       # the state machine, dates, the line and a copy's state (KTD6, U3)
      notice-types.ts               # each type's group (U3)
      piece.ts                      # shapes and colors (R51, U3)
      reminders.ts                  # which reminders are due on a day (KTD8, U17)
      night.ts                      # seats, guests and the waitlist (R31, R47, U19)
      what-to-play.ts, tables.ts    # KTD23 (U20)
      library-filters.ts            # R11 to R13: parse, apply, and which filters to show (U8)
      in-app-browser.ts             # A9 (KTD3, U5)
      share-message.ts              # the ready messages (R52)
      calendar-file.ts              # KTD24 (U21)
    application/
      repositories/                 # games, user-games, game-suggestions, user-profiles, user-settings,
                                    # friendships, friend-requests, friend-links, loans, game-nights, notices,
                                    # removed-users
      services/                     # authentication, logger, transaction-manager, file-storage
      use-cases/                    # catalog/, copies/, suggestions/, profile/, friends/, loans/, nights/,
                                    # notices/, account/, admin/, daily/
    interface-adapters/controllers/ # the same areas as use-cases/
    infrastructure/
      repositories/                 # base, then one per interface, with a mock each
      services/                     # neon-auth, transaction-manager, console-logger, s3-file-storage, with mocks
  di/                               # container.ts, types.ts, modules/ (one per area)
  db/                               # schema.ts, index.ts, migrations/
  lib/                              # auth/server.ts, logger.ts
  service-worker/                   # rules.ts, handlers.ts, worker.ts (U23)
  scripts/                          # seed.ts, build-service-worker.ts, check-test-database.ts
  tests/                            # mirrors the tree; _support/ with cast.ts
  proxy.ts
```

Use cases by area, each a file named for what it does (`request-loan.use-case.ts`), with a controller of the same name:

- **catalog:** search-games, get-game, list-expansions
- **copies:** add-user-game, update-user-game, set-user-game-expansions, set-lending, remove-user-game, set-pass-along-for-all, list-my-library, list-library, get-user-game
- **suggestions:** suggest-game, list-suggestions, list-answered-suggestions, answer-suggestion, add-game, update-game, find-games-to-edit
- **profile:** create-profile, update-profile, set-photo, remove-photo, get-profile, update-notice-settings
- **friends:** require-friend, get-friend-link, make-friend-link, use-friend-link, list-friends, get-friend, send-friend-request, answer-friend-request, cancel-friend-request, unfriend, list-people-you-may-know
- **loans:** request-loan, withdraw-request, answer-request, remove-from-line, cancel-loan, confirm-pick-up, give-back, confirm-return, ask-more-time, answer-more-time, change-due-date, call-back, pass-along, confirm-pass-along, take-back-pass-along, record-loan, list-loans, get-loan, list-past-loans, get-copy-history
- **nights:** can-see-night, create-night, update-night, cancel-night, invite-to-night, make-night-link, use-night-link, answer-night, remove-from-waitlist, add-game-to-night, remove-game-from-night, vote, list-nights, list-past-nights, get-night, what-to-play, split-tables
- **notices:** list-inbox, mark-read, get-tab-counts
- **account:** list-what-ends, delete-account
- **admin:** require-admin, remove-account
- **daily:** run-daily

Two batches can be open at once (Batches and units), so the files both touch take one rule: in `di/container.ts`, `di/types.ts`, the code map and the app's `AGENTS.md`, add lines in alphabetical place within their list, and resolve a merge conflict there by keeping both sides.

### Batches and units

Each unit is one task in Hector's tracker, under the same U number. A batch is one branch and one PR (KTD20). A gate is Hector's look before the next units copy what came before.

| Batch | Branch | Units | Starts after | Gate |
|---|---|---|---|---|
| 1 Foundation | `feat/community-game-library-b1-foundation` | U1 to U5 | The spec's PR merged (H7 before its push, H3 before its merge) | The shell and getting in, on the batch's preview (H8) |
| 2 Catalog and libraries | `feat/community-game-library-b2-catalog` | U6 to U9 | Batch 1 merged | After U6, from screenshots, before U7 (H8) |
| 3 Friends and the inbox | `feat/community-game-library-b3-friends` | U10, U11 | Batch 2 merged | |
| 4 Loans | `feat/community-game-library-b4-loans` | U12 to U17 | Batch 3 merged | |
| 5 Nights | `feat/community-game-library-b5-nights` | U18 to U21 | Batch 3 merged | |
| 6 Accounts and the phone | `feat/community-game-library-b6-accounts` | U22, U23 | Batches 4 and 5 merged | |
| 7 Launch | `feat/community-game-library-b7-launch` | U24, U25 | Batch 6 merged; H6 for U24, H2 and H4 for U25 | The phone check after a day away (H9) |
| 8 Motion | `feat/community-game-library-b8-motion` | U26 | Batch 7 merged | Hector's pick of the motion |

Batches 4 and 5 run side by side, each in its own worktree, so at most two agents build at once. "Strong" means the strongest model available, for a unit that sets a pattern or holds the hardest logic. Every other unit is written to be built by a smaller model.

**Batch 1: Foundation**
- **U1** Scaffold from recipes · strong · KTD1, KTD2, KTD11, KTD20
- **U2** The look and the shell · strong · KTD12, KTD14, KTD16 to KTD18 · after U1
- **U3** Every table and the shared rules · strong · KTD5, KTD6, KTD10 · after U1
- **U4** Shared reads, the cast and the seed · strong · KTD4, KTD7, KTD13, KTD21 · after U3
- **U5** Getting in, and You · standard · KTD3, KTD11 · needs H7 · after U2, U4

**Batch 2: Catalog and libraries**
- **U6** Search and a game's page · strong · KTD10, KTD13 · needs H3 · after Batch 1
- **U7** Copies and My library · standard · KTD6, KTD15 · after U6
- **U8** All friends: filters and sort · standard · KTD4 · after U7
- **U9** Suggestions and the admin's catalog · standard · KTD11 · after U6

**Batch 3: Friends and the inbox**
- **U10** Friends · standard · KTD4, KTD18 · after Batch 2
- **U11** The inbox, the counts and notice settings · standard · KTD7 · after U10

**Batch 4: Loans**
- **U12** Ask and answer · strong · KTD6, KTD7, KTD16 · after Batch 3
- **U13** Pick-up and return · strong · KTD6, D15 · after U12
- **U14** More time, due dates and calling back · standard · KTD6, KTD18 · after U13
- **U15** Lines and passing it along · strong · KTD6 · after U13
- **U16** Recording a loan, and past loans · standard · KTD6 · after U13
- **U17** The daily run · strong · KTD8 · needs H7's secret before the merge · after U14, U15

**Batch 5: Nights**
- **U18** Nights and a new night · standard · KTD4, KTD9 · after Batch 3
- **U19** Invites, answers, the waitlist and guests · standard · KTD4, KTD18 · after U18
- **U20** What should we play? and tables · standard · KTD23 · after U19
- **U21** Cancelling, past nights and the calendar file · standard · KTD18, KTD24 · after U19

**Batch 6: Accounts and the phone**
- **U22** Deleting an account, and the admin's removal · standard · KTD4 · after Batches 4 and 5
- **U23** The home screen, saved copies and link previews · strong · KTD2, KTD19 · after Batches 4 and 5

**Batch 7: Launch**
- **U24** The catalog's data · strong · KTD10, KTD21 · needs H6, and H1 if it's BoardGameGeek
- **U25** Production and the first friends · standard · KTD1 to KTD3, KTD22 · needs H2, H4 · after U24

**Batch 8: Motion**
- **U26** Motion · standard · KTD25 · needs H9 and Hector's pick

### Verification

| When | Check |
|---|---|
| Every change | `bun check --filter=community-game-library && bun ts --filter=community-game-library` |
| Every change | `bun run dead-code` |
| A unit with tests | its test files from the app folder, then `bun run test --filter=community-game-library` |
| A unit with screens | each screen at 390 px with the cast's data, beside its board; again at 768 and 1280 px (KTD14); new touch targets at least 44 px |
| A schema change (U3, or a unit whose task says so) | `db:generate`, the SQL read, applied to the test project with Hector's OK; on production with his OK at that moment, before the merge (KTD1) |
| U1, U2, U23, and any config change | the build: the batch's preview build, since a Claude session can't fetch the Google fonts inside the sandbox (recipes' Cache Components notes) |
| Every PR | the diff, screenshots and PR text hold only fictional people (R45) |
| A PR with new tables, use cases or access rules | a Whiteboard board, per the root `AGENTS.md` |

### Definition of done

**The whole build**
- Every requirement holds as revised, apart from the dropped and deferred ones.
- AE1 to AE10 pass as tests.
- KTD2's cold open is measured on production and meets the target.
- The app's `AGENTS.md` describes what shipped.
- The repo holds no member's name, contact or address.
- Every task for the build in Hector's tracker is done.

**Each unit**
- Its task's acceptance criteria are checked off.
- Its screens match their boards at 390 px, and work at 768 and 1280 px.
- Every notice its changes cause is written, and every page they change is revalidated.
- Its forms, asks, messages and errors use U2's shared patterns: the leave guard, the confirm dialog, `notify`, the changed notice and the error lines (KTD16, KTD17).
- What it learned that's durable is in the app's `AGENTS.md`.
- Its task holds the evidence: what changed, the checks run and the screenshots taken.

### Conventions

- **Unit lines:** `- **U<n>** Title · model · KTDs · needs H<n> · after U<m>`, with no state. Each unit's task holds its state, and everything about it that isn't shared.
- **Owners:** an agent builds. Hector's steps are the Needs from Hector. A migration, production data, or an account or service setup waits for his OK at that moment.
- **Branches and commits:** one branch and PR per batch (`feat/community-game-library-b<n>-<topic>`), one commit per unit (`feat(community-game-library): U<n> <summary>`), and fixes after review as `fix(community-game-library): …`. Push when the batch is ready, or once for a gate (KTD20). A batch's PR opens with the migration its merge needs, if any. Refer to PRs as `hectarek/hector-mono#n`.
- **Lessons:** written with the batch's PR, per the root `AGENTS.md`.
- **Privacy:** R45 holds for every file, commit and PR.

---

## Session log

- **2026-11-10:** first draft of the product half, from Hector's list of requirements, with gaps marked and open questions. The repo's planning format, the new-app checklist and the job search and recipes apps were read for patterns. BGG's API pages refused automated reads, so its terms here come from search results. **Next:** Hector's answers to Q1 to Q13, then the design system's style tiles.
- **2026-11-10:** Hector's first answers. Taken: our own weekly-refreshed copy of BGG's catalog, filled before launch (D7); BGG's attributes with no tags of our own (D8, R6 dropped); in-app notices only for now (D9); the host invites to a night, with a "guests can invite others" switch and a calendar file (R30, R35); a vote and a table split (R38, R46); the folder name. Q1 became the visibility model (one group, friends or groups), with Q5 and Q12 folded in. Q6, Q8 and Q11 were reworded, and Q7 asked again with what push costs. Hector suggested a tabletop theme for the design. **Next:** Q1, then Q6, Q7, Q8 and Q11.
- **2026-11-10:** Hector's second answers. Friends now and groups later, for about 12 people to start (D10, with friend links R49 and unfriending R50). A line for a game that's out, plus pass-along between friends, which Hector proposed (R24, R48). Guests without accounts, behind a host's switch (R47). No catalog agent: the admin adds games BGG lacks with BGG's fields (D11). Push isn't the same effort as the inbox, so it's a later phase (D9). The design goes toward game box and cardboard. **Next:** Hector checks the proposed items, then the style tiles.
- **2026-11-10:** Hector agreed the product half as it stands, the proposed details included (D2 to D5, D10, D11, R48, R49). **Next:** the design system's style tiles.
- **2026-11-10:** Hector's take on the first style tiles: Box lid and Punchboard, leaning Punchboard, and light mode only (D12, R43 revised). **Next:** round two of the style tiles, around those two.
- **2026-11-10:** the look is chosen: Punchboard, with game pieces that each do one job (D13). It came out of eight style tiles, then a draft with its controls, its pieces and four phone screens, which Hector approved with no changes. He asked for every screen to be drawn before any code, so the layout can be judged first: 51 screens across getting in, the library, loans, game nights, friends, the inbox and admin, each tied to the requirements it covers. **Next:** Hector's review of the screens; what he changes there comes back into the requirements.
- **2026-11-11:** Hector's review of the 51 screens, checked against the requirements. Taken: Google and Apple sign-in (R39, H2); the profile photo stays, in a file bucket (R40); a playing piece with more shapes to pick from (R51); search results in two groups, the library's games and then the catalog (R2); no add button on the view of everyone's games (R3); the commonest filters first, the rest folded away, and sorting apart from filtering (R11, R12); the game's page and the copy's page stay separate and link to each other (R8, R14); a pick-up day when confirming a handoff (R18, D5). Claude added a return day to match (R19), which Hector hasn't confirmed. Neon Auth's providers and Neon Object Storage were read in Neon's docs. Still open: what the two library views are called, and where each action lives, since the inbox, the loans tab and the shelf show the same things. **Next:** Hector's call on those two, then the redraw.
- **2026-11-11:** Hector's call: each thing has one home (D14), so four tabs with counts and the inbox behind a bell. The two library views take his names, "All friends" and "My library", with the member's own games in the first; the spec keeps its own words and notes the screen's under Words. The screens are being redrawn to match, with the 14 that were missing: search in two groups, a game the member owns, sort, the owner's side of a more-time request, changing a due date, calling a game back, inviting to a night, cancelling one, past nights, a date picker and four admin pages. Five piece shapes are drawn for his pick (R51). **Next:** his review of the redraw, and his pick of piece shapes.
- **2026-11-11:** Hector's second review of the screens, then a usability audit of all 65. From the review: Apple sign-in is out (R39, H2); playing pieces are three shapes in ten colors (R51); and a laptop gets the same app with more room, not a layout of its own (R43, with the rules in the notes for the technical half). The audit, by four independent reviewers, returned 100 findings, many of them the same problem seen twice. Three were gaps a person couldn't get past: no way to withdraw a request, leave a line or cancel a loan before pick-up (R21), no sign-in screen, and a night's link described three ways. Every area was redrawn, nine screens were added, and the rules and the states between screens are now in [screens.md](screens.md). Fourteen rules had to be chosen to draw the fixes; each is marked "Audit, 2026-11-11" and waits for Hector. **Next:** Hector's final review.
- **2026-11-12:** Hector agreed the fourteen rules the audit added, and a "Text them too" offer after cancelling a night or calling a game back (R52). The product half and the screens are settled, apart from the return day (R19) and an optional fourth piece shape. **Next:** the technical half and its units, then one task per unit.
- **2026-11-12:** the catalog's source, checked before the data model. BGG's own pages were read in a browser: its data needs an approved application and a token (a call without one answers 401), keeping a copy is allowed and asked for, the data may not be modified, and BGG must be credited. No other source has the full field list, and none has free box covers. The findings and what they would change are in [catalog-data.md](catalog-data.md). **Next:** Hector's decisions on them, and his BGG application (H1).
- **2026-11-12:** more on the catalog's source, from a second session: BGG's CSV of every game needs no application (Hector has it: 182,874 games and expansions, with a popularity order), open sources fill the well-known games and thin out fast, and every comparable app with a full catalog uses BGG's API. Hector's direction: a simple data model of the values the screens use, and no sourcing plan yet. The same day the design was finished: a design system for the look, and the last sheets (covers, the icon and name, the screens after an action), listed in [screens.md](screens.md). **Next:** the data model.
- **2026-11-12:** a proposed data model for the catalog, from the values the drawn screens use: games, copies with the expansions in each box, suggestions and the admin's changes, each value marked required or optional, in [data-model.md](data-model.md). It leaves six drawn values out of the first release and names the screen change each would bring; no screen is changed until Hector confirms it. Members, friends, loans and nights come later. **Next:** Hector's review of the model.
- **2026-11-12:** Hector's last design picks: the ship joins as a fourth piece shape (R51), the home-screen icon is Three pieces, and motion waits until everything else is built (D13). The design is finished. **Next:** his review of the data model and the return day, then breaking the build into tasks.
- **2026-11-12:** Hector confirmed the catalog's data model ([data-model.md](data-model.md)) after asking for names that follow one pattern. Best counts, minimum age and popularity stay as optional values, a screen shows a value only when the game has it, the source's id and the change history are out, and the how-to-play video is in (R1, R2, R5, R7, R11, R14). The admin screens lose what needed a source, G6 leaves the first release, and the game's page shows complexity as a word. **Next:** the return day, then breaking the build into tasks.
- **2026-11-12:** Hector confirmed the return day (R19) and set a generous default that assumes good intent (D15): once a borrower says they've handed a game over, the loan can't run overdue, and a return the owner hasn't answered closes by itself a week later. The second session's remaining findings are in [catalog-data.md](catalog-data.md): what BGG offers without an application, what its application weighs, and the options for covers. Hector asked whether owned expansions need their own table, given `base_game_id`; Claude recommended keeping it, since `base_game_id` says which expansions a game has, not which ones a member owns. **Next:** his answer, then breaking the build into tasks.
- **2026-11-12:** the technical half. Hector kept `user_game_expansions` and D15 as written, and asked for every decision, the code map and every unit's brief now, with PRs holding several units so the free plans' daily build limit isn't spent in one day. Written: the rest of the data model (members, friends, loans, nights and notices, with five naming rules added), KTD1 to KTD25, the code map, 26 units in 8 batches, a brief for each in `docs/units/` (moved into Hector's tracker the same day, below), and H3 to H9. Checked in the providers' docs that day: Vercel's Hobby limits (100 deployments a day for the account, with a build cancelled by the Ignored Build Step counted and Vercel's own skipping not), Schedules on Hobby, Neon's Free plan and Object Storage, and Neon Auth's production checklist (codes work with the shared sender, links don't). **Next:** Hector's review of the new tables, the decisions and the briefs; then H3, H5 and H7, the build's tasks in his tracker, and Batch 1.
- **2026-11-12:** Hector agreed the rest of the data model, and took Claude's recommendation on each open choice: the theme's approach (H5), R37 as revised to match D8, U20's defaults and its reading of D9's sharing, and the 8-character link codes. The catalog's source is a separate effort run while the app is built (H6), and batching units into one PR, with a commit each, is the default for all work in the repo (root `AGENTS.md`). He'd taken the repo's skipping of unchanged apps (2026-10-08) to be the fix for the daily deployment limit; Vercel's docs say a build its Ignored Build Step cancels still counts as a deployment, and 32 of the account's last 50 deployments were such cancels. **Next:** the spec's PR; once it merges, the build's tasks, H3 and H7, and Batch 1.
- **2026-11-12:** Hector held the PR: each unit's brief had been written as a file in `docs/units/`, and the build's tasks belong in his tracker. He's right that it broke the convention: work that fits in one session has no plan doc, and its task holds its plan. So each unit is now a task in his tracker, holding why it exists, what to read first, its plan (the brief's build steps and tests), its references and its acceptance criteria, and `docs/units/` is gone. What the briefs held that every unit shares moved here: U1's list of files to copy (KTD1) and the rules for What should we play? and tables (KTD23). Writing the tasks' dependencies showed two orderings to fix. U1 no longer waits on H3 and H7: the test project exists, H7 comes before Batch 1's push (U5) and H3's production project before its merge (U6). And H9, the phone check and the invitations, follows U25 rather than coming before it. Hector also OK'd the Neon test project, which Claude made (H3), and the Vercel change that stops skipped builds counting against the daily limit, now a session of its own. **Next:** the PR's merge, then Batch 1.
