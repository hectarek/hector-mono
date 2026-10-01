# Agent Context Playbook

How we make this monorepo legible to AI agents (Claude Code, Cursor, Codex, etc.) and keep that context healthy as we build.

Adapted from Anthropic's [_How Claude Code works in large codebases_](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start). The principles are model- and tool-agnostic — they apply to any agent we run (Claude Code, Cursor, Codex).

> **TL;DR for every task:** read the layered `AGENTS.md` files, scope work to the relevant app, and when you learn something durable, write it back into the right `AGENTS.md` and commit it with the code. Context is part of the deliverable, not an afterthought.

---

## Why this matters

Agents navigate the way an engineer would: traverse the tree, read files, grep, follow references. There is no magic index. The quality of that navigation is bounded by how well the codebase is set up. Two failure modes to avoid:

- **Too little context** → the agent navigates blind, greps broadly, and burns its context window before doing real work.
- **Too much context** → loading everything into every session degrades performance and drowns the signal.

The goal is **lean, layered, and current** context.

---

## The harness (what we use)

The "harness" — everything around the model — matters as much as the model. Layers, in the order they earn their keep:

| Layer | What it is | This repo |
| --- | --- | --- |
| **`AGENTS.md`** | Context files read automatically every session. Root = big picture; per-dir = local conventions. | ✅ Canonical. Root `AGENTS.md` + one per app + `packages/ui`. **Start here.** |
| **Ignore files** | Exclude generated/build/vendor noise from agent search. | ✅ `.cursorignore` (lockfile, `.next`, `.turbo`, migrations, generated types). |
| **Hooks** | Scripts at events; deterministic enforcement + self-improvement. | ✅ Biome formats each edited file: Cursor's `afterFileEdit` (`.cursor/hooks.json`) and Claude Code's `PostToolUse` (`.claude/settings.json`) both run `.cursor/hooks/format.sh`. |
| **Permissions** | What an agent may run without asking, must ask about, or can't read. | ✅ Claude Code: `.claude/settings.json` allows the checks (`bun check`, `bun ts`, tests, `gh pr view`), asks before `git stash`, discarding changes or `gh pr merge`, and denies reading `.env` files (Claude's Read tool only; a shell command isn't covered). Personal additions go in the gitignored `.claude/settings.local.json`. |
| **Rules** | Cursor-specific or on-demand reference. | ✅ Trimmed `.cursor/rules` — no duplication of `AGENTS.md`. |
| **Skills** | On-demand expertise, path-scoped. | Global skills only; add project skills when a workflow repeats. |
| **LSP** | Symbol-level navigation. | ✅ Built into Cursor. |
| **Subagents** | Isolated context for explore-vs-edit splits. | Use a subagent (Claude Code's Agent tool) for broad exploration; edit in the main session. |
| **MCP** | Connections to external tools/data. | Configured (Neon, Vercel, GitHub, etc.). Build only after the basics are solid. |

**Rule of thumb:** if it's project knowledge → `AGENTS.md`. If it's reusable expertise across projects → a skill. If it must run automatically → a hook.

---

## The context-file rules

1. **Lean and layered.** The root `AGENTS.md` is pointers + critical gotchas only. Local conventions live in the nearest `AGENTS.md`. Agents load them additively as they walk the tree, so root context is never lost.
2. **`AGENTS.md` is the single source of truth.** Don't duplicate it into `.cursor/rules`. Duplicate context is double the maintenance and double the drift.
3. **Scope to the subdirectory.** Work in the relevant app folder, not the repo root. Per-app `AGENTS.md` files carry the scoped `bun check --filter=<app>` / `bun ts --filter=<app>` commands — use them instead of running the whole monorepo.
4. **Keep generated files out of context** via `.cursorignore`. If you start working _on_ generated output, override locally — don't delete the shared ignore.
5. **Provide a map when structure doesn't.** The root `AGENTS.md` "Monorepo Structure" block is that table of contents.
6. **No `CLAUDE.md`.** Claude Code (v2.1.277+) reads `AGENTS.md` itself, but only when there's no `CLAUDE.md` or `CLAUDE.local.md` in the working directory or above it, so adding one hides the `AGENTS.md` files ([Claude Code docs](https://code.claude.com/docs/en/memory#agents-md)).

---

## Keeping context current (the operational loop)

Context rots. Models also evolve — instructions that helped an older model can _constrain_ a newer one (e.g. "split every refactor into one-file changes"). Treat context as living.

**Every task, as part of the work (not a separate chore):**

1. **Read** the relevant `AGENTS.md` files before editing.
2. **Do** the work, scoped to the app.
3. **Write back** anything durable you learned:
   - New pattern, convention, or gotcha → the nearest `AGENTS.md`.
   - New folder/module/entry point → update that app's structure block.
   - A workaround for a model/tool limitation → note it _and_ a date, so it can be retired later.
4. **Commit context with the code.** `AGENTS.md`, `.cursor/`, and docs changes ship in the same PR as the change they describe. Context is version-controlled, reviewed, and diffable like any other code.
5. **Prune.** If a file/convention referenced in `AGENTS.md` no longer exists, fix or remove the reference in the same change. Stale context is worse than none — it actively misleads.

**What does NOT belong in `AGENTS.md`:** changelogs, one-off task notes, long reference material. Those go in `docs/` (and get linked, not inlined).

---

## Capturing lessons learned

When a session uncovers something non-obvious (a tricky bug root cause, a framework footgun, an architecture decision):

- **Small + durable** (a rule, a "never do X here") → fold into the relevant `AGENTS.md`.
- **Large + reference** (research, deep dives) → a kebab-case doc under `docs/` (global) or `apps/<app>/docs/` (app-specific), linked from the relevant `AGENTS.md` so it's discoverable on demand without bloating the always-loaded context. Example: `docs/proxy-auth-research.md`.

---

## Work that spans sessions: the plan doc

Work that takes more than one session (a feature pass, a migration, a review's fixes) runs from one plan doc in the app's `docs/`, so any agent can pick it up in a fresh context window. [`apps/hectors-recipes/docs/ux-plan.md`](../../apps/hectors-recipes/docs/ux-plan.md) is the reference. Its parts, in order:

1. **Status**: a small table at the top with the phase, the next task, what's waiting on Hector, and the date. Updated at the end of every session.
2. **How to resume**: what a new session does first: read Status, find the first open task (a `grep` command), read the AGENTS.md files and the docs the task needs, and check the branch and recent commits match the log.
3. **Conventions**: the task line (`- [ ] **Pn.m** Title — owner · D… · needs …`), states (`[ ]` open, `[~]` in progress, `[x]` done, `[-]` dropped with a reason), owners (C is Claude, H is Hector, C+H is Claude after Hector's OK at that moment, for anything that migrates or writes real data), one branch and PR per phase, one commit per task (`type(app): Pn.m summary`).
4. **Decisions**, numbered `D1`, `D2`, …, each with its reason. Tasks cite them; a changed decision is marked revised, not silently rewritten.
5. **Phases of tasks**, each task with **Found** (what was seen), **Do**, **Verify**, and once done **Evidence** (what changed, the checks run, what was looked at).
6. **Needs from Hector**: a live list of what's waiting on him (`H1`, `H2`, …).
7. **Session log**: dated entries, newest last, each ending with **Next**.

One plan per stream of work: update it rather than starting a parallel doc, and refer to PRs as `hectarek/hector-mono#n`.

---

## Where docs live

- **Global** (`docs/`): monorepo-wide references — `monorepo-guide.md`, `clean-architecture.md` (the canonical guide for complex apps), `ui-package.md`, shared research like `proxy-auth-research.md`, and this playbook.
- **App-specific** (`apps/<app>/docs/`): anything that pertains to exactly one app — specs, design notes, app SEO/perf.
- **Naming:** all docs are lower **kebab-case** (`my-doc.md`), like every other file in the repo.
- A doc is "global" only if 2+ apps use it. When in doubt, colocate it with the app.

---

## Review cadence

Do a deliberate context review every **3–6 months**, and whenever performance feels like it plateaued after a major model release. Look for:

- Instructions compensating for limitations newer models no longer have → remove.
- Hooks/skills built around old tooling gaps → retire.
- `AGENTS.md` files that drifted from the actual structure → reconcile.
- Anything bloating the always-loaded root file that could move to a linked doc.

---

## Quick checklist (per task)

- [ ] Read the root + app `AGENTS.md` before editing
- [ ] Scope work and checks to the relevant app (`--filter=<app>`)
- [ ] Reuse `@repo/ui` before creating components
- [ ] Update the relevant `AGENTS.md` if a pattern/structure/gotcha changed
- [ ] Remove or fix any now-stale references you touched
- [ ] Commit context changes alongside the code
- [ ] If the work runs from a plan doc, update its Status and session log
- [ ] Run `bun check --filter=<app> && bun ts --filter=<app>`
