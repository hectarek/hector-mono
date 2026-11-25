# AGENTS.md: evals

Experiments that compare models and prompts, run with [promptfoo](https://www.promptfoo.dev/docs/intro/). Read the root `AGENTS.md` first.

## Layout

- `experiments/<app>/<question>/` is one experiment:
  - `README.md`: the question and what counts as good, written before the first run; the models and their labels; how to run it; each run's date, commit and result; the verdict.
  - `promptfooconfig.yaml`, `prompts/` (one file per version), `tests/`, and the experiment's checks (`.mjs`) with their tests (`.test.ts`).
- A provider list or a check moves up to `evals/` when a second experiment needs it, not before.

## Rules

- A prompt that a recorded run used never changes: the next version is a new file.
- Source text a test fetches goes in the experiment's `.cache/`, and exported runs in its `results/`. Both are gitignored: Wikipedia's text is CC BY-SA, which doesn't belong in this MIT repo, and an export carries it too.
- Keys live only in `evals/.env`, listed in `.env.example`. Paid runs happen from Hector's terminal: agents can't read `.env` files, and the sandbox blocks the providers.
- Models go by a neutral label (A, B, C) so the viewer's columns ("[A] v1") don't name them while Hector rates. The experiment's README keeps the key, folded away.
- Run promptfoo through the package scripts (`bun run eval`, `bun run view`). They set `PROMPTFOO_DISABLE_TELEMETRY`, `PROMPTFOO_DISABLE_UPDATE` and `PROMPTFOO_DISABLE_SHARING`, and every config sets `sharing: false`. `eval` also sets `PROMPTFOO_PASS_RATE_THRESHOLD=0`: a failed check is a result, so the run ends normally, and only a provider error ends it with an error code. Even so, promptfoo sends one event per run ([lesson](../docs/solutions/developer-experience/promptfoo-telemetry-switch-still-sends-an-event.md)). Never run `promptfoo share`.
- Checks and test generators are `.mjs`: promptfoo loads them by path (`file://checks.mjs:copiedWords`) and can't load TypeScript. Their tests run with `bun test`. The root `.fallowrc.json` lists `evals/experiments/**/*.mjs` as entries, since nothing imports them.
- CI lints and tests this package. It never runs a paid eval.

## Checking a config without keys (agents)

The harness refuses a Bash command with the word `eval` in it, so put the promptfoo call in a script in the scratchpad and run the script. In it, from `evals/`:

- `PROMPTFOO_CONFIG_DIR=$TMPDIR/promptfoo`, since the sandbox can't write `~/.promptfoo`, where promptfoo keeps its history and cache, and the three switches above.
- `OPENCODE_API_KEY=placeholder`: promptfoo won't start without a key, and the sandbox stops every request, so nothing is sent or charged.
- `-r echo` swaps in promptfoo's echo provider, which returns the prompt: it shows the prompts render, the tests load and the checks run. Without it, each model's call fails offline, and an HTML export (`-o out.html`) still shows the column labels.
- Node in the sandbox can't read the system's certificates, so a test generator's fetch fails there. Fill `.cache/` first with Bun, whose fetch works with `allowed_domains`: `bun -e 'import { loadArticles } from "./experiments/<app>/<question>/tests/load-articles.mjs"; await loadArticles();'`.

## Providers

- **OpenCode Zen** (`OPENCODE_API_KEY`), for now. Every model goes through its OpenAI-compatible endpoint: `openai:chat:<model id>` with `apiBaseUrl: https://opencode.ai/inference/openai/v1` and `apiKeyEnvar: OPENCODE_API_KEY`. Zen translates the request for Claude and Gemini ([docs](https://opencode.ai/docs/zen/)). Model ids and prices: `curl https://opencode.ai/inference/v1/models`. Its free models work only from OpenCode itself, so experiments use paid ones.
- **Vercel AI Gateway**, later: promptfoo's `vercel:<provider>/<model>` provider with `VERCEL_AI_GATEWAY_API_KEY` ([docs](https://www.promptfoo.dev/docs/providers/vercel/)).
