# A tester on a desktop, 2026-10-08

## Where it came from

One tester, using the app on a desktop computer, in a book Hector shares with him. He has the same first name as Hector, so his own book was named "Hector's Recipes" at sign-up, like Hector's, and like the app's wordmark. Hector summarized what he said on 2026-10-08, with a screenshot of the library's book pills: the wordmark (1), Hector's shared book (2) and the tester's own book (3), all reading "Hector's Recipes". Claude placed each item on the [UX map](../ux-map.md) the same day.

## The feedback as given

Hector's summary, numbered in order, with spelling tidied. His notes are in brackets.

1. When I'm navigating on your book, how do I get back to my recipes? [Navigation is not clear.]
2. You should have a drop zone for files: grab from the desktop, a folder, etc. and drop into your saved recipes.
3. No picture exchange: if I have a better picture, I can't change it. [We should do a whole pass where our file and photo features are more robust and work as you'd expect.]
4. What is list and what is plan? If I have a YouTube video or recipe, it should format it and add it as a recipe link. [Capturing from YouTube is much harder. The useful part is that the naming confuses: call list "groceries" and plan "meal plan". A simpler YouTube way: the transcript, though not the most reliable, or the description, which may have a recipe link.]
5. Clicking 1 goes to you, 2 goes to you, 3 is my recipes, but I changed my name and the book didn't update. [Check the name change, though it should work.]
6. [Hector: he's on a desktop, so the wide sheets are probably throwing him. No separate desktop design, but easy changes that make it more usable are welcome. We don't want exceptions here and there without knowing what is meant to be responsive and what is a design choice: track it somewhere.]

## Placed on the map

### Find something to cook

- **F1 Getting back to your own book.** Built in Phase 26 (P26.2; D82; hectarek/hector-mono#37).
  - Library: the book pills show names only, and two books can share one: a personal book is named "{first name}'s Recipes" at sign-up (D19). Whose book it is shows only after you pick it (the role badge on the title, for books that aren't yours). The app's wordmark reads "Hector's Recipes" too, and goes to your default view.
  - Proposal: the pills say whose a book is: your own first after All recipes, and a small people icon on books shared with you. A recipe's back link names its book ("Hector's Recipes") rather than "Recipes" when you're in two or more.
  - Cost: the pills get a little wider; no new control.
- **F5 A name change that "didn't update".** Checked on the test project, 2026-10-08: the account's name does change. It's saved, the header's initials follow, and member lists show the new name. The book's name doesn't, because it's set once at sign-up from the first name (D19). Built in Phase 26 (P26.3; D83, option c; hectarek/hector-mono#37).
  - Options: (a) a book named automatically follows its owner's name until someone renames it, which needs a flag on the book (a migration); (b) keep names fixed, and put Rename where an owner looks for it (the book's ⋯, not only the members page); (c) both.
  - Claude's recommendation: (c), with F1's marks, since two people can share a first name whatever the book is called.

### Add a recipe

- **F2 A drop zone for files.** Needs scoping, with F3 (a draft in Hector's tracker).
  - Add by photo or file has only a picker button; on a desktop, files are dragged. `@repo/ui` has a `FileDropZone`, for one file at a time; photos come up to 3.
  - Cost on phones: none, since a drop target shows only where files can be dragged.
- **F3 Changing a recipe's photo.** Needs scoping: a photos-and-files pass (a draft in Hector's tracker).
  - A recipe's photo is a link (the form's Photo link), never an upload, and the photos a recipe is read from aren't kept (D53).
  - To decide: uploading and replacing a photo (camera, files, drop), keeping the photo a recipe was read from (revisits D53), where photos are stored and what that costs, and who can see them.
- **F4b A recipe from a YouTube link.** Needs scoping, with Phase 20 (measuring AI reads, links first; a draft in Hector's tracker).
  - Add by link or text reads a page's recipe data, then its text. A YouTube page has neither in a form the reader uses.
  - Options, most to least reliable: a recipe link in the video's description (followed like any link), the description's own text (read by AI), the transcript (often missing or loose). The video link becomes the recipe's video (Phase 24, D72).

### All jobs: words

- **F4 "What is list and what is plan?"** Built in Phase 26 (P26.1; D84; hectarek/hector-mono#37): the list is **groceries** and the plan is **meal plan**.
  - Where the words appear: the recipe page's Add to list and Add to plan, cook mode's Add to list, a meal's Add to grocery list, Open list and Open plan, the Plan tab, and Groceries' "Grocery list" label.
  - Proposal: a Words section on the map naming each thing once (recipe book, meal plan, groceries, meal, cook day, eat days), so new screens use the same words. "Add to groceries" and "Add to meal plan" side by side need a check at 375 px.

### Wide screens

- **F6 A desktop without a desktop design.** Built in Phase 26 (P26.4; D85; hectarek/hector-mono#37).
  - The app is designed at 375 px. On a wide screen the page stops at 768 px wide (`max-w-3xl`), but bottom sheets span the whole screen. Width-specific styles today: 8, in 4 files (the library's grid at 3 columns, the recipe page's facts, Neon's account page, the library's loading shapes).
  - Easy candidates: (1) sheets no wider than the page, centred, which is one change in `@repo/ui`'s Drawer for every sheet in every app; (2) F2's drop zone.
  - Tracking: a Wide screens section on the map, listing every width-specific change and why, and a test that fails when an `sm:`, `md:`, `lg:` or `xl:` style appears in the app without a row there. That tells a responsive adaptation (the same design, fitted) from a design choice (a different design on desktop).

## What it says about the app

- **Names carry more than they should.** A book named after a person collides with another person of that name and with the app's own name, and doesn't follow a rename. Ownership needs its own mark.
- **The app's words aren't fixed anywhere.** "List", "grocery list" and "groceries" all name one thing. A Words section on the map would hold them.
- **Desktop use is real**, and the app has no rule for it yet. Most of what feels wrong there is one component (sheets) at full width.
- Two items need scoping before any design: a photos-and-files pass (F2, F3) and recipes from YouTube (F4b).
