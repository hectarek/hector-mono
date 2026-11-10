---
title: On Vercel Hobby and Neon Free, a cold open's parts are in two logs, Neon's operations log for the database's wake and Vercel's runtime logs, within the hour, for the function's start
date: 2026-11-10
last_updated: 2026-11-10
category: developer-experience
module: "apps/hectors-recipes, and any app here on Vercel Hobby with a Neon Free database"
problem_type: developer_experience
component: observability
severity: medium
applies_when:
  - "A cold open is slow and you need to know how much of it was the database waking up"
  - "You need to split a slow request into Vercel starting the function, the database waking and the reads"
  - "The app runs on Vercel's Hobby plan, so its logs and timings are mostly unavailable"
related_components: [database, infrastructure]
tags: [neon, vercel-hobby, cold-start, scale-to-zero, observability, measuring, runtime-logs]
retire_when: "Vercel Hobby keeps more than an hour of runtime logs or allows observability queries; check Vercel's plan limits page"
---

# On Vercel Hobby and Neon Free, a cold open's parts are in two logs

## Context

A free Neon database suspends after 5 idle minutes, and the next query waits for it to start again. Vercel's Hobby plan keeps no function warm, so the first request after a quiet spell also waits for a new function to start. Telling the two apart needs their timings, and on Hobby most of the usual places don't have them. On 2026-11-10, for `apps/hectors-recipes`:

- **Runtime logs** go back one hour on Hobby. The Vercel MCP's `get_runtime_logs` refused an older window with a 400.
- **Observability queries** (`create_observability_query`) need Pro and answered 402.
- **The Vercel CLI** failed inside Claude Code's sandbox with a certificate error. Use the Vercel MCP instead.

## Guidance

**The database's wakes: Neon's operations log.** The Neon MCP's `list_operations` for the project returns about 30 days of it. Sort by `created_at` and walk it:

- A `start_compute` is a wake. Its `total_duration_ms` is how long the wake took.
- The time from the previous `suspend_compute` to that `start_compute` is how long the database had slept.
- A `timeline_archive` between them means Neon had moved the storage out after a long sleep, and the next wake also brings it back. Count those wakes separately: they're the slow ones.

**The function's start: Vercel's runtime logs, within the hour.** `get_runtime_logs` for a narrow window (`since` and `until`) returns each log line with its request id, such as `tc7t8-1794329050250-1b9387685ea1`.

- The middle number is a Unix time in milliseconds. In the two requests checked, it matched when the request reached Vercel (16:44:10.250 and 16:16:21.706), each within about 0.1 s of the browser's own navigation start, by the Mac's clock.
- The gap from that time to the function's first log line is how long the function took to start.
- The log lines after it time each read, and the operations log gives the wake inside them.
- Grouping the hour's logs by `requestPath` (`group_by`) shows whether a route was called at all.

What they showed for `apps/hectors-recipes`:

- **11 October to 10 November 2026, the database:** 128 wakes. The 120 ordinary ones took a median 462 ms (90th percentile 760 ms). The 8 that followed an archive took 1.6–4.6 s, and each archive came 1,441–1,445 minutes after the compute suspended, so storage is archived after about a day asleep. The database had slept a median 30.5 minutes before each wake.
- **One cold open on 10 November, the database asleep 16.5 minutes:** the function's first line came about 1.8 s after the request arrived, then 1.35 s of reads, including a 314 ms wake. Warm, the first line came 0.1 s after the request.
- **The same hour:** no request to `/api/auth/get-session` in 40 minutes. That showed the proxy's session refresh no longer ran on every open (`docs/proxy-auth-research.md`, 2026-11 addendum).

## Why This Matters

Without these, the slow part is a guess, and the guess points at the wrong fix. Before measuring, the function's start had been guessed at 0.2 s; it was 1.8 s, the largest single part of the cold open. Likewise, a 5-minute session cache was expiring just before almost every wake.

Timings of requests sent from a Claude Code session go through its network filter, which adds its own delay. Compare those with each other, never with what a phone sees. A browser pane that's hidden also delays painting, so trust its network timings, not its paint times.

## When to Apply

- Investigating a slow first request on an app whose Neon compute scales to zero.
- Before choosing between paying to keep the database awake or functions warm and caching around them: the sleep lengths and the function's start say which one helps.
- Within the hour of the request you're timing: after that, Hobby's runtime logs are gone and only the database's side remains.

## Related

- `apps/hectors-recipes/docs/ux-plan.md`, Phase 30 (P30.4 has the cold open's breakdown) and Phase 31.
- `docs/proxy-auth-research.md`, 2026-11 addendum: the session cache that expired before nearly every wake.
