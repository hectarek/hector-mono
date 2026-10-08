# First testers, 2026-10-07

## Where it came from

The app's first testers, using it on their phones, told Hector what they wanted. He summarized it on 2026-10-07 as 23 items. Claude placed each on the [UX map](../ux-map.md) (ux-plan.md P22.3), and Hector answered on 2026-10-08 (D71–D79).

## The feedback as given

Hector's summary, numbered in order, with spelling tidied:

1. Consider changing the new + to recipe + as that is more clear.
2. Need to make it faster (website is slow, could be because of current vercel plan / set up) but load times are slow for someone across the country.
3. Make a dictionary for ingredients (tool tip for defining what an ingredient is) difficult stuff like turbinado sugar. Basically something that aids people in understanding what something is, a short description of it, etc. Should be able to highlight it in any recipe and search with picture, but this is a much larger feature we need to discuss more.
4. Suggest alternative ingredients when cooking, substitutes (maybe do that in the ingredients section for cook mode before you start the steps to locally overwrite the ingredients for one time).
5. Make a chef AI to help you while you are cooking (basically a talking AI agent that you can directly converse with using real time voice models). Much bigger and we need to scope this out.
6. Unit conversions for recipes (need the ability to convert units easily in a recipe, while cooking, etc).
7. Versioning of recipes or make variations of recipes. This could look like a simple copy this recipe but we need to have a better experience than just that so we don't have a ton of the same recipes polluting the db.
8. Add Word docs as accepted file type.
9. Bookmark recipes, ability to bookmark them for easy filtering and it goes to the top by default.
10. Sort by viewed most recently. This we would need to think about so we don't unnecessarily save every view, which adds a ton more data.
11. Need to be able to easily paste by text mass and organize. We already have this if a link doesn't work but we need to add this to manual entry as well or as a separate option.
12. Better animation while any AI is being used (for example while images are processing): a much cuter and more pleasing animation for people to look at.
13. Onboarding tour: a comprehensive onboarding tour so people know how to use the app.
14. Default tags or suggested tags (dedup tags in the data). When people make a fresh account they don't have any tags. We need some suggested tags, and to consider how this is in the data so we don't have so many of the same tags per user. Reuse where possible.
15. Add shareable options for links. Right now we only have the ability to copy link, but we should be able to use device sharing methods.
16. Add recipe book link: some people want an experience that says add someone else's recipe book, with a place to paste the link that serves the same purpose as opening it in a new browser, so it's explicit.
17. Count the recipes: a simple count of the number of recipes in a book.
18. Share individual recipes, not the whole book (this may exist, but it's not clear how; if it doesn't, a clean way to do it).
19. Add a tag for meal-prep.
20. Add a place for a video link, like the picture; if a video is present it shows in place of the picture and the picture becomes the backup (or suggest an alternative UX).
21. Make sure there's your own public page where you can show off your recipes.
22. Have featured sections or pages where you can showcase sections (like Pinterest boards).
23. In addition to the chef AI, it teaches you how to cook if you don't know how: techniques, basics. Need to think how to include those together.

## Placed on the map

### Find something to cook

