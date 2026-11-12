# Community Game Library: where the game data comes from

Updated 2026-11-12

What was found when the catalog's source was checked before the data model was written. These are findings only: how the catalog gets filled is not decided. Hector's direction on 2026-11-12 is a simple data model first, holding only the values the spec and the drawn screens use. The proposed model is in [data-model.md](data-model.md). Every page named here was read on 2026-11-12, by one of two sessions. A line marked "our reading" is a judgment, not something the source states. The requirement and decision numbers (R, D) are [build-plan.md](build-plan.md)'s.

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

**The CSV.** Hector's copy, `boardgames_ranks.csv`, 11.4 MB, as the data session measured it:

- 182,874 rows, board games only: 142,581 games and 40,293 expansions, marked in `is_expansion`.
- Columns: `id, name, yearpublished, rank, bayesaverage, average, usersrated, is_expansion`, and eight sub-rankings that work as broad categories (abstract, customizable, children's, family, party, strategy, thematic, war).
- A year on 93% of rows. A category from the sub-rankings for 993 of the 1,000 most-rated games.
- `usersrated` orders games by popularity. "catan" matches 234 names, and sorted this way Catan comes first.
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

| Source | Alive | Storing allowed, by its own page | Fields | Test list |
|---|---|---|---|---|
| [Wikidata](https://www.wikidata.org/wiki/Wikidata:Copyright) | Yes | Yes: "available under the Creative Commons CC0 License" | Title, year, players; play time, age and publisher for some; no complexity, no best counts, no description | 30 of 32 found |
| Board Game Atlas | No: closed 2023-08-23 | | | |
| Datasets on Kaggle, GitHub, Hugging Face | Mixed | Labels vary from CC0 to non-commercial; several pages say the data stays BGG's | The full list, as copies of BGG | |
| recommend.games API | Yes | No terms found; BGG ids and BGG image addresses | The full list | |
| BoardGamePrices.co.uk API | Yes | "as long as you link back to this site … and be sure to cache obtained information for at least one hour" | Name, image, thumbnail, by BGG id only | 32 of 32 |
| UPCitemdb (barcodes) | Yes | A license "solely for Customer's operations"; 100 requests a day free | Title, brand, retailer images | 2 of 2 barcodes |
| Ludopedia API (Brazil) | Yes, in alpha | Terms not read (its pages refused the reader) | Most of the list, with complexity and best counts | |
| Luding (Germany) | Yes | No license, no API | Designer, publisher, year, players, length | |

Wikidata in numbers, from queries run that day: about 5,100 games carry a BGG id. Of those, 44% have a player range, 35% a year, 16% a play time and 13% an image. On the test list of well-known games the player range was there for all 30.

**Measured against the CSV.** The data session looked up the most-rated base games in Wikidata and then in each game's English Wikipedia infobox. Share with the field filled:

| Field | Top 100 | Top 500 | Top 1,000 | Top 2,000 |
|---|---|---|---|---|
| Players | 99% | 77% | 63% | 47% |
| Play time | 88% | 56% | 45% | 32% |
| Minimum age | 75% | 52% | 42% | 31% |
| A freely licensed image | 75% | 40% | 29% | 18% |

Neither has complexity or "best at" counts, and the images are mostly photos of play.

**Other game sites.** Tric Trac, MyLudo, spielen.de, Bodogema and Board Game Arena each forbid scraping or reusing their database. Kallax and Recommend.Games serve BGG's data through their own APIs, which BGG's terms prohibit. Retail listings carry players, time and age, and their terms exclude automated gathering.

**Facts and listings** (our reading, not legal advice). A fact such as "2 to 4 players" isn't copyrightable in the US ([Feist v. Rural](https://fairuse.stanford.edu/case/feist-publications-inc-v-rural-telephone-service-co)), so a person can read it off a box or a page and type it in. What sites restrict, by their terms, is automated collection. Descriptions and box photos are someone's copyrighted work.

**What comparable apps do.** Of 18 apps and tools the data session checked, every one with a full catalog uses BGG's API. The larger ones (Kallax, Board Game Discovery, Dized, BoardGameOracle) store covers on their own domain; small open-source projects link BGG's image host. One project reports that BGG approved its access in 1 to 2 business days (secondhand). Storing covers is small: about 80 MB for 2,000 of them (an estimate).

**Covers elsewhere.** Wikimedia Commons doesn't host them: "photographs that are intended to illustrate the game board and/or the box are not normally acceptable". The images Wikidata links are photos of games being played. Publishers' press kits are all rights reserved. That leaves BGG's covers under its license, or a member's own photo of their box.

## One possible direction, not decided

Written before Hector's direction above, and kept as an option only. No sourcing plan is set. The catalog can't be designed as "BGG's fields, copied". One way it could work from day one on what is allowed today and get richer if BGG approves:

1. **A game needs little.** A title and a player range are enough to list, search, lend and filter by players. Year, play time, age, complexity, best counts, categories, mechanics, designers, publishers, description, cover and expansions are all optional.
2. **Each game records its source**: entered by hand, Wikidata, or BGG, with the outside id where there is one. That is what lets a hand-entered game be matched to its BGG record later (the merge in D11) and tells the app which fields it may edit.
3. **Before BGG approves:** a member types a title, and the app offers matches from Wikidata to fill the year and player range. The cover is the drawn token, or the member's own photo.
4. **Once BGG approves:** search runs on the names from BGG's CSV, kept on our side and refreshed weekly. A game's details are fetched the first time someone needs them and kept. BGG's fields are shown as they came, with the credit.

## What it would change in the spec

Proposed on the assumption of that direction, so still undecided. Nothing in build-plan.md has been changed for these.

- **D7** (the catalog is our own copy of BGG's): names from the CSV plus details on demand, not a full copy filled before launch. The first release must work with no BGG access at all.
- **R1** (what a game holds): only the title and the player range are required.
- **R5 and the catalog-record screen (G4)**: the admin can't correct a BGG game's details, since the terms forbid modifying the data. Corrections stay for games entered by hand. On a BGG game the admin can still set the how-to-play video, which is ours.
- **R11** (filters): complexity, category, mechanic and age only have data for games that came from BGG. Players, play time, owner and availability work for every game.
- **A credit**: BGG's name and "Powered by BGG" logo wherever its data shows. The placement is drawn on the canvas (Y1).
- **No AI on BGG's data**: the admin's AI helper stays dropped, test fixtures stay fictional, and an agent building the app doesn't read BGG's records.
- **H1** (register with BGG) decides how rich the catalog is at launch, so it should go in now.

## Not checked

- BGG's answer. Only an application settles whether a friends' lending library is approved, and how BGG wants covers handled.
- The fields in a details response, until a token exists.
- Ludopedia's terms.
- The columns of a member's own collection export from BGG, which needs no registration.
- BGG's guidance on linking its images or serving copies. A BGG developer is reported to have asked apps not to hotlink (secondhand).
- Whether a member's own photo of a box raises any issue. No source read here addresses it.
