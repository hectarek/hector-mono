# Meal Planner — Adapted Spec

Status: **built (MVP)**, 2026-09-23, in 9 increments (one PR in the earlier private repo; see [history](../../../docs/public-repo.md#history)). The spec below is rev 4 as agreed; [As built](#as-built) records where the build departed from it and what's still to verify.

This adapts the original meal-planner build spec to the existing `hectors-recipes` app: clean architecture, Drizzle + Neon, and per-user Neon Auth accounts. The weekly loop:

> browse recipes → put them on days → quick-add ingredients to a grocery list → cook from a clean view → mark meals eaten

There are three shareable things: **recipe books** (what you cook), **meal plans** (when you cook it), and **grocery lists** (what to buy). All three share one membership and invite system. There are no households, and they are only loosely tied to each other.

---

## Decisions

| Topic | Decision |
|---|---|
| Auth | Keep Neon Auth; each person has their own account |
| ORM | Drizzle (already in place) |
| Offline / PWA | Dropped for v1. Online only, plus a web app manifest so it installs to the home screen |
| Sharing | One shared `spaces` table typed `recipe-book` / `meal-plan` / `grocery-list`, with one membership table, one invite table, and one role set (`owner` / `editor` / `viewer`) |
| Default share role | `editor`, with a view-only toggle. Viewers are fully read-only |
| Recipe read access | Any signed-in user can open a recipe by its link. Membership controls **browsing** a book and **editing** it, not reading a single recipe. There are no secret recipes |
| Plan ↔ recipe | Loose. A plan entry saves the recipe title when added, and the recipe link is optional. Free-text entries ("Leftovers", "Eating out") are allowed |
| Plan ↔ grocery list | No tie. "Add to list" goes to the grocery list you use |
| Plan dates | None for MVP. A plan is a long-running shared calendar of dated entries, viewed a week at a time. Optional start/end dates can be added later without breaking anything |
| Servings | Stored on the recipe as the source states it (optional). Scaling is a best estimate. Plan entries have no servings |
| Grocery list | A plain to-do list: one check state, remove, "Clear checked". Adding from a recipe copies text in once. One rolling list, not per-week |
| Ingredients | The raw line as written is the source of truth; quantity/unit/name are a best-effort parse and may be empty |
| Instructions | Markdown text. More structure (step order, timers, sections) comes later |
| Units | The parser recognizes the common units plus clove, can, bunch, slice, pinch, and "to taste" |
| Tags | Vault `meal` (Dinner, Dessert…) and `recipe_tags` both become plain tags |
| Seed | From the Obsidian vault's recipe notes via a dry-run-first script. The full migration happens later |
| Removed | `recipes.visibility`: access now comes from spaces plus open reading by link |

### Data naming convention

Stored enum-like values are **readable on their own**, so a raw row makes sense without looking up a definition: `recipe-book`, not `book` or `1`. Use lowercase with hyphens, and keep them short but unambiguous. This applies to space types and roles now, and to any future type/status column.

---

## Spaces: the sharing model

A **space** is anything that can be shared: a recipe book, a meal plan, or a grocery list. Every space has members with roles and can have invite links.

### Roles (the same for every space type)

| Capability | owner | editor (default) | viewer |
|---|---|---|---|
| See the space's contents | ✓ | ✓ | ✓ |
| Add / edit / remove contents (recipes, plan entries, grocery items) | ✓ | ✓ | ✗ |
| Invite, change roles, remove members; rename / delete the space | ✓ | ✗ | ✗ |

Each space has exactly one owner, enforced in the database. Transferring ownership means changing two role rows.

### Sharing

The owner creates an **invite link** with a role (editor by default, or view-only). Opening it while signed in adds you as a member. The owner can revoke links, change roles, and remove members. There's no email delivery to set up.

### Personal spaces

- **Recipe book** "My Recipes": created on first sign-in.
- **Meal plan** "My Plan" and **grocery list** "Groceries": created the first time you open the Plan or Groceries tab. Creating them lazily avoids empty clutter.

The typical setup for two people: you share your plan and your grocery list with your partner as editor, and share (or don't share) whichever recipe books make sense.

### Recipe books: reading, browsing, adopting

- **Reading one recipe:** any signed-in user with the link.
- **Browsing a book** (it appears in your library, and you can search it): members only.
- **Editing:** the book's editors and owner.
- **Adopt = copy.** Copies a recipe you can read into a book you can edit, recording `copied_from_recipe_id`. Later edits don't flow between the copies. If you want the live, shared record, join the book instead.
- **Merging books** = bulk adopt.
- **Post-MVP import wizard:** pick recipes from a shared book, choose a destination for each, and flag likely duplicates (same `external_ref`, source URL, or title). It builds on adopt, so there's no schema change.
- No safeguards against a shared book filling up. The owner manages members and cleans up.

### Meal plans

- One long-running plan holds dated entries across all weeks, like a shared calendar paged a week at a time. You share it once.
- An entry saves the recipe **title** when it's added, and `recipe_id` is optional. Everyone on the plan sees the title and day. Because of open reading by link, anyone can also open the recipe and adopt it into their own book.
- If the recipe is deleted, the entry keeps its title and loses the link.
- MVP editing: add, remove, toggle eaten. Moving an entry means removing it and adding it again.

### Grocery lists

- A plain to-do list, not linked to any plan.
- Where "add to list" goes: if you can reach exactly one grocery list, straight there; otherwise a picker that remembers your last choice (cookie).

---

## Data model

The database is empty (checked 2026-09-22), so all changes are free. Use `drizzle-kit generate` migrations from here on instead of `db:push`.

User ids are Neon Auth `neon_auth.user.id` (uuid), stored as `uuid` columns **without** foreign keys into `neon_auth`, since Neon manages that schema. Member names, emails, and avatars are read from `neon_auth.user` (`name`, `email`, `image`) for display. Fallback if that schema ever changes: a local `profiles` table synced at sign-in.

### `spaces`
- `id uuid pk`
- `type text not null`: `'recipe-book' | 'meal-plan' | 'grocery-list'`
- `name text not null`, `description text`
- `created_at`, `updated_at`
- Unique `(id, type)`, which is the target for the composite foreign keys below

### `space_members`
- `space_id` → spaces, cascade
- `user_id uuid not null`
- `role text not null`: `'owner' | 'editor' | 'viewer'`
- `added_at`
- PK `(space_id, user_id)`
- Partial unique index on `(space_id)` where `role = 'owner'`, so there's exactly one owner. (Creation always inserts the owner row, so a space never exists without one.)
- Index `(user_id)` for "my spaces"

### `space_invites`
- `id uuid pk`, `space_id` → spaces, cascade
- `token text unique not null`: random, URL-safe
- `role text not null default 'editor'`: `'editor' | 'viewer'`
- `created_by uuid not null`, `created_at`, `revoked_at`
- Reusable until revoked

### `recipes`
- `id uuid pk`
- `space_id uuid not null`, `space_type text not null default 'recipe-book'` (check: `= 'recipe-book'`)
  - FK `(space_id, space_type)` → `spaces(id, type)`, cascade. This lets the database guarantee a recipe can only live in a recipe book.
- `created_by uuid not null` (renamed from `user_id`; author only, not access)
- `title text not null`, `description text`
- `instructions text not null default ''`: markdown
- `time_minutes int` (nullable), `yield_servings int` (nullable)
- `tags text[] not null default '{}'`: lowercased, with a GIN index for tag filtering
- `source_url text`, `image_url text`
- `copied_from_recipe_id` → recipes, set null
- `external_ref text`: e.g. `obsidian:Honey Garlic Chicken.md`. Unique `(space_id, external_ref)` where not null. Makes the seed idempotent and supports import duplicate detection.
- `created_at`, `updated_at`
- **Removed:** `visibility`

### `recipe_ingredients`
- `recipe_id` → recipes, cascade
- `position int not null`
- `section text`: sub-heading such as "To Serve" or "Cream Cheese Frosting"
- `raw text not null`: the line as written, and what the recipe view shows
- `quantity numeric` (Drizzle `mode: 'number'`), `unit text`, `ingredient_id` → ingredients (set null): all nullable, best-effort parse
- PK `(recipe_id, position)`. The old `(recipe_id, ingredient_id)` key broke when a recipe used the same ingredient twice (the vault's carrot cake uses walnuts twice) and can't hold empty ingredient ids.

### `ingredients`
- Unchanged: a global catalog with a unique name. Names are normalized by the parser (trimmed, lowercased, **singular**) so "onions" and "onion" match.
- `category` is deferred until aisle grouping is wanted.

### `plan_entries`
- `id uuid pk`
- `space_id`, `space_type default 'meal-plan'`: composite FK → spaces, cascade
- `date date not null`
- `title text not null`: saved when added, or free text
- `recipe_id` → recipes, **set null**
- `eaten boolean not null default false`
- `created_by uuid not null`, `created_at`, `updated_at`
- Index `(space_id, date)`

### `grocery_items`
- `id uuid pk`
- `space_id`, `space_type default 'grocery-list'`: composite FK → spaces, cascade
- `text text not null`: displayed and editable, e.g. "2 tbsp olive oil"
- `checked boolean not null default false`
- `quantity numeric`, `unit text`, `ingredient_id` → ingredients (set null): nullable, for merging at add time
- `source_note text`: e.g. "from Honey Garlic Chicken". Plain text, no link.
- `created_by uuid not null`, `created_at`

### What deleting does

| Delete | Effect |
|---|---|
| A space | Its members, invites, and contents (recipes / entries / items) go with it |
| A recipe | Its ingredient lines go; plan entries keep their title and lose the link; copies keep existing (`copied_from_recipe_id` set null) |
| An ingredient | Parsed links on recipe lines and grocery items are cleared; raw text is untouched |
| A user account | Spaces they own are left without an owner. That's rare; handle it with a later cleanup job |

Eight tables total. The only link across space types is the optional `plan_entries.recipe_id`.

---

## Ingredient parsing (best effort)

A pure function in the domain layer, unit-tested with real vault lines as fixtures:
- Leading quantity: integers, decimals, `1/2`, `1 1/2`, unicode fractions (`½ ⅓ ¾`), ranges (`1-2` → upper value)
- Unit: normalize spellings (`tablespoon(s)`/`tbsp`/`T` → `tbsp`, `ounces` → `oz`, and so on), including clove, can, bunch, slice, pinch
- Name: the rest, minus trailing prep notes after a comma or ` - `, singularized
- "to taste" or no leading number → quantity empty
- Parse failure is never an error. The line is stored raw with empty parsed fields.

## Scaling

If the recipe has `yield_servings`, the detail and cook views show a servings stepper and multiply parsed quantities by `chosen / yield`, shown as friendly fractions (⅛ ¼ ⅓ ½ ⅔ ¾). Lines without a parsed quantity show as-is. No yield means no stepper. There's no unit conversion anywhere.

## Quick-add to a grocery list

Available from recipe detail, cook mode, and the plan ("add this week to list" covers every entry this week that isn't eaten and has a recipe).
1. Take the recipe's lines at the current servings, or the default.
2. If an **unchecked** item already has the same `ingredient_id` and `unit`, add the quantities together and rewrite its text. Otherwise insert a new item.
3. Lines with nothing parsed are inserted as-is.
4. After that the items stand alone. Recipe edits and deletes don't touch the list.

Different units for the same ingredient stay as separate lines. That's acceptable for a list you read yourself.

## Weekly plan view

- `?week=YYYY-MM-DD` (a Monday). Weeks start Monday. "This week" is computed in `America/New_York` for v1 (a constant).
- Mon–Sun stacked on mobile. Each entry shows its title (a link if the recipe still exists), an eaten toggle, a cook link, and remove.
- Add from a sheet: search the books you're a member of, or type a free-text title.
- A plan switcher appears only if you belong to more than one plan.

## Cook mode

- Large text, scaled ingredients, and instructions rendered from markdown with larger type and headings kept as dividers.
- Screen Wake Lock: request on mount and re-request on `visibilitychange`. If unsupported, show a one-line notice. **Verify on both phones.**
- "Add to grocery list" button.

## Screens (mobile-first)

Designed at 375px first, with a bottom tab bar: **Recipes · Plan · Groceries**.

| Route | Purpose |
|---|---|
| `/` | Library: book switcher, search, tag chips |
| `/spaces/[id]/settings` | Name, members and roles, invite link with view-only toggle (the same screen for all three types) |
| `/join/[token]` | Accept an invite |
| `/recipes/new`, `/recipes/[id]/edit` | Form: book, title, description, tags, servings, time, source URL, image URL, ingredient lines (raw text, optional section, preview of what was parsed), instructions (markdown) |
| `/recipes/[id]` | Detail: stepper, ingredients, instructions, add to plan, add to list, cook, adopt |
| `/recipes/[id]/cook` | Cook mode |
| `/plan?week=` | Weekly plan |
| `/groceries` | Grocery list |

---

## Seeding from Obsidian

Source: the vault's recipes folder. The script only reads the vault.

What's there:
- **Frontmatter:** `created` (75), `meal` (74), `recipe_tags` (65), `source` (55), `cover` (42), `time` as text like "20 min" (12), `servings` (2)
- **Body:** 59 notes use `## Ingredients` with `- [ ]` lines and `## Instructions` with a numbered list. Some NYT clippings use `## **INGREDIENTS**` / `## **PREPARATION**`. Some have sub-headings inside ingredients or state servings inline ("Makes 4 serving/s").
- **Stubs that won't import as-is:** a PDF-only note, one-line notes, and a photo-plus-pasted-text note

| Vault | App |
|---|---|
| H1 title (fallback: filename) | `title` |
| `meal` + `recipe_tags` | `tags`, lowercased |
| `source` | `source_url` |
| `cover` (http URLs only; `![[...]]` embeds are skipped) | `image_url` |
| `time` / `servings` / inline "Makes N serving" | `time_minutes` / `yield_servings`, best effort |
| Ingredient lines (strip `- [ ]`); a plain line ending in `:` | `recipe_ingredients.raw` + parse; `section` |
| Everything under the instructions heading | `instructions` as markdown, unchanged |
| Relative file path | `external_ref` = `obsidian:<path>` |

Process: a `bun` script with the vault path from an env var. **Dry run first**: it prints what parsed, what was skipped and why, and lines with no parsed quantity. After your review it inserts into your "My Recipes" book. Re-runs skip anything whose `external_ref` already exists.

Images: local vault attachments aren't uploaded in v1. Hosting them (Vercel Blob or similar) is post-MVP; `image_url` works either way.

---

## Architecture

Unchanged pattern: `page/action → controller → use case → repository`, wired in `di/`. Domain errors are thrown and caught in server actions, as in `docs/clean-architecture.md` and `stash`.

**Access check:** one helper, `requireSpaceRole(spaceId, userId, minRole, expectedType)`, throwing `UnauthorizedError` / `NotFoundError`. It's used by every write, and by reads that list a space's contents. Reading a single recipe only requires being signed in. This replaces the `existing.userId !== userId` check in `update-recipe.use-case.ts`.

### Changes to existing code

| File | Change |
|---|---|
| `db/schema.ts` | All tables above |
| `src/entities/models/recipe.model.ts` | Drop `visibility`; add `spaceId`, `tags`, `copiedFromRecipeId`, `externalRef`; `instructions` is markdown; nullable `timeMinutes` / `yieldServings`; ingredient input is `{ raw, section? }` |
| `src/entities/models/recipe-ingredient.model.ts` | `raw`, `section`, nullable parsed fields |
| `src/application/repositories/recipes.repository.interface.ts` | `getForUser` → `getBySpace(spaceId, { search, tag })`; add `delete`, `copyToSpace` |
| `src/application/use-cases/recipes/*` | Use `requireSpaceRole` |
| `app/actions/recipes.ts` | Structured ingredient rows instead of the pipe-delimited textarea |
| `app/_components/*` | Replaced by the routes above |

### New pieces

- **Entities:** `space.model.ts` (the space type union, role union and rank), `plan-entry.model.ts`, `grocery-item.model.ts`, `ingredient-line.ts` (parser), `scaling.ts`
- **Repositories:** `spaces` (spaces, members, invites), `plan-entries`, `grocery-items`, `ingredients`
- **Use cases:**
  - Spaces: `ensure-personal-space` (by type), `create-space`, `rename-space`, `delete-space`, `create-invite`, `revoke-invite`, `accept-invite`, `update-member-role`, `remove-member`, `list-my-spaces`
  - Recipes: `get-recipe`, `delete-recipe`, `adopt-recipes` (single and bulk)
  - Plan: `get-week-plan`, `add-plan-entry`, `toggle-eaten`, `remove-plan-entry`
  - Grocery: `get-grocery-list`, `add-recipe-to-list`, `add-grocery-item`, `toggle-grocery-item`, `remove-grocery-item`, `clear-checked`
- **DI modules:** `spaces.module.ts`, `plan.module.ts`, `grocery.module.ts`
- **Tests:** parser (vault fixtures), scaling, merge at add time, and the role matrix plus type checks against mock repositories
- **Script:** `scripts/seed-from-obsidian.ts`

Refresh model: plain request/response with `revalidatePath`. The other person sees changes on their next navigation or refresh. No realtime.

---

## Build order

0. **Schema + spaces.** Migrations, `requireSpaceRole`, personal book on sign-in, existing recipe use cases moved onto spaces.
1. **Recipe library + seed.** Parser with tests, the new form, detail with scaling, search/tags, delete, markdown instructions, then the Obsidian seed (dry run → review → insert).
2. **Sharing.** Space settings screen, invite links, roles, view-only, adopt and bulk adopt.
3. **Weekly plan.** Entries (recipe or free text), eaten toggle, lazily created personal plan.
4. **Grocery list.** To-do list, quick-add with merge, "add this week", clear checked, lazily created personal list.
5. **Cook mode.** Large text, wake lock, add to list, device check on both phones.
6. **Manifest.** Home-screen install.

## Definition of done (v1)

Two people with their own accounts share a meal plan and a grocery list, and one or more recipe books seeded from the Obsidian vault. Either of them can plan a week, quick-add the week's ingredients to the shared list, check items off at the store, open any planned recipe in cook mode with the screen staying on, and mark meals eaten. A third person given a view-only book link can browse the book and adopt recipes into their own book, but can't change it. A connection is required.

## Non-goals (v1)

- Import wizard (post-MVP; builds on adopt)
- Plan start/end dates and repeating meals
- Structured instructions (step order, timers)
- Per-book "members only" reading
- Offline support / service worker (possible later via Serwist)
- Recipe import or scraping from URLs
- Realtime collaboration
- Unit conversion, nutrition, cost, pantry inventory
- Aisle grouping (needs ingredient categories)
- Image uploads
- Native app

---

## As built

Phases 9–14 changed more than this table shows: see [ux-plan.md](./ux-plan.md) Decisions D8, D19, D23–D25, D29, D34, D35, D38–D45 and D48, and `db/schema.ts` for the current schema.

Everything in the build order shipped. Where the build differs from the spec above:

| Area | Spec | Built | Why |
|---|---|---|---|
| Ingredient entry | A row per ingredient with add/remove/reorder | As specced since [ux-plan.md](./ux-plan.md) P9.4: a row per line (amount, unit, name), its note and optional flag in its ⋯ sheet, and section rows; a pasted list becomes a row per line. (At first it was one text box with a "How these will be read" preview.) | Itemized lines (ux-plan D23) need fields to edit |
| Unit handling | Parser recognizes common units | Also: a bracketed alternate measure after a measuring unit scales ("110 g (⅓ cup)" → "220 g (⅔ cup)"); package sizes don't ("1 can (14 oz)"); spelled-out unit words follow the amount ("2 cups", "½ cup") | Found scaling real vault recipes |
| Grocery merging | Merge same ingredient + same unit | Also skips an amount-less line already on the list ("Salt, to taste" once), and merges within one batch (garlic from three recipes becomes one line) | Found testing the plan's grocery button (then "add this week") |
| Grocery list freshness | Request/response only | Live: a change reaches everyone with the list open (Ably, [ux-plan.md](./ux-plan.md) D21), with a refresh every 60 s as a safety net | Two people shopping see each other's check-offs as they happen |
| Grocery lists | A third kind of space, loosely tied to plans | Since 2026-09-25, a plan's grocery list is part of the plan: its items carry the plan's id and it shares the plan's members. There are no list spaces (migration 0003 moved the old lists' items onto their owners' plans) | One set of members, nothing to keep in sync; joining a plan brings its list ([ux-plan.md](./ux-plan.md) D13) |
| Default plan | Personal plan created on first visit | Created only if you're in none; a plan someone shared with you is the default over your own | A partner who joins your plan shouldn't land on an empty one of theirs |
| Whose list "add to list" uses | A picker that remembers your last choice (cookie) | The default plan you can edit (a shared one beats your own), with a picker when you're in several; nothing stored in a cookie. The plan's grocery button adds onto its own plan's list | The common case is one shared plan |
| "Add this week" | Entries that aren't eaten and have a recipe | Since Phase 13–14 ([ux-plan.md](./ux-plan.md) D38–D45): a meal has a cook day and eat days, and is checked off once, as cooked. One grocery button adds the meals cooking in a range picked from today (the next 3, 7 or 14 days, or all upcoming) that aren't cooked or on the list yet, each once. A second cooking of a recipe is bought again; a recipe already on the list from its own Add to list covers one meal of it. Typed entries are gone: everything planned comes from a recipe | Shopping happens mid-week or for more than a week; a meal is eaten over several days but cooked once |
| Sign-in | — | Sign-in returns you to where you were going (e.g. an invite link), same-app paths only | Invite links have to survive signing up |
| Install | Manifest + icons | Also an iPhone-only "Add to Home Screen" hint (dismissible); manifest and icons load signed out | Safari never offers install; browsers fetch the manifest without cookies |

**Obsidian seed:** ran once into "My Recipes": 62 of 75 notes imported (708 ingredient lines, 88% with a parsed amount). The 13 skipped notes have no ingredients section (PDF-only, links, photos) and need entering by hand; the dry-run report lists them.

**Still to verify on real phones:** that cook mode keeps the screen on (the Claude browser pane refuses the Wake Lock permission, so it couldn't be confirmed there), in the browser and installed to the home screen, on both phones.

**Worth knowing:**
- Joining is always an explicit "Join" tap, never on opening the link (link previews fetch URLs).
- Deleting a book or a plan (with its grocery list) deletes its contents for everyone in it.
- The app icon is the design system's leaf on a herb-green tile; the drawing is in `app/_lib/app-icon.tsx`.

