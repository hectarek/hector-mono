# Community Game Library: where the game data comes from

Updated 2026-11-23

**The plan, decided with Hector on 2026-11-23** ([below](#the-plan)): the catalog is Wikidata's published board, card and party games, 2,141 of them that day. Where Wikidata lacks a fact, it comes from the game's English Wikipedia infobox. Nothing comes from BoardGameGeek (BGG). `scripts/shape-catalog.ts` makes the dataset, `db/catalog.jsonl`, and U24 loads it. This settles H6. It follows Hector's decision of 2026-11-20 that we source and shape the catalog ourselves ([build-plan.md](build-plan.md) D7). The survey of 2026-11-12 stays below as background. One of its findings binds the plan: BGG's terms bar using its data "as data for an AI", so agents don't read or shape BGG's data, its list of every game included.

## The plan

Hector picked each part on 2026-11-23 from options with their trade-offs. The rules under each part are Claude's, checked against that day's data. They are in `scripts/lib/catalog.ts`, tested on fictional records in `tests/scripts/lib/catalog.test.ts`.

### Which games

Wikidata's published games. An item counts as a game when it's a board game or one of its subclasses, or it's directly one of these: a card game, a dedicated deck card game, a tabletop game, a dice game, a party game, a tile-based game, a trick-taking game or a board game expansion. It counts as published when it has a publisher, a designer or a release date. That condition leaves out about 3,000 traditional games and bare names, such as chess variants. An item is also left out when it has no English name, or when it's also a video game, software, a role-playing game, a gamebook or an archaeological artefact.

On 2026-11-23, Wikidata had 2,440 published items. 2,141 made the catalog: 2,080 base games and 61 expansions. Of the rest, 259 had no English name, 35 weren't tabletop games and 5 expanded a game the catalog doesn't hold.

Hector chose Wikidata's games alone over also adding his circle's games by hand. A test list of 66 well-known games, mass-market and hobby, found 63 in the catalog. Telestrations, Skull and Apples to Apples aren't there, since Wikidata gives them no publisher, designer or date. A game the catalog lacks comes in as a suggestion (R4).

The script never reads Wikidata's BoardGameGeek ID property (P2339), either as a value or to choose games (D7).

### Where each value comes from

Wikidata (CC0) comes first wherever it has exactly one value. Where Wikidata has no value, or gives more than one, the game's English Wikipedia infobox (`{{Infobox game}}`) fills it. Hector chose that over Wikidata alone. Publishers are the exception, since Wikidata lists every edition's publisher and marks none as the original.

| Column                                                                | From                                                            | Rule                                                                                                                                                                              | Filled, all 2,141                         | Filled, the 63 well-known |
| --------------------------------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------- |
| `type`, `base_game_id`                                                | Wikidata's "expansion of" (P8646)                               | An item that expands exactly one base game in the catalog is that game's expansion                                                                                                | 61 expansions                             |                           |
| `title`                                                               | Wikidata's English label                                        | Without one, the English article's title, less its "(board game)". A label all in lower case ("mahjong") gets a capital                                                           | All                                       | All                       |
| `year`                                                                | Wikidata's publication date (P577)                              | The earliest                                                                                                                                                                      | 1,704 (80%)                               | 57                        |
| `publishers`                                                          | The infobox, else Wikidata (P123)                               | The infobox's list in its order, which names the original first. Without one, Wikidata's: the game's own country first, then the best known. At most three, in the Latin alphabet | 1,395 (65%), 427 from Wikipedia           | 59                        |
| `designers`                                                           | Wikidata (P287, P170, P178, P50: people only), else the infobox |                                                                                                                                                                                   | 1,002 (47%), 207 from Wikipedia           | 60                        |
| `min_players`, `max_players`                                          | Wikidata (P1872, P1873), else the infobox's `players`           | The infobox's first range, which is the base game's ("1–5 (standard)")                                                                                                            | 1,596 with both (75%), 103 from Wikipedia | 63                        |
| `min_minutes`, `max_minutes`                                          | Wikidata (P2047), else the infobox's `playing_time`             | One value is both bounds, two are the range, and hours become minutes                                                                                                             | 710 (33%), 289 from Wikipedia             | 60                        |
| `min_age`                                                             | Wikidata (P2899), else the infobox's `ages`                     |                                                                                                                                                                                   | 806 (38%), 183 from Wikipedia             | 49                        |
| `categories`                                                          | Wikidata's classes (P31) and genres (P136)                      | Mapped to the catalog's own words (`CATEGORY_OF`). Wikidata's "card game" counts only as a class, since it also gives that genre to board games with cards (Catan, Wingspan)      | 965 (45%)                                 | 45                        |
| `popularity`                                                          | Wikidata                                                        | How many Wikimedia sites have a page on the game (its sitelinks)                                                                                                                  | All                                       | All                       |
| `best_players`, `complexity`, `description`, `image_url`, `video_url` | None                                                            | Empty                                                                                                                                                                             | None                                      | None                      |
| `search_title`                                                        | U24's load                                                      | `toSearchTitle(title)`, as for every title                                                                                                                                        |                                           |                           |

A value outside these bounds is taken for a mistake and left out: players from 1 to 100, play time up to a day, minimum age up to 21. Only plain facts come from the infoboxes: no Wikipedia text is kept.

### What Hector fills in by hand

Nothing before the load (Hector, 2026-11-23). Best player counts and complexity have no open source, so they stay empty:

- The library's complexity filter doesn't show, since a filter shows only when some game in view has a value (R11).
- What should we play? ranks games by "plays at" alone. If a host picks a complexity, it leaves out every game without one and says why (rule 14).

The admin can fill these, and a description, a photo or a video, on any game in its record (G4).

### Covers

Every game shows the drawn token (Y1). Wikimedia Commons doesn't host box covers. The images Wikidata links are mostly photos of play, and each needs its own credit. Publishers' box art isn't free to use. The admin can add a photo of a box in a game's record (G4), as a suggestion's photo does now.

### The dataset

`db/catalog.jsonl` sits in the public repo, one game to a line. Each line uses the games model's field names and leaves out the values the game lacks. Base games come first, then the best known. Each line also keeps two fields that aren't columns: `wikidataId`, and `wikipediaFields`, which names the values taken from the infobox. A game's `id` is a UUID v5 of its Wikidata address, so it's the same on every run. JSON Lines means a run's diff shows only the games that changed. The file was 507 KB on 2026-11-23.

To make it again:

```bash
cd apps/community-game-library && bun scripts/shape-catalog.ts
```

The run takes about a minute and a half. It sends about 45 requests, one at a time and a second apart. Each carries the User-Agent that Wikimedia's policy asks for: `CommunityGameLibraryCatalogBot/1.0 (https://github.com/hectarek/hector-mono)`. Hector chose the repo's address over an email (2026-11-23). A new run picks up new games and Wikidata's and Wikipedia's changes since.

### How it loads (U24)

`scripts/load-catalog.ts` reads `db/catalog.jsonl` and inserts each game whose `id` isn't in `games` yet:

- base games before their expansions;
- `search_title` written with `toSearchTitle`;
- every value the line lacks written as null.

It never updates a row already there, so the admin's corrections and the games added by hand stay. It runs dry by default and writes with `--commit`: on the test project first, then on production with Hector's OK at that moment. There's no migration. The file's ids make the load safe to run twice, so no column holds Wikidata's id (data-model.md rule 13).

### Credits

Wikidata's data is CC0 and the infobox values are facts, so neither source asks for credit. The app gives it once anyway, as "Game facts from Wikidata and Wikipedia": on About the catalog (Y1), which You links to, and at the foot of search results. A game's page carries none, since a game the admin added by hand looks the same there.

### What it changes in the spec

- D7 and H6 are settled as above.
- R1 and R11: complexity and best counts stay empty until the admin fills them.
- KTD10: search runs on about 2,100 games, not 100,000. U24 still times a search and checks the threshold against them.
- data-model.md: the source is chosen without a column for its id (rule 13), and credits go on About the catalog and at the foot of search results.

---

Everything below is the survey of 2026-11-12, kept as background.

What was found when the catalog's source was checked before the data model was written. These were findings only: how the catalog got filled wasn't decided until 2026-11-20. Hector's direction on 2026-11-12 is a simple data model first, holding only the values the spec and the drawn screens use. The proposed model is in [data-model.md](data-model.md). Every page named here was read on 2026-11-12, by one of two sessions. A line marked "our reading" is a judgment, not something the source states. The requirement and decision numbers (R, D) are [build-plan.md](build-plan.md)'s.

## The short answer

- BoardGameGeek (BGG) is the only source that has everything the catalog wants. Its terms allow a non-commercial app to keep and show its data, on conditions, after BGG approves the app and issues a token. Until then every API call is refused.
- BGG's list of every game is the exception: a signed-in member can download it with no application. Hector has it. It gives each game's id, name, year and popularity, which is enough to know which games to look up first.
- Every other dataset with the full field list is a copy of BGG's data and carries BGG's terms with it.
- Wikidata is the one open source that is alive. It covers the popular games with a title, a year and a player range, and little else.
- No source offers freely licensed box covers.
- So the data model should not depend on any one source.

## BoardGameGeek

**Where the data is.** The [XML API](https://boardgamegeek.com/wiki/page/BGG_XML_API2) at `https://boardgamegeek.com/xmlapi2/`:

- `search?query=…&type=boardgame` finds games by name.
- `thing?id=…&stats=1` returns a game's details, 20 ids at most per call.
- One CSV holds "the names, ids, ranks, and average rating for all of the games in the database", and "this is the preferred way to get them".
- "Currently, a 5-second wait between requests seems to suffice."

Which fields a details call returns isn't listed on that page. The list in build-plan.md's notes came from third-party clients and is confirmed by the first authorized call.

**Why nothing can be pulled today.** From [Using the XML API](https://boardgamegeek.com/using_the_xml_api) (version dated 2025-07-02):

- "Registration and authorization is required for use of the XML API." Each request carries a bearer token.
- Applications are made at `boardgamegeek.com/applications`, signed in. "It may be a week or more before we get back to you."
- "A non-commercial license is generally provided at no cost (this may change in the future)."
- "Any application which, in our judgment, competes with any part of BGG's business, or which harms us in any way, may be denied."
- On the CSV of all games the page says two things. Under the exceptions to registration: "You also do not need to register to download the CSV dump of all games while logged in." Further down: "An approved application also will be required for the CSV download of all games". In practice the first holds: Hector downloaded it on 2026-11-12, signed in, with no application.
- Tried on 2026-11-12, signed out: a details call with no token answered 401, "Unauthorized. See https://boardgamegeek.com/using_the_xml_api", and the CSV's page answered "You don't have access to this page".

**What's open without an application.** Two things, under the same license:

- The CSV of every game (below).
- A member's own collection, which they export themselves while signed in. Using the XML API exempts this from registration. The [Data Mining](https://boardgamegeek.com/wiki/page/Data_Mining) page says it downloads as a CSV, and its columns aren't documented.

Nothing else is open. The [full XML snapshot](https://boardgamegeek.com/wiki/page/BGG_XML_Snapshot) stopped in June 2008. The [Commercial Use](https://boardgamegeek.com/wiki/page/BGG_XML_API_Commercial_Use) page rules out scraping anything the API doesn't expose, and BGG grants no license to its site's own JSON endpoints.

**The application.**

- The Commercial Use page lists what BGG weighs: whether the app competes with BGG's business, who is asking (one person building an app for fun is its own example), and how much traffic to expect.
- The "Known XML API Users" section of the [old API page](https://boardgamegeek.com/wiki/page/BGG_XML_API) isn't BGG's list of approved apps. The community edits it, it lists mostly tools from the 2010s, and one entry is a games club that shows its members' collections through the API, which is close to this app.
- A small hobby app was approved as non-commercial and not public, according to a [2026 research note](https://github.com/gstephan30/reddit_kotw/blob/research/bgg-api/docs/research/0003-bgg-xml-api-token-limits-and-scope.md) (secondhand). Its form asked whether the app is public, whether it shares data, and how often it calls.
- Approval is at BGG's discretion, and nothing read shows how often hobby apps are refused.

**The CSV.** Hector's copy, `boardgames_ranks.csv`, 11.4 MB, as the data session measured it:

- 182,874 rows, board games only: 142,581 games and 40,293 expansions, marked in `is_expansion`.
- Columns: `id, name, yearpublished, rank, bayesaverage, average, usersrated, is_expansion`, and eight sub-rankings that work as broad categories (abstract, customizable, children's, family, party, strategy, thematic, war).
- A year on 93% of rows. A category from the sub-rankings for 993 of the 1,000 most-rated games.
- `usersrated` orders games by popularity. "catan" matches 234 names, and sorted this way Catan comes first.
- Board games only: the names include no role-playing books, and a video game's title appears only on board game editions of it.
- 142,655 rows have at least one rating, and 31,733 are ranked. 20 of 20 well-known games, from Catan to Jenga, were found by exact name.
- So search should match part of a name and rank by number of ratings, not match exactly: the popular SETI is "SETI: Search for Extraterrestrial Intelligence", while a game named exactly "SETI" is from 1979 and has 47 ratings.
- It is licensed as part of the XML API ("For licensing purposes, this data is considered to be part of the XML API"), so the conditions below apply to it.

**Keeping a copy.** The same page: "When possible, all requests should be made by your servers, with the results cached", and "You should keep your number of requests to a minimum." Caching is asked for. Copying the whole catalog game by game is thousands of calls, which goes against the second sentence. The CSV is the sanctioned way to hold every name.

**The conditions.** From the [XML API Terms of Use](https://boardgamegeek.com/wiki/page/XML_API_Terms_of_Use):

- The license is "to reproduce and display the data available through the BGG XML API, including User Submissions, solely for strictly non-commercial purposes", and BGG can end it "at any time and for any reason".
- "You may not modify the data, including User Submissions, retrieved through the BGG XML API in any way."
- "You shall credit BoardGameGeek by name as the source of the data", with the "Powered by BGG" logo, linked back, "in public-facing uses".
- "Use of the XML API--or any of the data on the site--to train an AI (Artificial Intelligence) or Large Language Model (LLM) system is strictly prohibited." The site's [Terms of Service](https://boardgamegeek.com/terms) go further: not "to train or otherwise use as data for an AI".
- "Third party services that allow other applications (not end users) to access our data are strictly prohibited."

**Covers.** No page speaks about images on their own. The license covers "User Submissions", and the Terms of Service count "photographs" among them, so showing the covers the API points to, non-commercially and with the credit, is within the license as written (our reading). Whether to link BGG's image addresses or keep copies isn't addressed; the application is the place to say which we'll do.

## Everything else

A survey on 2026-11-12, with a test list of 32 games from Catan to Bananagrams.

| Source                                                       | Alive                 | Storing allowed, by its own page                                                                          | Fields                                                                                                     | Test list       |
| ------------------------------------------------------------ | --------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | --------------- |
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Copyright) | Yes                   | Yes: "available under the Creative Commons CC0 License"                                                   | Title, year, players; play time, age and publisher for some; no complexity, no best counts, no description | 30 of 32 found  |
| Board Game Atlas                                             | No: closed 2023-08-23 |                                                                                                           |                                                                                                            |                 |
| Datasets on Kaggle, GitHub, Hugging Face                     | Mixed                 | Labels vary from CC0 to non-commercial; several pages say the data stays BGG's                            | The full list, as copies of BGG                                                                            |                 |
| recommend.games API                                          | Yes                   | No terms found; BGG ids and BGG image addresses                                                           | The full list                                                                                              |                 |
| BoardGamePrices.co.uk API                                    | Yes                   | "as long as you link back to this site … and be sure to cache obtained information for at least one hour" | Name, image, thumbnail, by BGG id only                                                                     | 32 of 32        |
| UPCitemdb (barcodes)                                         | Yes                   | A license "solely for Customer's operations"; 100 requests a day free                                     | Title, brand, retailer images                                                                              | 2 of 2 barcodes |
| Ludopedia API (Brazil)                                       | Yes, in alpha         | Terms not read (its pages refused the reader)                                                             | Most of the list, with complexity and best counts                                                          |                 |
| Luding (Germany)                                             | Yes                   | No license, no API                                                                                        | Designer, publisher, year, players, length                                                                 |                 |

Wikidata in numbers, from queries run that day: about 5,100 games carry a BGG id. Of those, 44% have a player range, 35% a year, 16% a play time and 13% an image. On the test list of well-known games the player range was there for all 30.

**Measured against the CSV.** The data session looked up the most-rated base games in Wikidata and then in each game's English Wikipedia infobox. Share with the field filled:

| Field                   | Top 100 | Top 500 | Top 1,000 | Top 2,000 |
| ----------------------- | ------- | ------- | --------- | --------- |
| Players                 | 99%     | 77%     | 63%       | 47%       |
| Play time               | 88%     | 56%     | 45%       | 32%       |
| Minimum age             | 75%     | 52%     | 42%       | 31%       |
| A freely licensed image | 75%     | 40%     | 29%       | 18%       |

Neither has complexity or "best at" counts, and the images are mostly photos of play.

The same lookup, for the 1,000 most-rated games: about 39% have an English Wikipedia article, and about 27% have designers or publishers in its infobox. Wikipedia's text is licensed CC BY-SA 4.0, so a description taken from it is credited and linked. Wikimedia's [API etiquette](https://www.mediawiki.org/wiki/API:Etiquette) asks a script to send a User-Agent with contact details, or risk being blocked without notice, and to make its requests one at a time.

**Other game sites.** Tric Trac ([its CGU](https://www.trictrac.net/reglementation-et-droits/cgu)), MyLudo, spielen.de ([its Impressum](https://www.spielen.de/impressum/)), Bodogema and Board Game Arena each forbid scraping or reusing their database. Kallax and Recommend.Games serve BGG's data through their own APIs, which BGG's terms prohibit. Retail listings carry players, time and age, and their terms exclude automated gathering. DBpedia holds Wikipedia's infoboxes as data, under CC BY-SA 3.0, but its values need checking: it has a negative play time and an age of 440 million.

**Facts and listings** (our reading, not legal advice). A fact such as "2 to 4 players" isn't copyrightable in the US ([Feist v. Rural](https://fairuse.stanford.edu/case/feist-publications-inc-v-rural-telephone-service-co)), so a person can read it off a box or a page and type it in. What sites restrict, by their terms, is automated collection. Descriptions and box photos are someone's copyrighted work.

**What comparable apps do.** Of 18 apps and tools the data session checked, every one with a full catalog uses BGG's API. Board Game Discovery's [about page](https://boardgamediscovery.com/about.php) credits "Data via BoardGameGeek with permission." SPielatus, BG Stats, Board Games Collection, Overboard, What Game You Bringing, Geek Group, Dized and Board Game Gaps also name BGG, and Kallax, which names no source, links each game to BGG by its id. The larger apps (Kallax, Board Game Discovery, Dized, BoardGameOracle) store covers on their own domain; small open-source projects link BGG's image host. One project reports that BGG approved its access in 1 to 2 business days (secondhand).

**Covers elsewhere.** Wikimedia Commons doesn't host them: "photographs that are intended to illustrate the game board and/or the box are not normally acceptable". The images Wikidata links are photos of games being played. Publishers' press kits are all rights reserved. That leaves BGG's covers under its license, or a member's own photo of their box.

**Covers: the options.** Hector would rather the app not store covers, for cost, and would take links to images hosted elsewhere (2026-11-12). Storing them costs little at this size: about 80 MB for 2,000 covers at 30 to 60 KB each (an estimate), and Neon's free plan includes 5 GB of object storage per project ([Neon's docs](https://neon.com/docs/storage/overview)). The harder questions are the right to show a cover and whether a link keeps working.

| Option                                                                                  | Coverage                            | Stored by the app     | The catch                                                                                                                                                              |
| --------------------------------------------------------------------------------------- | ----------------------------------- | --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The drawn token (Y1)                                                                    | Every game                          | No                    | Not a picture of the box                                                                                                                                               |
| [BoardGamePrices' API](https://boardgameprices.co.uk/api/plugin) image links, by BGG id | 32 of 32, and 9 of 10, in two tests | No                    | A link back wherever it's shown, and caching (above). One small site, and the box art is the publisher's                                                               |
| BGG's image links, from the API                                                         | Every BGG game                      | A link, or a copy     | Needs an approved application. A BGG developer reportedly asked apps in 2018 to serve copies rather than link BGG's host (secondhand), and the larger apps keep copies |
| Wikimedia Commons, through Wikidata                                                     | 29% of the 1,000 most-rated games   | No                    | Free licenses with credit, but mostly photos of play. Wikipedia's own covers are non-free (8 of 10 checked)                                                            |
| A member's photo of their box                                                           | What members add                    | Yes, about 50 KB each | Depends on members taking one                                                                                                                                          |

## Not checked

- BGG's answer. Only an application settles whether a friends' lending library is approved, and how BGG wants covers handled.
- The fields in a details response, until a token exists.
- Ludopedia's terms.
- The columns of a member's own collection export from BGG, which needs no registration.
- BGG's forum threads, which sit behind a human check: [image links from the XML API](https://boardgamegeek.com/thread/1948876/image-links-from-xml-api-no-longer-support-size-su) (2018, where a BGG developer is reported to have asked apps not to hotlink), [the collection export](https://boardgamegeek.com/thread/1188687/export-collections-has-been-updated-xmlapi-develop), [the 20-id limit](https://boardgamegeek.com/thread/3336313/max-20-items-from-xml-api-and-xml-api-2), and the [Geek Tools guild](https://boardgamegeek.com/guild/1229), where API changes are announced.
- Whether a member's own photo of a box raises any issue. No source read here addresses it.
