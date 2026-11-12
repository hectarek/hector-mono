# U2. The look and the shell

| | |
|---|---|
| Batch | 1, Foundation (`feat/community-game-library-b1-foundation`) |
| Model | Strong: every screen uses what this builds |
| After | U1. H5, the OK on the theme's approach, was given on 2026-11-12 |
| Serves | D12, D13, R43; KTD12, KTD14, KTD16, KTD17, KTD18 |

The Punchboard theme in `@repo/ui`, the app's own pieces, the patterns every screen shares, and the shell: the header with the bell and the piece, the four tabs, and the wider-screen rules.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- The design system, with the Artifact tool: `project/README.md`, `project/building.md`, `project/tokens.json`, `project/components/bundle.css`, every component's `README.md` (Button, Choice, CoverThumb, Dialog, Dice, Field, FilterChip, Group, Header, ListRow, Piece, Seats, SegmentedControl, Sheet, Stamp, Stepper, TabBar, TabCount, Toast, Track), `components/Cover/preview.html`, and `assets/Pieces`, `assets/Icons` and `assets/Brand`.
- Boards: `X2-States`, `X1-DatePicker`, `Wide0-Rules` to `Wide4-Tablet`, `B1-Library` (the shell in use), `FinalControls`, `FinalPieces`.
- `packages/ui/AGENTS.md` (Theming), `docs/ui-package.md`, `docs/lint-and-dead-code.md` (Design-System Lint), `packages/ui/src/styles/themes/job-search.css` and `neobrutalist.css`, `packages/ui/tests/src/styles/themes.test.ts`.
- [screens.md](../screens.md): Rules every screen follows, When something goes wrong, Limits to build for.
- [build-plan.md](../build-plan.md): R43 and the wider-screen notes; KTD12, KTD14, KTD16, KTD17, KTD18.

## Build

1. **First, a spike.** Check that the design lint accepts a piece color set by `data-color` on an app element and styled from the theme file. If it doesn't, stop and put the options in the task. Never loosen a rule.
2. **The theme (KTD12):** `packages/ui/src/styles/themes/community-game-library.css`, with building.md's token table, and the dark blocks repeating the light values for the theme test. Restyled by `data-slot` inside it, as Hector agreed (H5):
   - 2px edges and 44 px heights on buttons, fields and toggles
   - the solid red button, with white text and a navy edge
   - the dashed navy focus ring
   - fields filled `bone`, 24 px checkboxes and radios, and the 48 by 28 switch
   - the Drawer and AlertDialog with a 2px edge, a dashed ring, a 6 px radius and stencil titles
   - the navy toast with `bone` text and 44 px links
   
   Add the kit's type sizes (10, 13, 15, 22 and 26 px) as named sizes in the shared stylesheet beside `text-2xs`, and check no other app's screens change. Give the piece colors as `--piece-*` properties with `[data-color]` rules.
3. **The app's frame.** In `app/layout.tsx`, the three fonts from building.md's imports, `data-theme="community-game-library"`, and `@repo/ui`'s Toaster with `theme="light"` and the id `APP_TOASTER`. `app/globals.css` imports the theme.
4. **The pieces**, as components in `app/_components/`, from `bundle.css`'s values:
   - `stamp`: a word and a color (navy, red, brown, solid red), tilted between -4 and 4 degrees, varying by row
   - `tab-count`
   - `piece`: four shapes, ten colors, the README's four sizes, always with its navy outline, as inline SVG from the Piece README's paths
   - `seats`: pieces in seats, the dashed empty pawn for an open seat, and a guest two thirds the size after the member who brought them
   - `cover-thumb` and `cover`, with Y1's loading and failure states; `dice`, with the best count inked, a round token past six, and a tilted pair for a suggestion; `track`, the days of a loan with the borrower's piece on today and the due day red
   - `list-row`: one link per row with a chevron and the perforation, and a stamp that drops under a title that wraps
   - `group`: a `chipboard` panel with a red stencil label inside, or a navy label on `kraft` above a list
   - `app-header` (a tab's stencil title, or a pushed page's back button named for the page that opened it; the bell; the piece button, labelled You) and `tab-bar` (Library, Nights, Loans and Friends, each with a TabCount)
5. **Shared patterns:**
   - `confirm-dialog` and `notify` (KTD17)
   - the sheet: the Drawer at phone width and a 480 px dialog from 768 px, closing on leave with `useClosesOnLeave`, as recipes' do
   - `date-sheet` (X1): a month of days, with the days before a given day switched off and today marked
   - `share-button` (KTD18)
   - `photo-field`: choose, preview, shrink with `app/_lib/shrink-image.ts` (KTD11), and the line "That photo didn't upload. Try a smaller one."
   - `changed-notice` (KTD16), with the reasons' lines in `app/_lib/changed-lines.ts`
   - `people-picker`: buttons for up to six people, a searchable list for more (screens.md's limits)
   - `app/_lib/leave-guard.ts`: "Leave without saving?" on the back link and the tabs while a form has typed text
   - the restyled Empty box, the field error line, "That didn't send." with "Try again" when a send fails, and the no-connection line
6. **Wider screens (KTD14):** page columns of 640 and 1080 px from 768 px, list grids of two columns from 768 px and three from 1100 px, the tabs in the header from 768 px, and hover states for a pointer.
7. **The shell in `(main)/layout.tsx`**, with a placeholder piece until U5 reads the profile and no counts until U11. Dates go through one formatter that shows the weekday, and the year once it isn't this year (KTD9).

## Not in this unit

The pages that use these (each later unit). The counts' numbers (U11). The member's own piece (U5). Motion (U26).

## Tests

- The theme test passes, and recipes' and job-search's screen tests still pass.
- Screen tests: ConfirmDialog's buttons and who's told; the stamp's words and colors; each piece shape and color with its outline; the date sheet switching off days before the day given; a sheet closing on leave inside `<Activity>`, as recipes tests it; `notify` with Undo; the share button copying when `navigator.share` is missing; the photo field's error line; the tab bar marking the current tab; the people picker searching once there are more than six.

## Done when

- [ ] `packages/ui`'s checks and the theme test pass, and no other app's screens change
- [ ] The app's checks, dead code and tests pass
- [ ] Each component matches its design-system preview, and the shell matches B1's header and tab bar at 390 px; the wide frames match Wide0 to Wide4 at 768 and 1280 px
- [ ] Touch targets are at least 44 px, and a screen's main action 48 px
- [ ] The app's `AGENTS.md` has its UI Rules: the theme, the components, the shared patterns and the words
- [ ] Committed as `feat(community-game-library): U2 the look and the shell`
