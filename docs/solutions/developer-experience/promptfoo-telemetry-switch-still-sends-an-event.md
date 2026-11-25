---
title: promptfoo's telemetry switch still sends one event per run
date: 2026-11-25
category: developer-experience
module: "evals/, and any script here that runs promptfoo"
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - "Running promptfoo with PROMPTFOO_DISABLE_TELEMETRY=1 and expecting it to send nothing"
  - "A sandbox or firewall reports promptfoo connecting to r.promptfoo.app or api.promptfoo.dev"
  - "Upgrading the promptfoo version evals/package.json pins"
root_cause: wrong_api
resolution_type: config_change
retire_when: "A promptfoo release stops sending its 'telemetry disabled' event; check recordTelemetryDisabled in src/telemetry.ts of promptfoo/promptfoo on GitHub, or in the installed package's dist/src/telemetry-*.js after an upgrade"
tags: [promptfoo, telemetry, privacy, evals, sandbox, network]
---

# promptfoo's telemetry switch still sends one event per run

## Context

`evals/` runs promptfoo through its package scripts, which set `PROMPTFOO_DISABLE_TELEMETRY=1`, `PROMPTFOO_DISABLE_UPDATE=1` and `PROMPTFOO_DISABLE_SHARING=1`. promptfoo's [telemetry docs](https://www.promptfoo.dev/docs/configuration/telemetry/) give the first as the way to turn telemetry off. In the Claude Code sandbox, which denies and logs every outbound connection a command isn't allowed, each `promptfoo eval` with all three switches still logged one denied connection to `r.promptfoo.app:443` (2026-11-25, promptfoo 0.126.0).

The bundled source says why (`node_modules/promptfoo/dist/src/telemetry-*.js`, class `Telemetry`):

```js
record(eventName, properties) {
  this.initialize();
  if (this.disabled) this.recordTelemetryDisabled();
  else this.sendEvent(eventName, properties);
}
```

`recordTelemetryDisabled()` calls `sendEvent("feature_used", { feature: "telemetry disabled" })` once per process. With the switch on, `getPostHogClient()` returns null, so nothing goes to PostHog (`a.promptfoo.app`). But `sendEvent` then POSTs to `https://r.promptfoo.app/` with no check of any environment variable, sending:

- `event`, and `environment` (`NODE_ENV`);
- `email`: the account email saved in `~/.promptfoo/promptfoo.yaml`, or null when there is none;
- `meta`: `user_id` (a random UUID promptfoo writes to that file on its first run), `packageVersion`, `isRunningInCi`, `nodeVersion`, `nodeMajor`, `platform` and `arch`.

A second call came from the update check: even `promptfoo --version` reached `api.promptfoo.dev` until `PROMPTFOO_DISABLE_UPDATE=1` was set.

## Guidance

- Run promptfoo only through `evals/`'s package scripts, which set the three switches. Every config also sets `sharing: false`, and nobody runs `promptfoo share`.
- Describe the setup as one small event per run, not none. `evals/README.md` does.
- To stop the event entirely, block `r.promptfoo.app` on the machine that runs promptfoo, with a firewall rule or the hosts file. That's the machine owner's call; nothing in the repo can do it.
- After upgrading promptfoo, look again: search the installed `dist/src/telemetry-*.js` for `recordTelemetryDisabled` and `R_ENDPOINT`.

## Why This Matters

The scripts read as though promptfoo sends nothing, and the switch's name says the same. Without this note, the next person repeats that claim, in a doc or to Hector, while each run reports its install id and machine details, and the account email of anyone who has one saved in promptfoo's settings.

## When to Apply

- Any promptfoo run from this repo, and any upgrade of the `promptfoo` version that `evals/package.json` pins.

## Examples

What the sandbox logged for one `bun run eval` with all three switches set:

```text
deny network-outbound r.promptfoo.app:443 (not in this command's allowed_domains ...)
```

And for `promptfoo --version` with only the telemetry switch set:

```text
deny network-outbound api.promptfoo.dev:443 (not in this command's allowed_domains ...)
```

## Related

- `evals/AGENTS.md`: the rules for running promptfoo here, which link to this lesson.
- `evals/README.md`: setting up and running an experiment.
