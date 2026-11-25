# Polish pass

Updated 2026-11-24

Each screen at 390px beside its board, before the first friends are invited (Batch 8). Every board was shot beside its page in a local production build on the test project, signed in as the cast's You, with the server's and browser's clock on the boards' today (Tue Nov 10, 2026); the app's `AGENTS.md` says how. Four reviewers compared every pair, the differences were fixed row by row, and every screen was shot again. This file holds what's left and the open choices.

## What changed

- **Setting up skipped two steps.** After A4, Next went straight to the Library, so no new member saw A5 or A6: A4's save refreshed A4, whose gate sent a finished account away. It now goes on to each step, and the browser flows require them.
- **Shared parts.** The pushed page's header; quiet links flush with the words above them; note boxes as tall as their rows; list radio rows with no gap; list rows keeping their stamp on the right; the date field's chevron; "asked Sunday"; the dice's faces and sizes; switches flipped from their whole row; search fields filling their box; placeholders in smudge, phone numbers in mono, removable chips and the piece picker as drawn.
- **Each row.** A: link pages' frame and card, A1's 40px title, A2 and A8's heading and links, A6 opening My library (A7), A9's share icon. B: B2's panel and dice, B4's buttons, B7's Open the loan, B9's ink, a requested copy's line. C: C4's loan cards, C5's one list, C7's quiet link and rules, card stamps, C11's steps, C12's segmented control, C15's box, C18 after a call-back. D: the games list's padding and rule, 48px row buttons, D5's form, D7's link box and waitlist, D8's labels, D10's rows and "Send invites". E, F: E1's suggestion box, E4's nights line, E5's Games and loans, E8's lines, F1's lines, dot and alignment. G: G1, G2, G7's pieces, G8's groups. E9's dialog buttons stack when they don't fit; date sheets read Pick a date.
- Wider screens (W1 to W4) match their boards.

## Left until the catalog PR merges

The catalog's PR changes the game page and the admin's game form, so these wait for it:

- C10: your own place in the line, drawn as your piece with a dashed outline. JoinLine needs the member's name and piece from `games/[id]/page.tsx` (`copyAction`); then `<Piece … size={24} dashed />` in place of `OpenSeat`.
- B11: Open my copy as a quiet link under the copies, and your copy's row opening its request, yes or loan, from `games/[id]/page.tsx`.
- G3 and G4 (`game-form.tsx`): small caps on Fewest, Most, Shortest and Longest; `mb-1.5` under each legend; Plex Mono in the number fields.

## Left, smaller

- A2: "At least 8 characters." under the password. Neon's form has no place for help text, and the flows fill the field by its placeholder.
- Panels some boards draw with 10px between their parts (D7's What you can do, D9's tables, the loan panels) keep Group's 8px.
- C4: "Night Market" may wrap inside "Priya asked for Night Market"; the board keeps the two words together.

## For Hector

Where a board and the built app differ by a choice still open:

- B2 Filter: a full-screen layer on the board, a bottom sheet in the app.
- B4: which filter No games match offers to drop (the app drops the one that brings back the most).
- C9: the board's select for who's taking it, against the app's people picker, and whether to preselect the friend who asked.
- D4: eight seats in rows of four; D6 and E2 drawn as a page and a sheet, built the other way.
- D8: the board starts on All friends' games with Medium picked.
- G1: suggestions newest first on the board, oldest first in the app.
- G3: categories as chips and an Is it an expansion? group; G4's record as a details list with Edit buttons and a video preview; G8's reason field and email.
- A2 and A8: Google first under Quickest, as drawn, or Neon's order.
- E5: "Signed in with Google", which needs the provider from Neon Auth.
