# Game descriptions: which model writes them best

**Question.** Which model writes the best "About" paragraph for a board game, working only from its English Wikipedia text? The winner writes the paragraphs for the Community Game Library's 500 best-known games, 463 of which have an English article (`apps/community-game-library/docs/catalog-data.md` has the catalog).

**What counts as good**, from the rules in `prompts/v1.json`:

- It says what kind of game it is, what players do on a turn, and how someone wins, in two or three plain sentences of 30 to 60 words.
- Every fact comes from the article, none from the model's own knowledge.
- It's in its own words, and leaves out what the game's page already shows: players, time, age, designers, publishers and year.
- No hype, no "you", no em dashes, and it doesn't open with the title.
- When the article says too little, the answer is NONE.

`checks.mjs` fails what a script can see: six or more words copied in a row (the prompt asks for fewer than five), the length, the banned words, an em dash, and opening with the title. A person judges the rest: is every fact in the article, does it say how the game plays, and does it read well?

**Games.** 24, in `tests/games.json` with why each is in: the 10 best known, one every 50 places down to number 500, where articles get shorter, and four whose articles make it hard: two mostly about awards and sales, two that give little more than the theme. A la carte's article is 33 words, so its right answer is NONE.

**Models.** Seven, through OpenCode Zen. They're labeled A to G, and the viewer heads each column with its letter ("[A] v1"), so the answers can be rated without knowing which model wrote them. All seven are on Vercel AI Gateway too, for when the experiment moves there.

<details>
<summary>Which letter is which model (open after rating)</summary>

| Label | Model             | Zen's price per million tokens, in / out |
| ----- | ----------------- | ---------------------------------------- |
| A     | GPT-6.1 Sol       | $2 / $10                                 |
| B     | Claude Haiku 5.5  | $0.10 / $0.50                            |
| C     | Gemini 3.7 Flash  | $0.75 / $3.75                            |
| D     | Claude Opus 5.5   | $4 / $20                                 |
| E     | GPT-6 Luna        | $0.10 / $0.50                            |
| F     | Claude Sonnet 5.5 | $2 / $10                                 |
| G     | Gemini 4 Argon    | $2 / $10                                 |

</details>

**Prompt v1** is the prompt of the 20-game trial on 2026-11-24, in which a Haiku agent wrote 19 descriptions and left A la carte's empty. It changes only where the trial's agent read and wrote files: it now gets one game's text and replies with the paragraph or NONE.

## Run it

From `evals/`, with `OPENCODE_API_KEY` in `evals/.env`. First, one game on all seven models, for about 4 cents, to see every model answer:

```bash
bun run eval -c experiments/community-game-library/game-descriptions/promptfooconfig.yaml -n 1
```

To run only some of the models, add `--filter-providers` with a pattern matched against their ids. This runs Claude Haiku 5.5, GPT-6 Luna and Gemini 4 Argon:

```bash
bun run eval -c experiments/community-game-library/game-descriptions/promptfooconfig.yaml -n 1 --filter-providers "haiku|luna|argon"
```

Then all 24 games, saved for the record. At Zen's prices that's under a dollar, depending on how much each model thinks:

```bash
bun run eval -c experiments/community-game-library/game-descriptions/promptfooconfig.yaml -o experiments/community-game-library/game-descriptions/results/$(date +%F).json
```

Then rate each answer in the viewer: pass, fail, a score and a comment.

```bash
bun run view
```

The first run fetches the 24 articles into `.cache/`, one a second, and later runs read them from there.

## Runs

| Date | Commit | Prompt | Result |
| ---- | ------ | ------ | ------ |

## Verdict

None yet.
