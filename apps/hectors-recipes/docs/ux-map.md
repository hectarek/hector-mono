# UX map

What each screen is for, which jobs cross it, and what fits on it. Read it before designing a change to a screen, an action or a sheet, and place the change on it first ([ux-plan.md](./ux-plan.md) D70).

It sits beside three other sources, and doesn't repeat them:

- How screens look: the "Hector's Recipes" design system in Claude Design (tokens, type, surfaces, voice, bold moments), linked from the app's [AGENTS.md](../AGENTS.md#ui-rules).
- How shared patterns work (the title's ⋯, buttons, bottom sheets, lists you check off): AGENTS.md's UI Rules.
- How each feature works underneath: [features.md](./features.md).

Read from the code on 2026-10-07. Routes are from `app/`.

## Placing a change

A new feature, a change to a screen, or a tester's request answers these four questions on this map before it's designed. The answers go in the decision that adopts it (a D-number in ux-plan.md). Feedback from people using the app is filed by round in [feedback/](./feedback/README.md) and placed here the same way (D71).

1. **Which job does it serve?** One of the six below. If none, it's a new job: Hector's call, and it may need a screen of its own.
2. **Which screen does it go on, and is there room?** Read the screen's **Room**. A screen has one main action (D32), so a second one means one of them gives way. Other actions go in the title's ⋯ (D42) or a row's sheet. At most one bold moment is in view.
3. **Which pattern carries it?** One from the patterns table. If none fits, the new pattern is written down where its kind of rule lives (AGENTS.md's UI Rules, or the design system) before a screen uses it.
4. **What does it cost the other jobs?** A tap added to a job's path, a new way in to a screen, something moved behind a ⋯, or a screen getting busier. The decision names it.

A mockup goes on the Claude Design canvas only when a change moves things around on a screen. The code and this map are the record of what's built.

A change that adds, moves or removes a screen, an action, a sheet or a way between screens updates this map in the same commit (ux-plan.md's definition of done for a UI task). A new pattern gets a row in the patterns table.

## The jobs

The app is phone-first, built for people who share a recipe book and a plan. Six jobs cover what people come to it for (Claude's grouping).

| Job | Starts at | Screens, in order | Browser flow |
|---|---|---|---|
| Find something to cook | Recipes tab | Library → Recipe | `plan-and-shop` (search, Sort and group) |
| Add a recipe | Library's Add recipe | Add a recipe → by link, by photo or file, or manually → Recipe form → Recipe | `plan-and-shop` (manually), `add-recipe` (photo or file) |
| Plan the week | A recipe's Add to plan | Recipe (Add to plan) → Plan | `plan-and-shop` |
| Shop | Plan's grocery button, or a recipe's Add to list | Plan → Groceries | `plan-and-shop` (check off, Got it, Clear list) |
| Cook | A recipe's Cook | Recipe → Cook mode (Gather → each step → Done) → Recipe | `cook` |
| Share a book or plan | A tab's ⋯ → Invite | ⋯ → the phone's share sheet; the person invited: Welcome → Create account → Join → the book or plan | none |

Supporting screens: Books (default book, new books), Members (links, roles, leaving, deleting), Copy recipes, Account.

## The app's shape

```
Signed out (own screens, no tab bar)
  Welcome                          /welcome
    Sign in, Create account        /auth/[path]      Neon's forms

Signed in: header and tab bar
  Recipes tab
    Library                        /
      Recipe                       /recipes/[id]     back link; the Recipes tab stays lit
      Books                        /books            back link
        Copy recipes               /books/[id]/copy  back link
  Plan tab
    Plan                           /plan
  Groceries tab
    Groceries                      /groceries
  Not under a tab
    Members                        /spaces/[id]/settings   from a tab's ⋯, or Books
    Join                           /join/[token]           from an invite link
    Account                        /account/[path]         from the header's account button

Full-screen tasks: no header or tab bar, their own way out
  Add a recipe                     /recipes/new, then /link, /photo or /manual
  Edit a recipe                    /recipes/[id]/edit
  Cook mode                        /recipes/[id]/cook

Error, Not found                   any route
```

The header has the logo (to the library) and the account button. Plan and Groceries open the default plan (D14); a tab doesn't carry the plan you were looking at.

## Screens

Each screen lists its main action (the one filled button, D32), what its ⋯ holds (D42), the rest of what's on it, and how you get there and on. **Room** says what more the screen can take under those rules and the one-bold-moment limit. It's Claude's reading, for Hector to overrule.

### Library — `/`

- **Job:** find something to cook. Also the way in to adding a recipe.
- **Surface:** Market. Tab page.
- **Title:** the book's name (two lines before it clips) under "Recipe book", or "All recipes" (D17), with a role badge when the book isn't yours. A row of book pills above it in two or more books.
- **Main action:** Add recipe, beside the title (editors) → Add a recipe.
- **⋯:** Invite (owner), Members, All books. In All recipes: All books only. Invite turns the sheet into "Share a link to edit" and "Share a view-only link" ("Copy …" where the browser has no share sheet, P23.3).
- **Also on it:** search (narrows as you type, D56); Sort and group (Saved first, Recently viewed, A to Z; by meal, cuisine or diet; D57, D80); the Saved chip first among the tag chips (D77); the count over the cards ("24 recipes", or "3 of 24 recipes" while narrowed, P23.2); the card grid (a card opens its recipe); "Copy recipes to another book" under the grid (the book has recipes, it isn't All recipes, and you're in two or more books).
- **Empty:** "No recipes yet" with Add a recipe (editors); "No recipes match" with Clear filters.
- **Bold:** produce tiles on cards without a photo; the grid is the exception to one bold moment.
- **Reached from:** the Recipes tab, the logo, a recipe's back link and tag chips, Books, Join, Copy recipes, and after deleting or copying a recipe.
- **Leads to:** Recipe, Add a recipe, Books, Members, Copy recipes.
- **Room:** the title row is full (Add recipe and ⋯). Search, Sort and group and the chips already sit above the grid: a new order or grouping belongs in Sort and group, a new filter among the chips, and a new book-wide action in the ⋯.

### Recipe — `/recipes/[id]`

- **Job:** read a recipe and decide what to do with it: cook it, plan it, or shop for it.
- **Surface:** Reading. Back link "Recipes" (to its book); the Recipes tab stays lit.
- **Title:** photo or produce tile, the name with its bookmark to the right (filled when saved, D72, D77), description, time, servings, a link to the source. A recipe with a video has Play video over the photo, which plays it there for YouTube and Vimeo, or Watch video, which opens another host's page (D81).
- **Main action:** Cook (full width) → Cook mode, at the servings chosen.
- **⋯:** beside the back link (D72): Edit (editors), Share recipe (everyone; Copy recipe link where the browser has no share sheet), Copy to another book (when you can edit another book), whose book picker is a step in the sheet.
- **Also on it:** Add to list and Add to plan (when you can plan); tag chips (→ the library on that tag); the servings stepper (recipes with servings); Ingredients; Method.
- **Opens:** bottom sheets.
  - Add to plan: cook day and eat days as day buttons (D38), the plan picker in two or more plans; then Open plan.
  - Add to list: servings, the list picker; then Open list. "It's already on this list" asks before adding again (D45).
- **Bold:** the produce tile when there's no photo.
- **Reached from:** a library card, a planned meal's title, Save in the recipe form, cook mode's Done, or a link to it.
- **Leads to:** Cook mode, Edit, Plan, Groceries, the library.
- **Variants:** a viewer of the book has no Edit; someone who can only view plans has no Add to list or Add to plan. Anyone signed in can open a recipe from its link, even outside its book (get-recipe.use-case.ts), and can Cook, plan it or copy it into their own book; Share recipe sends that link (P23.5).
- **Room:** Cook, Add to list and Add to plan stay in view; everything else goes in the ⋯ (D72). The bookmark comes beside the name (Phase 24).

### Plan — `/plan`

- **Job:** see the week: what's cooked and eaten each day. Start the shop.
- **Surface:** Market. Tab page.
- **Title:** the plan's name over "Meal plan", with a role badge. Plan pills above it in two or more plans.
- **Main action:** "Add N meals to the grocery list", in the grocery box under the week (editors, when there's something to add; D41, D44, D50).
- **⋯:** Invite (owner), Members, Make my default plan (two or more plans; a line instead when it is), Start my own plan (when you own none).
- **Also on it:** the week's arrows and range, Back to this week, seven days (the Today sticker). Each meal: a cooked check on its cook day (D39), its title (→ the recipe), a note of its days and whether it's on the list, and a ⋯ (editors). The grocery box: "Shopping for" (next 3, 7 or 14 days, or all upcoming), the result line, Open list.
- **Opens:** a meal's sheet: Change days, Add to grocery list (or Add to list again), Not eating it on Mon 5 (from a leftovers day, D43), Remove meal.
- **Gestures:** a sideways swipe changes the week (D51), sliding in (D54).
- **Empty:** "Nothing planned this week. To plan a meal, open a recipe and tap Add to plan." Viewers see "Nothing planned this week."
- **Bold:** the Today sticker.
- **Reached from:** the Plan tab, Add to plan's Open plan, Join (a plan), Start my own plan, after leaving or deleting a plan.
- **Leads to:** Recipe (a meal's title), Groceries (Open list), Members.
- **Room:** no title-row action: planning starts on a recipe (D40). The week fills the screen, with the grocery box under it (D50). An action on one meal goes in the meal's sheet.

### Groceries — `/groceries`

- **Job:** shop: check items off in the store, and add the odd item by hand.
- **Surface:** Market. Tab page.
- **Title:** "Grocery list" over the plan's name, with a role badge. Plan pills above it in two or more plans.
- **Main action:** Add, beside the add box (editors).
- **⋯:** Invite (owner), Members, Clear list (editors, when the list has items; asks first, D52).
- **Also on it:** the add box; Group by, By aisle or By recipe (D60; shown when items came from recipes); the list under aisle or recipe headings; Got it (closed until tapped), holding the checked items and Clear checked.
- **Rows:** tap to check off (the whole row; it folds into Got it); "for" its recipes; "Not saved yet" when offline; a ⋯ (editors) opening Edit and Remove from list.
- **Live:** other people's changes appear as they're made (D21), with a refresh every 60 s. Check-offs made with no signal are kept and sent later (D8).
- **Empty:** "Everything's in the cart.", or "The list is empty. Add items above, or add a recipe or your planned meals." (viewers: "Nothing on the list yet."). No button.
- **Bold:** none.
- **Reached from:** the Groceries tab; Open list from a recipe's Add to list, Plan's grocery box, or cook mode's Add to list.
- **Leads to:** Members. Nothing links to recipes or Plan.
- **Room:** used one-handed, in a store, often with bad signal. Keep it to the list: anything else goes behind the ⋯ or the row's ⋯.

### Books — `/books`

- **Job:** manage recipe books: the default book, joining someone's book, a new book, a book's members.
- **Surface:** Market. Back link "Recipes"; the Recipes tab stays lit. A plain title, "Recipe books", with no ⋯.
- **Main action:** Create, in the New book form at the bottom.
- **Also on it:** Default book (two or more books, D17); each book: its row (→ its library, with its role and count, P23.2) and Members (→ Members); Join someone's book, which takes a pasted invite link to its Join page (P23.4).
- **Reached from:** the library's ⋯ → All books; Copy recipes' Go to books; after leaving or deleting a book.
- **Leads to:** the library (a book), Members, Join.
- **Names:** a personal book is named at sign-up from its owner's first name ("Hector's Recipes", D19) and keeps that name when the account's name changes; its owner can rename it on Members.

### Copy recipes — `/books/[id]/copy`

- **Job:** copy several recipes from one book to another.
- **Surface:** Market. Back link: the book's name.
- **Main action:** Copy N recipes. Also: Select all or none, a checkbox per recipe, and "Copy into" in a footer that stays on screen.
- **Empty:** "No book to copy into" with Go to books.
- **Reached from:** the library's "Copy recipes to another book". **Leads to:** the library (the target book).

### Members — `/spaces/[id]/settings`

- **Job:** who's in a book or plan, its invite links, leaving, deleting.
- **Surface:** Market. Back link: the book's or plan's name (a plan's goes to Plan, even when you came from Groceries).
- **Main action:** New link: can edit (owner).
- **Owner:** Rename; Invite links (Share link, or Copy link where the browser has no share sheet; Turn off, which asks first; New link: view only); Members, each with Make view only or Allow editing, and Remove, which asks first; Delete, which asks first.
- **Everyone else:** Members, and Leave on their own row, which asks first.
- **Reached from:** a tab's ⋯ → Members; Books' Members.
- **Leads to:** the book or plan; Books or Plan after leaving or deleting.

### Join — `/join/[token]`

- **Job:** accept an invite to a book or plan.
- **Surface:** Market. Back link "Recipes".
- **Main action:** Join recipe book or Join meal plan; Open it when you're already in. "Make it my default plan" (checked) when joining a plan while your own is in use (D15).
- **Inactive link:** "This invite link isn't active", with Go to recipes.
- **Reached from:** an invite link, through Welcome and Create account when signed out (D3), or pasted on Books (P23.4). **Leads to:** the book or plan.

### Account — `/account/[path]`

- **Job:** the account itself (Neon's own views) and Appearance: light, dark or match the device.
- **Surface:** Market. Back link "Recipes".
- **Reached from:** the header's account button (Neon's menu).

### Add a recipe — `/recipes/new`

- **Job:** choose how to add a recipe (D34).
- **Surface:** Market. Full-screen: Cancel, "New recipe".
- **On it:** three rows, Add by link or text, Add by photo or file, Add manually, whose words say which are read into the form for you and which you type (D73). No filled button.
- **Reached from:** the library's Add recipe, and its empty state's Add a recipe. **Leads to:** the three ways in; Cancel → the library.

### Add by link or text — `/recipes/new/link`

- **Job:** read a recipe from a web page. The page's own recipe data is read first, without AI (D29).
- **Surface:** Market. Full-screen: Cancel (→ Add a recipe), "Add by link or text".
- **On it:** one box for a recipe's link or all its text (D73): a lone web address is read as its page, anything else as text.
- **Main action:** Read recipe. After a failed link: a line saying the page's text can be pasted in its place (the link stays the recipe's source), Add by photo or file, Add manually.
- **While reading:** the produce row hopping in a wave over "Reading the page. This can take up to a minute." (`ReadingWait`, D75; still with reduced motion).
- **Leads to:** the recipe form, filled in, with "Read from <site>. Check it before saving."

### Add by photo or file — `/recipes/new/photo`

- **Job:** read a recipe from up to three photos, a PDF, a Word document or a text file (D53, D74).
- **Surface:** Market. Full-screen: Cancel (→ Add a recipe), "Add by photo or file".
- **Main action:** Choose a photo or file. After a failure: Add by link or text, Add manually. With no AI reads left today (D48), it says so in place of the picker, with the same two.
- **Leads to:** the recipe form, filled in, with "Read from your photos. Check it before saving." (or photo, PDF or file), then "Saving to <book>." for someone with one book.

### Recipe form — `/recipes/new/manual`, `/recipes/[id]/edit`, and after a read

- **Job:** write or correct a recipe (D7).
- **Surface:** Market. Full-screen: Cancel, "New recipe" or "Edit recipe", Save (the main action).
- **Fields:** Book (new, when you can edit two or more), Title, Description, Servings, Time, Source link, Photo link, Video link (which says where it plays).
- **Ingredients and Method:** rows and sections. A row's ⋯ opens its sheet: a line's note and Optional, a step's timer, Move up, Move down, Remove, Done. Pasting several lines into a row makes a row for each.
- **Tags:** chips under their groups, your tags first and then the catalog's (so a new account has some, D78), and New tag (D33, D55).
- **Edit only:** Delete recipe at the bottom, which asks first.
- **Imports:** "Check before saving" lists the lines the reader was unsure of.
- **Leaving:** Cancel with changes asks "Discard your changes?".
- **Reached from:** Add manually, a finished read, a recipe's Edit. **Leads to:** the recipe on Save; Cancel → the library (new) or the recipe (edit); Delete → the library.
- **Room:** a long form already. A new field goes in a row's sheet when it belongs to one line or step, and among the fields at the top only when it belongs to the whole recipe.

### Cook mode — `/recipes/[id]/cook`

- **Job:** cook from a phone at arm's length, one screen at a time (D63–D66).
- **Surface:** Cook. Full-screen. Top bar: the name, or "Step 3 of 8" (opens every step, to jump to one), the screen-lock sun, Done (→ the recipe, at the servings chosen here). Bottom bar: Back and Next.
- **Screens:** Gather (tick ingredients as you get them out, servings, Add to list, Start cooking) → each step (its words, the ingredients it uses, its timer, the full list in a sheet) → Done (Start over, Back to the recipe).
- **Also:** running timers stay pinned in the top bar on every screen (D66); a sideways swipe moves a screen; progress survives a reload.
- **Reached from:** a recipe's Cook only. **Leads to:** the recipe; Groceries through Add to list's Open list.
- **Room:** a step screen holds one step on purpose. Anything that isn't about the step in front of you goes on Gather, Done or a sheet.

### Welcome — `/welcome`, and Sign in or Create account — `/auth/[path]`

- **Job:** get in. Welcome: the produce row, the logo, one line, Create account (the main action) and Sign in (D3). Arriving from an invite, it names what you're invited to.
- **Sign in and Create account:** Neon's forms, with the app's wording; back link "Welcome".
- **Bold:** Welcome's produce row.
- **Leads to:** where you were going, or the library.

### Error and Not found

- Error: "Something went wrong", Try again (main) and Recipes. Not found: Go to recipes (main).

## Patterns: where each rule lives, and where it's used

| Pattern | The rule | Used on |
|---|---|---|
| Page title with the main action and a ⋯ | AGENTS.md UI Rules (D42) | Library, Plan, Groceries |
| Back link | AGENTS.md UI Rules | Recipe, Books, Copy recipes, Members, Join, Account, Sign in |
| Full-screen task with its own way out | AGENTS.md UI Rules | Add a recipe and its three ways in, the recipe form, cook mode |
| Buttons: one filled main action, the rest `secondary`, 45 px | AGENTS.md UI Rules (D32) | Every screen |
| Bottom sheet for a short task | The design system's Patterns; D10 | Every ⋯ (a recipe's too, with Copy to another book as a step), a meal, a grocery item, a form row, cook mode's steps and ingredients, the recipe page's Add to plan and Add to list |
| Dialog | AGENTS.md UI Rules (asking first) | Confirmations: discard changes, delete a recipe or a space, remove a member, leave, turn off a link |
| List you check off | The design system's Patterns; AGENTS.md UI Rules | Groceries. Cook mode's ingredients are toggle buttons; Copy recipes uses plain checkboxes |
| Empty state: a produce tile, one sentence, the action | The design system's Patterns | Library. Plan and Groceries have the sentence only |
| Book or plan pills, and pickers | AGENTS.md UI Rules (pickers); no written rule for the pills | Pills on the three tabs; pickers in dialogs and the form |
| Sideways swipe | D51, D54, D63 | Plan's week, cook mode |
| A tap's message when the connection drops (`callAction`) | AGENTS.md UI Rules | Plan's meals and its grocery button, Groceries, a recipe's Add to plan and Add to list (cook mode's too) |
| Bold moments, one in view | The design system; AGENTS.md UI Rules | Library tiles, a recipe's tile, Plan's Today sticker, the active tab, Welcome's produce row |
| Waiting on the AI: the produce row in a wave | D75; AGENTS.md UI Rules | Add by link or text, Add by photo or file |

## Where the app and its rules disagree

Found while writing this map, on 2026-10-07. None is fixed in Phase 22; each is placed with the testers' feedback (P22.3) and decided there.

1. The recipe page's Add to plan and Add to list open centred dialogs (Copy moved into a sheet in P23.5). The design system's bottom-sheet pattern names "adding to the plan" (and D10 chose a sheet for row actions for the same reason). **Fixed in P25.1: both are bottom sheets.**
2. Groceries' Add button is the default size (40 px), not `lg` (D32). **Fixed in P25.1: it's `lg`.**
3. Add to list (on the recipe page and in cook mode), Add to plan and Plan's grocery button call their actions without `callAction`. With no signal they likely land on the error page, which the rule exists to prevent. **Fixed in P25.1: Add to plan goes through `callAction`, and the two that say what they added through `callResultAction`.**
4. Two filled buttons on one screen: cook mode while a timer is up (Time's up · Dismiss beside Next). Add by link's pair went with its one box (P23.6). **Fixed in P25.1: a timer that's up is `secondary`, with a ringing bell.**
5. The members page has three names: Members (the ⋯), Share (Books, for owners) and People (its heading). **Fixed in P25.1: Members on all three; Books' intro says invites are in a book's Members.**
6. Groceries' empty text tells viewers to "Add items above", but viewers have no add box. Plan shows viewers no empty text at all. **Fixed in P25.1: viewers get "Nothing on the list yet." and "Nothing planned this week."**
7. The ways out after a failed read differ: Add by link or text offers pasting the text, photo or file, and manually; Add by photo or file offers only manually. **Fixed in P25.1: Add by photo or file offers Add by link or text and Add manually.**
8. Reading with AI being paused (D27's budget) or at its daily limit (D48) shows only after a read fails. **Half fixed in P25.1: the daily limit shows before a read (Add by photo or file in place of its picker; Add by link or text in its note, keeping the box for links). The budget's pause still shows only after a read: the app can't know it before without remembering a refused read, which needs a table (H35).**
9. Removing a member, leaving a book or plan, and turning off a link don't ask first. Deleting a recipe or a space does. **Fixed in P25.1: all three ask first (`ConfirmActionButton`).**
10. Cook mode's Done goes back to the recipe without the servings chosen there. **Fixed in P25.1: Done and Back to the recipe carry `?servings=`, which the recipe page takes.**
11. A read recipe's "Read from …" note replaces "Saving to <book>", so someone with one book isn't told where it will be saved. **Fixed in P25.1: the note keeps "Saving to <book>." after the read's sentence.**
12. The Books page's Create form submits with a plain `<form action>`, which AGENTS.md says clears the field on a validation error.