- **F9 Bookmarks, shown first.** Built in Phase 24 (P24.1, P24.2; D72, D77, D80; hectarek/hector-mono#33).
  - Library and recipe page. A bookmark is per person (D77), so it needs a new table.
  - The recipe page had no room for the toggle (no ⋯), and library cards carry no actions (D32). Hector placed it as an icon to the right of the recipe's name (D72). In the library: Saved first, and a Saved chip.
  - Cost: the grid's order changes, so it sits with search's ranking (D56) and Group by.
- **F10 Recently viewed first.** Built in Phase 24 (P24.2; D76, D80; hectarek/hector-mono#33).
  - Library. Kept on the device, not in the database (D76), which answers the worry about storing every view.
  - A sort would be a fourth control above the grid, so it joins Group by in one control.
- **F17 The recipe count.** Built in Phase 23 (P23.2; hectarek/hector-mono#32).
  - The library's label over the title, and Books' rows; both have room.
- **F14 and F19 Suggested tags, and meal prep.** Built in Phase 24 (P24.4; D78; hectarek/hector-mono#33).
  - The tag picker offered only tags already on recipes in your books, so a new account saw none, though the shared tag catalog (migration 0013) holds the starting tags under meal, cuisine and diet.
  - Tags were never copied per person: they're text on each recipe, and the catalog has one row per tag for everyone. Near-duplicates ("meal prep", "meal-prep") are the risk.
- **F20 A video.** Built in Phase 24 (P24.3; D72, D81; hectarek/hector-mono#33).
  - The recipe page's photo and the form. A video takes the photo's place; its link sits under Photo link.
  - Embedding works differently per host, and some refuse it, so the photo stays as the fallback.
- **F7 Variations.** Needs scoping (D79).
  - Copy already records where a recipe came from (`copied_from_recipe_id`), so a variation could be a recipe with a parent, shown under it rather than as another card. It would live in the recipe page's ⋯ (D72).

### Add a recipe

- **F1 The New button.** Built in Phase 23 (P23.1; hectarek/hector-mono#32).
  - The library's main action. The voice says what happens ("Add to list"), and the chooser's rows read "Add by …": "Add recipe".
- **F11 Pasting a whole recipe.** Built in Phase 23 (P23.6; D73; hectarek/hector-mono#32).
  - Half there: the manual form splits a pasted list into rows and says so, and Add by link read pasted text with AI, but only after a link failed. A clarity problem.
- **F8 Word documents.** Built in Phase 23 (P23.7; D74; hectarek/hector-mono#32).
  - Add by photo or file, read like a text file. Reverses D53.
- **F12 A friendlier wait.** Built in Phase 23 (P23.8; D75; hectarek/hector-mono#32).
  - The two reading screens showed a spinner.

### Cook

- **F4 One-time substitutes on Gather.** Needs scoping (D79).
  - On Gather a tap ticks a row, so a swap would sit behind a row ⋯ and its sheet (D10). Swaps could come from a line's note (D23), AI (after Phase 20) or a dictionary (F3).
- **F6 Unit conversions.** Needs scoping (D79).
  - No room beside the servings stepper (7 px to spare at 375 px, L5). Options: a per-person setting, a servings-and-units sheet, or tapping a line. Cups to grams needs densities nothing holds yet.

### Share a book or plan

- **F15 The phone's share sheet.** Built in Phase 23 (P23.3; hectarek/hector-mono#32).
  - Already there: Invite and Share link opened the share sheet where the browser has one, and copied the link where it doesn't. The buttons named the role (Can edit, View only), not the sharing. A clarity problem.
- **F16 Joining by pasting a link.** Built in Phase 23 (P23.4; hectarek/hector-mono#32).
  - A Join field on Books. Books has room.
- **F18 Sharing one recipe.** Built in Phase 23 (P23.5; D72; hectarek/hector-mono#32).
  - Already worked by link for anyone signed in (`get-recipe.use-case.ts`), who can Copy it into their own book, but nothing showed it. A clarity problem: a Share in the recipe page's ⋯.

### A possible new job: learning while you cook

- **F3 An ingredient dictionary.** Needs scoping, after Phase 20 (D79).
- **F5 and F23 A talking assistant that also teaches.** Needs scoping, after Phase 20 (D79).
  - Nothing holds a conversation today. Cook mode's top bar is full, and a step screen holds one step on purpose (D63). It runs on AI throughout, against the monthly budget (D27).

### A possible new job: showing off your recipes

- **F21 and F22 A public page with boards.** Needs scoping (D79).
  - Every screen is behind sign-in today. Sharing with signed-in people already works by link (F18).

### The whole app

- **F2 Faster far from the servers.** Needs scoping (D79).
  - Vercel Hobby and Neon Free, and no function region set in the repo. To measure, not assume: the function's region against the database's, Neon waking from idle, and the proxy's session refresh.
- **F13 Onboarding.** Needs scoping (D79).
  - Today it's the welcome screen and the empty states. Options: a first-run tour, stronger empty states, or a starter recipe.

## What it says about the app

- **Three requests were for things that already existed** (F15, F18, half of F11). Sharing and pasting were there but hard to find: Phase 23 makes them visible rather than adding them again.
- **The recipe page drew four requests** (bookmarks, sharing, variations, a video) and had no room for any of them. One change made room: a bookmark beside the name and a ⋯ for the rest (D72).
- **The largest ideas are new jobs** for the app (learning while you cook, showing off your recipes). They wait until the smaller work is done, and the first comes after Phase 20, which sets how AI features are measured (D79).
- Placing the round also turned up 12 places where the app breaks its own rules, listed on the map, to be fixed in Phase 25.
