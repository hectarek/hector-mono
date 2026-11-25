# Polish pass

Updated 2026-11-25

Each screen at 390px beside its board, before the first friends are invited (Batch 8). Every board was shot beside its page in a local production build on the test project, signed in as the cast's You, with the server's and browser's clock on the boards' today (Tue Nov 10, 2026); the app's `AGENTS.md` says how. Four reviewers compared every pair, the differences were fixed row by row, and every screen was shot again. This file holds what changed, what's left, and Hector's calls on the choices that were open.

## What changed

- **Setting up skipped two steps.** After A4, Next went straight to the Library, so no new member saw A5 or A6: A4's save refreshed A4, whose gate sent a finished account away. It now goes on to each step, and the browser flows require them.
- **Shared parts.** The pushed page's header; quiet links flush with the words above them; note boxes as tall as their rows; list radio rows with no gap; list rows keeping their stamp on the right; the date field's chevron; "asked Sunday"; the dice's faces and sizes; switches flipped from their whole row; search fields filling their box; placeholders in smudge, phone numbers in mono, removable chips and the piece picker as drawn.
- **Each row.** A: link pages' frame and card, A1's 40px title, A2 and A8's heading and links, A6 opening My library (A7), A9's share icon. B: B2's panel and dice, B4's buttons, B7's Open the loan, B9's ink, a requested copy's line. C: C4's loan cards, C5's one list, C7's quiet link and rules, card stamps, C11's steps, C12's segmented control, C15's box, C18 after a call-back. D: the games list's padding and rule, 48px row buttons, D5's form, D7's link box and waitlist, D8's labels, D10's rows and "Send invites". E, F: E1's suggestion box, E4's nights line, E5's Games and loans, E8's lines, F1's lines, dot and alignment. G: G1, G2, G7's pieces, G8's groups. E9's dialog buttons stack when they don't fit; date sheets read Pick a date.
- Wider screens (W1 to W4) match their boards.
- **Hector's calls (2026-11-25).** Each open choice is built as he chose it, with screens.md's new rules 15 to 18 applied on every screen (Hector's calls, below), and the items left for the catalog's PR are done.

## Done once the catalog PR merged

The catalog's PR changed the game page and the admin's game form, so these waited for it, and were built on 2026-11-25:

- C10: your own place in the line is your piece with a dashed outline. JoinLine takes the member's name and piece (`me`) from `games/[id]/page.tsx` (`copyAction`), and draws `<Piece … size={24} dashed />` in place of `OpenSeat`.
- B11: your copy's row opens its loan (the one out, else the yes waiting, else the first request), or its page when it has none; while it opens a loan, Open my copy is a quiet link under the copies.
- Two more rows open their loans: a friend's copy you have opens your loan, and one handed to you opens the handoff, where you confirm (rule 7).
- G3 and G4 (`game-form.tsx`): small caps on Fewest, Most, Shortest and Longest; `mb-1.5` under each legend; Plex Mono in the number fields.

## Left, smaller

- A2: "At least 8 characters." under the password. Neon's form has no place for help text, and the flows fill the field by its placeholder.
- Panels some boards draw with 10px between their parts (D7's What you can do, D9's tables, the loan panels) keep Group's 8px.
- C4: "Night Market" may wrap inside "Priya asked for Night Market"; the board keeps the two words together.

## Hector's calls

Where a board and the built app differed by a choice that was open, Hector chose on 2026-11-25. He also asked for the same kind of thing to work the same way on every screen, which became screens.md's rules 15 to 18; the review behind them moved C8's date to the date field, gave every link Share and Copy, and put covers in the game dropdowns.

- B2 Filter: a sheet, as built.
- B4: every filter that brings games back, the most first (a combination he approved).
- C9: a dropdown with each friend's piece, the friend who asked first and marked, and nobody picked (the board's select and the built pieces, combined).
- D4: the seats in one row that wraps, as built. D6: a sheet, as built. E2: a sheet, as drawn.
- D8: All friends' games, with no complexity picked.
- G1: suggestions oldest first, as built.
- G3: categories as chips and an Is it an expansion? group, as drawn, with a way to add a category. G4: the whole form, as built, with Preview for the video. G8: the email shown, as drawn, and no reason field, as built.
- A2 and A8: Neon's order, as built.
- E5: "Signed in with Google", as drawn.
