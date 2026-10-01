# Agent Context Playbook

How we make this monorepo legible to AI agents (Claude Code, Cursor, Codex, etc.) and keep that context healthy as we build.

Adapted from Anthropic's [_How Claude Code works in large codebases_](https://claude.com/blog/how-claude-code-works-in-large-codebases-best-practices-and-where-to-start). The principles are model- and tool-agnostic — they apply to any agent we run through Cursor.

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
| **Hooks** | Scripts at events; deterministic enforcement + self-improvement. | ✅ `afterFileEdit` → Biome (`.cursor/hooks.json`). |
| **Rules** | Cursor-specific or on-demand reference. | ✅ Trimmed `.cursor/rules` — no duplication of `AGENTS.md`. |
| **Skills** | On-demand expertise, path-scoped. | Global skills only; add project skills when a workflow repeats. |
| **LSP** | Symbol-level navigation. | ✅ Built into Cursor. |
| **Subagents** | Isolated context for explore-vs-edit splits. | Use the Task tool for broad exploration; edit in the main session. |
| **MCP** | Connections to external tools/data. | Configured (Neon, Vercel, GitHub, etc.). Build only after the basics are solid. |

**Rule of thumb:** if it's project knowledge → `AGENTS.md`. If it's reusable expertise across projects → a skill. If it must run automatically → a hook.

---

## The context-file rules

1. **Lean and layered.** The root `AGENTS.md` is pointers + critical gotchas only. Local conventions live in the nearest `AGENTS.md`. Agents load them additively as they walk the tree, so root context is never lost.
2. **`AGENTS.md` is the single source of truth.** Don't duplicate it into `.cursor/rules`. Duplicate context is double the maintenance and double the drift.
3. **Scope to the subdirectory.** Work in the relevant app folder, not the repo root. Per-app `AGENTS.md` files carry the scoped `bun check --filter=<app>` / `bun ts --filter=<app>` commands — use them instead of running the whole monorepo.
4. **Keep generated files out of context** via `.cursorignore`. If you start working _on_ generated output, override locally — don't delete the shared ignore.
5. **Provide a map when structure doesn't.** The root `AGENTS.md` "Monorepo Structure" block is that table of contents.

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
- [ ] Run `bun check --filter=<app> && bun ts --filter=<app>`
