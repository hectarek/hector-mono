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

## Shared parts, done

- Quiet links have no edge, and one that starts a line (`self-start`) sits flush with the words above it.
- A Textarea with `rows` is that many lines tall; phone fields are typed in Plex Mono; placeholders are in smudge; a removable chip ends 10px after its ×; the piece picker's choices sit 4px apart.
- DayField shows a select's chevron; a weekday within the week reads in full ("asked Sunday").
- The dice pair rests on 6 and 2 (26px by a title, 20px in a button) and on A1's 5 and 3 at 30px.
- CatalogRow's underline gets its 3px; a switch's whole row flips it; FriendRow's second line is in text-brown.
- New options the screens use: a bare count and a top-aligned thumb on list rows, a roomy group (12px), a dashed piece, steps hanging from their circle, a row badge, a search with a hidden label, Share at its own width, and the kit's 40px size.

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
