# evals

Experiments that compare models and prompts with [promptfoo](https://www.promptfoo.dev/docs/intro/), one folder per question under `experiments/<app>/`. Each experiment's README says what it asks, how to run it and what it found.

## Set up

1. Copy `.env.example` to `.env` in this folder, and add your OpenCode Zen key as `OPENCODE_API_KEY` ([where to get it](https://opencode.ai/docs/zen/)).
2. Run everything from this folder through the package scripts, `bun run eval` and `bun run view`. They turn off promptfoo's telemetry, update checks and sharing. promptfoo still sends one small "telemetry disabled" event per run, with its install id, version and platform, and the email in promptfoo's own settings if one is saved there. Blocking `r.promptfoo.app` on your Mac stops that too.

## Run an experiment

```bash
bun run eval -c experiments/<app>/<question>/promptfooconfig.yaml
```

```bash
bun run view
```

promptfoo keeps each run's history in `~/.promptfoo`, so the viewer shows past runs from any checkout. It caches model answers for 14 days, so a rerun pays only for what changed.

## Add an experiment

Start a folder under `experiments/<app>/`, and write its README's question and what counts as good before the first run. `AGENTS.md` has the rules.
