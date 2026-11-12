# U24. The catalog's data

| | |
|---|---|
| Batch | 7, Launch (`feat/community-game-library-b7-launch`) |
| Model | Strong: an outside source's terms, an import and a schema change |
| After | Batch 6 merged. Needs H6, and H1 if the source is BoardGameGeek |
| Serves | R1, R2, D7, D11, Y1; KTD10, KTD21 |

The real catalog in production, from the source Hector chose, with its credits shown where Y1 puts them and search checked at full size.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- [catalog-data.md](../catalog-data.md), all of it, and Hector's decision on the source (H6), in his task.
- Board: `Y1-Covers`, for the covers and where the credit goes.
- [data-model.md](../data-model.md): games, and rule 13 (a source's own id comes with the source).
- [build-plan.md](../build-plan.md): the Goal Capsule's stop conditions; D7, D11, R1, R2; KTD10, KTD21.
- [screens.md](../screens.md), Limits to build for: complexity as a word from BoardGameGeek's scale.

## Build

1. **First, the plan for the chosen source**, written into catalog-data.md and checked against the source's own terms: which fields come from it, how they're fetched and how often, what's kept, how it's credited, and what its terms forbid. If the terms don't allow what the app needs, stop and take it to Hector (the Goal Capsule's stop condition).
2. **The schema's one change in this batch** (KTD5): the source's id on `games` (for example `bgg_id`, unique), in a migration of its own, applied to the test project and then to production before the merge, each with Hector's OK at that moment.
3. **The import script** (`scripts/import-catalog.ts`): a dry run by default and `--commit` to write, refusing production unless Hector runs it or says yes at that moment. Calls are spaced as generously as the source asks (D7). It's safe to run twice, updating by the source's id, and it writes `search_title`. Complexity becomes a word: light under 2, medium from 2 to under 3, heavy from 3 on BoardGameGeek's scale (screens.md). Games the admin added by hand are left alone.
4. **Credits (Y1):** once per source, at the foot of a game's page and of search results, and on About the catalog at `/you/catalog`, which E5 now links to.
5. **Search at full size:** time a typical query on the test project with the whole catalog, check that the trigram index is used, and write the numbers in the task.
6. **No AI on the source's data**, if its terms say so (BoardGameGeek's do): the import never sends records to a model, and tests keep using the cast.

## Not decided

The source itself (H6). This brief is revised once Hector decides, before any code.

## Tests

- The import's mapping, on a few fixture records in the source's format (fictional, R45).
- Running the import twice changes nothing.
- The complexity word at each boundary.
- Credits show only for games from that source.

## Done when

- [ ] The source's plan is in catalog-data.md, and Hector has read it
- [ ] The checks, dead code and tests pass
- [ ] The import has run on the test project, then on production with Hector's OK at that moment
- [ ] Y1's credits and About the catalog match their boards
- [ ] Search's timing at full size is in the task
- [ ] Committed as `feat(community-game-library): U24 the catalog's data`
