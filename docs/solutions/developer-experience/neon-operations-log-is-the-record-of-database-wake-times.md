---
title: On Vercel Hobby and Neon Free, Neon's operations log is the only record of how long the database took to wake
date: 2026-11-10
category: developer-experience
module: "apps/hectors-recipes, and any app here on Vercel Hobby with a Neon Free database"
problem_type: developer_experience
component: observability
severity: medium
applies_when:
  - "A cold open is slow and you need to know how much of it was the database waking up"
  - "The app runs on Vercel's Hobby plan, so its logs and timings are mostly unavailable"
related_components: [database, infrastructure]
tags: [neon, vercel-hobby, cold-start, scale-to-zero, observability, measuring]
retire_when: "Vercel Hobby keeps more than an hour of runtime logs or allows observability queries; check Vercel's plan limits page"
---

# On Vercel Hobby and Neon Free, Neon's operations log is the only record of how long the database took to wake

## Context

A free Neon database suspends after 5 idle minutes, and the next query waits for it to start again. Working out how much of a slow open that wait accounts for needs its history, and on Vercel's Hobby plan none of the usual places has it. On 2026-11-10, for `apps/hectors-recipes`:

- **Runtime logs** go back one hour on Hobby. The Vercel MCP's `get_runtime_logs` refused an older window with a 400.
- **Observability queries** (`create_observability_query`) need Pro and answered 402.
- **The Vercel CLI** failed inside Claude Code's sandbox with a certificate error. Use the Vercel MCP instead.

## Guidance

Read Neon's own operations log. The Neon MCP's `list_operations` for the project returns about 30 days of it. Sort by `created_at` and walk it:

- A `start_compute` is a wake. Its `total_duration_ms` is how long the wake took.
- The time from the previous `suspend_compute` to that `start_compute` is how long the database had slept.
- A `timeline_archive` between them means Neon had moved the storage out after a long sleep, and the next wake also brings it back. Count those wakes separately: they're the slow ones.

What it showed for `apps/hectors-recipes`, 11 October to 10 November 2026:

- 128 wakes. The 120 ordinary ones took a median 462 ms (90th percentile 760 ms).
- The 8 that followed an archive took 1.6–4.6 s, and each archive came 1,441–1,445 minutes after the compute suspended: storage is archived after about a day asleep.
- The database had slept a median 30.5 minutes before each wake.

That last number is the one that mattered. Any cache in front of the database that expires sooner than the usual gap between uses runs out before nearly every open (`docs/proxy-auth-research.md`, 2026-11 addendum).

## Why This Matters

Without the log, the wake is a guess, and the guess points at the wrong fix: here, a 5-minute session cache was expiring just before almost every wake. The operations log is also where the sleep-length distribution comes from, which decides whether keeping the database warm or caching around it is worth anything.

Timings of requests sent from a Claude Code session go through its network filter, which adds its own delay. Compare those with each other, never with what a phone sees.

## When to Apply

- Investigating a slow first request on an app whose Neon compute scales to zero.
- Before choosing between paying to keep the database awake and caching around it: the sleep lengths say which one helps.

The log shows the database's side only. A slow open also waits on a new Vercel function starting, which Hobby records nowhere; time that locally (see `docs/clean-architecture.md` §3.4 for how the DI container's start-up was timed).

## Related

- `apps/hectors-recipes/docs/ux-plan.md`, Phase 30: the cold open this measured, and what changed.
- `docs/proxy-auth-research.md`, 2026-11 addendum: the session cache that expired before nearly every wake.
