---
title: Biome's Solid rules report at "info", so --error-on-warnings lets a destructured prop through
date: 2026-11-24
category: developer-experience
module: "Biome, for apps/seating-chart and any app here written in Solid"
problem_type: developer_experience
component: tooling
severity: medium
applies_when:
  - "Turning on a Biome lint domain, such as solid, for an app"
  - "Counting on a Biome rule to fail `bun check` when its default severity is info"
symptoms:
  - "A Solid component that destructures its props passes `bun check` with no diagnostic"
root_cause: config_error
resolution_type: config_change
retire_when: "Biome raises noSolidDestructuredProps and useSolidForComponent to warn or error by default; check with `biome explain <rule>` (Default severity) after a Biome update"
tags: [biome, solid, lint, severity, error-on-warnings, domains]
---

# Biome's Solid rules report at "info", so --error-on-warnings lets a destructured prop through

## Context

`apps/seating-chart` is the first app here on Solid 2.0. The repo has no ESLint, so `eslint-plugin-solid` is out, and Biome 2.6's `solid` domain was the only Solid-aware lint available. The root `biome.json` turned it on for the app with `"domains": { "solid": "recommended" }`. Destructured props are the bug Solid's own primer ranks first, since they freeze a prop's value and reactivity stops, and the domain's `noSolidDestructuredProps` is meant to catch it.

A planted component, `export function Planted({ name }: { name: string })`, then passed the app's `lint` script with nothing reported. Every `lint` script here runs `biome check --write --error-on-warnings`, which fails on warnings and errors only. `biome explain` (Biome 2.6.8, 2026-11-24) gives each rule's default severity:

| Rule | Group | Default severity |
| --- | --- | --- |
| `noSolidDestructuredProps` | correctness | info |
| `useSolidForComponent` | performance | info |
| `noReactSpecificProps` | suspicious | warn |

An info diagnostic doesn't fail the script, so the two rules the domain exists for were on and never enforced.

## Guidance

Turning on a domain doesn't make its rules fail the build. Set each rule you rely on to `"error"` beside the domain, in the same override (root `biome.json`, the `apps/seating-chart/**` entry):

```json
{
  "includes": ["apps/seating-chart/**"],
  "linter": {
    "domains": { "solid": "recommended" },
    "rules": {
      "correctness": { "noSolidDestructuredProps": "error" },
      "performance": { "useSolidForComponent": "error" },
      "suspicious": { "noReactSpecificProps": "error" }
    }
  }
}
```

The explicit rules aren't redundant with the domain: taking them out puts the two info rules back to passing silently.

Then plant one violation of each and confirm the app's lint fails on all three before removing them. A file with `({ name })` props, a `className` attribute and a `.map()` returning JSX failed with `noSolidDestructuredProps`, `noReactSpecificProps` and `useSolidForComponent`.

Two traps when checking a single rule:

- `biome lint --only=<group>/<rule>` needs the rule's real group. `--only=nursery/noSolidDestructuredProps` fails with "The rule, group or domain doesn't exist"; it's `correctness/noSolidDestructuredProps`.
- Run Biome from the app's folder. From the repo root it can't resolve `@repo/biome-config` (`docs/lint-and-dead-code.md`, Biome).

## Why This Matters

A rule that's on but reports at info looks like coverage. It isn't, and nothing says so. Here it was the main lint guarding a framework the agents building the app don't know well: Solid 2.0 went stable after their training data, and their 1.x and React habits produce exactly the destructured props it catches.

## When to Apply

- Turning on any Biome domain for an app, or any rule whose default severity isn't warn or error: check with `biome explain <rule>`.
- After a Biome update, if the explicit settings might now be redundant: the same command shows whether the defaults changed.

## Related

- [apps/seating-chart/AGENTS.md](../../../apps/seating-chart/AGENTS.md), "When something breaks": the Solid rules, and the console diagnostics that cover the rest.
- [docs/lint-and-dead-code.md](../../lint-and-dead-code.md): how Biome is set up here.
