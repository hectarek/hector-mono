---
title: "Wikidata's query service times out on a subclass walk joined to every item's details"
date: 2026-11-23
category: integration-issues
module: "apps/community-game-library/scripts/shape-catalog.ts, and any script here that reads Wikidata through its query service"
problem_type: integration_issue
component: tooling
symptoms:
  - "HTTP 504 'upstream request timeout' after about 65 s from query.wikidata.org/sparql"
  - "HTTP 500 on every attempt at the same query from a script"
  - "Answer 500 with 'Headless value factory should not be asked for its namespace' when grouping by a language-tagged literal"
root_cause: wrong_api
resolution_type: code_fix
severity: medium
retire_when: "The Wikidata Query Service changes its engine or its time limit (queries cut off at about 60 s on 2026-11-23); check by sending the combined query described here to query.wikidata.org/sparql and seeing it answer"
tags: [wikidata, sparql, wikidata-query-service, blazegraph, timeout, retry, user-agent]
---

# Wikidata's query service times out on a subclass walk joined to every item's details

## Problem

`apps/community-game-library/scripts/shape-catalog.ts` makes the game library's catalog from Wikidata. Its first version asked the Wikidata Query Service a single SPARQL query for everything: the candidates (board games through their subclasses, a few other classes directly, each with a publisher, a designer or a release date) and every candidate's details. The service never answered it, and the script spent 4 min 40 s asking again before it failed.

## Symptoms

- From a browser, the combined query answered HTTP 504, `upstream request timeout`, after about 65 s.
- From the script, POSTed, the same query answered HTTP 500 on each of four attempts.
- Flags per item written as `BIND(IF(EXISTS { ?item wdt:P123 [] }, 1, 0) AS ?pu)`, one per property, over about 7,500 candidates, timed out too.

## What Didn't Work

- **Asking again.** The script's first retry policy took every 5xx as a busy server and asked four times, waiting longer each time. A query the service can't finish fails the same way on every attempt. The service also answers 500 for a query it can't run at all: a grouping error came back as a 500 whose body held a `QueryEvaluationException`.
- **`EXISTS` inside `BIND`** for the yes-or-no flags. It was slower than the joins it replaced, and it timed out as well.

## Solution

Ask the service small questions and join the answers in code (`shape-catalog.ts`: `BOARD_GAMES_QUERY`, `OTHER_GAMES_QUERY`, `itemsQuery`, `request`):

1. List the candidates on their own. `SELECT DISTINCT ?item WHERE { ?item wdt:P31/wdt:P279* wd:Q131436 }` returned 4,948 items in 271 ms. The direct classes (`VALUES ?class { … } ?item wdt:P31 ?class`) returned 2,639 in 101 ms.
2. Read the details by `VALUES` in batches of 500 ids (`ITEMS_PER_QUERY`), POSTed, since a GET address with 500 ids is long. Each batch took about 3 s: an `OPTIONAL` per property, `GROUP BY ?item`, and `GROUP_CONCAT` or `SAMPLE` for the values. A yes-or-no per item is `MAX(IF(BOUND(?x), 1, 0))` over an `OPTIONAL`, which ran in 3 s over 4,948 items where `EXISTS` timed out.
3. Filter in code: here, which items count as published.
4. Ask again only when the service is busy, and put a 500's reason in the error:

```ts
// The query service answers a query it can't run with 500, which asking again doesn't change.
const BUSY = new Set([429, 502, 503, 504]);
```

On a 500, `request` throws with the last `…Exception` line of the body, so a query that can't run fails at once and says why.

Wikimedia's [User-Agent policy](https://foundation.wikimedia.org/wiki/Policy:Wikimedia_Foundation_User-Agent_Policy) asks a script to name itself and give contact information (an email, a website or a wiki user), as `<client name>/<version> (<contact>) <library>/<version>`, ideally with "bot" in it, or risk being blocked without notice. The script sends `CommunityGameLibraryCatalogBot/1.0 (https://github.com/hectarek/hector-mono) bun/<version>`, one request at a time with a second between them. A whole run is about 45 requests and takes about a minute and a half.

## Why This Works

Each part alone finishes well inside the service's time limit: the subclass walk in under a second, and the details for a known list of 500 ids in about 3 s. Joined in one query, the engine's plan for the details ran against the whole walk and past the limit. That part is observed, not traced through the engine's plan.

## Prevention

- In a script that reads Wikidata, list the ids first, then read the details in `VALUES` batches. Don't join a `wdt:P279*` walk to per-item `OPTIONAL`s in one query.
- Don't ask the query service again after a 500; ask again only on 429, 502, 503 or 504.
- Group by the item, not by a literal (below).

## Related symptom

Grouping by a language-tagged literal that came from `VALUES` (`VALUES ?t { "Catan"@en … }`, then `GROUP BY ?t` with `MAX` and `SAMPLE`) answered 500 with `Headless value factory should not be asked for its namespace`. Grouping by `?item` and returning `SAMPLE(STR(?t))` worked.

## Related

- `apps/community-game-library/docs/catalog-data.md`, The plan: what the script makes, from which sources, and why.
- `apps/community-game-library/AGENTS.md`, The catalog's dataset.
