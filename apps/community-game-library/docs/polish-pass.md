# Polish pass

Updated 2026-11-24

Each screen at 390px beside its board, before the first friends are invited (Batch 8). The screens were shot in a local production build on the test project, signed in as the cast's You, with the server's and browser's clock on the boards' today (Tue Nov 10, 2026). Four reviewers compared every pair; this file holds what's left. Paths are under `apps/community-game-library/` unless they start with `packages/`.

## Done on this branch

- Setting up skipped A5 and A6: A4's save revalidated the layout, whose re-render of A4 redirected a finished account to the Library. Fixed, and the flows now require each step.
- A3 and D14's link-page frame (28px name, 72px top), A3's die-cut card; A4's photo hint; A6's heading and Go to my library opening My library (A7).
- E9's buttons take a row each when their words don't fit; every date sheet is titled Pick a date (X1); list radio rows stack with no gap (theme); C1's three-line note; C3's bold button name; C18 drops Change the due date after a call-back and puts Called back on its own line; D13's two buttons share a row with small dice.
- Pushed pages' header is 12px above and 6px below the back link (every pushed page sat 6px low).
- List and copy rows keep their stamp on the right until less than 112px is left for the text (B1's Harbor Lights wrap, C4, D8).
- Wider screens (W1 to W4) match their boards.

## Shared parts still to fix

- Quiet links that start a line sit 4 to 6px right of the text above: the theme's quiet rule keeps a 2px transparent border (`packages/ui/src/styles/themes/community-game-library.css`, Quiet), plus 4px padding. Drop the border, and pull a `self-start` quiet link left 4px (C3, C10, D7, D10, E2, F2, B-row).
- Textarea ignores `rows` in Chromium (`field-sizing-content min-h-16`): a theme rule `[data-slot="textarea"][rows] { field-sizing: fixed }` (B7, C1, D5, G3).
- DayField shows a calendar icon; C3, C5, C9 and D5 draw the select's 16px down chevron (`day-field.tsx`).
- Stamps beside a loan panel's label use the 13px card size (C16 `loans/[id]/page.tsx`, C5 and C7 `out-views.tsx`, C4 `loans/page.tsx`).
- `formatWhen` writes "on Sun" for 2 to 6 days ago; C7 and C18 write "Sunday" (`src/entities/week.ts`).
- Mono small caps labels lack uppercase, tracking and smudge: `night-link.tsx`, `what-to-play-view.tsx` (two), `game-form.tsx` (two).
- DicePair rests on 5 and 3; D2, D7, D8, D9 and D13 draw 6 and 2 (A1 draws 5 and 3). WhatItsFor's dice should drop `onBone` (A1, A3).
- ListRow's bare count aside is 13px navy on D1 and G1, 12px brown on E5: a variant.
- SavedSwitch's label is only its text line, so the tap target is under 44px: make the whole row the label (B6, B7, E7).
- Placeholder ink is smudge on the boards (theme rule on `input::placeholder`).
- CatalogRow's `mb-0.75` sits on an inline span and does nothing (`game-row.tsx`): move it to RowName (B8, B10).
- FriendRow's second line is navy; the boards use text-brown (E1, A5).
- Phone fields are Plex Mono (theme rule on `[data-slot="input"][type="tel"]`; A4, E6). Piece picker choices are 4px apart with 4px corners (theme gap for grid radio groups).
- Group gap: forms use 12px (D5, G3), several panels 10px; Group is fixed at 8px.
- The night's link and Copy/Share buttons are duplicated in `night-link.tsx` and `invite/page.tsx`; both need the boxed address and buttons at their own width.

## Each row's fixes

- **A:** A1's title is 40px (add `--text-40`). A2 and A8 (Neon's view): an h1 at 24px and 13px description through `cardHeader`, the link's "You'll be friends with the person who sent the link." line, the password toggle's look, "At least 8 characters.", the foot's words ("I already have an account", "Make an account"), Forgot your password? as a 44px quiet link, the wrong-password line. A9: the share icon inline in step 1, heading `mt-2`. D14: card `mb-1.5`.
- **B:** B2's Available now panel (`py-3`, 44px label) and dice `justify-between`; B3 chips' end padding; B4's two buttons in one wrap row; B7's Open the loan row; B9's intro in text-brown; B11's Priya asked for it as a mono fact (`copy-state.tsx`). After the catalog PR merges: B11's Open my copy and its row opening the loan (`games/[id]/page.tsx`).
- **C:** C10 draws your own piece dashed in the line, and its Borrow that instead flush; C16 and C17 a dashed rule above the person; C16's footnote keeps "where to pick it up." together; C2's legend `mb-1.5`; C4's loans as linked cards (title, stamp, full-width track, people line); C5's owner and line in one list, the pawn gap 8px; C7's Change it on this copy's page as a 44px quiet link, a dashed rule above This copy's history, Remove from line's padding, Jo's request centered; C8's Jo is told. pulled up; C9's footnote words; C11's numbered steps (Steps with a top-aligned option), the phone under Arrange it with Jo, the hand-on row; C12's segmented control; C13's "more time" kept together; C15's Ben box.
- **D:** D2, D7 and D13's table rows' first and last padding and a dashed rule above the buttons, at 48px; D7's link box and Share width, waitlist row, guest pawn margin, dice on What should we play?, Edit and Split at their own width, Cancel the night at its own width; I'd play `min-w-25`; D8's 16px under Looking for; D10's row padding, link box, Invite all my friends flush, "Send invites" with nobody ticked.
- **E, F:** E1's Bring in the rest of your group as a bone suggestion box; E3's phone note gap; E4's nights line (R50's verb, second); E5's Games and loans group and Admin's count badge; E8's mono lines; F1's line with only its lead bold, the detail in text-brown, the unread dot after the stamp, rows top-aligned, the foot link centered, the time in smudge.
- **G:** G2's No match in the catalog. as an empty title; G7's pieces, reason wrapping and count spacing; G8's hidden search label, found accounts inside the group, On the record group, Cancel as a quiet link. After the catalog PR merges: G3's small caps, legend spacing and mono numbers (`game-form.tsx`, shared with G4).

## For Hector

Where a board and the built app disagree on purpose or by a choice still open:

- B2 Filter: a full-screen layer on the board, a bottom sheet in the app.
- B4: which filter No games match offers to drop (the app drops the one that brings back the most).
- C9: the board's select for who's taking it, against the app's people picker, and whether to preselect the friend who asked.
- D4: eight seats in rows of four; D6 and E2 drawn as a page and a sheet, built the other way.
- D8: the board starts on All friends' games with Medium picked.
- G1: suggestions newest first on the board, oldest first in the app.
- G3: categories as chips and an Is it an expansion? group; G4's record as a details list with Edit buttons and a video preview; G8's reason field and email.
- A2 and A8: Google first under Quickest, as drawn, or Neon's order.
- E5: "Signed in with Google", which needs the provider from Neon Auth.
