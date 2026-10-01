# AGENTS.md — hectors-tools

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers app-specific context.

## Overview
A catalog of small AI and general-purpose web tools, navigable from a `@repo/ui` sidebar. Long-term goal: make these public-access utilities for solving everyday problems. First tool is a **Resume Analyzer** (resume vs. job-description scoring) powered by the `ai` SDK through the Vercel AI Gateway.

This is a **complex app** structurally — it uses clean architecture and DI — but it is currently **lean**: no database, no auth, no transactions. Those layers are deferred until a specific tool needs persistence or users. (Tools therefore skip the `userId`/auth gate in controllers and actions.)

Deployment: not deployed; no Vercel project.

## Stack
- Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui via `@repo/ui`
- DI via `@evyweb/ioctopus` (wires `ILoggerService` + `IAiService` and the resume-analyzer use-case/controller)
- AI via the `ai` SDK v6 (`generateText` + `Output.object`) through the **Vercel AI Gateway**
- No DB / no auth (yet)

## AI / environment
- The Gateway is the AI SDK's built-in default provider — no per-provider keys. Set in `.env`:
  - `AI_GATEWAY_API_KEY` — Vercel AI Gateway key (required for live calls).
  - `AI_MODEL` — optional model override (default `anthropic/claude-sonnet-4.6`), as a `provider/model` string.
- **Reusable AI client:** `IAiService` (`src/application/services/ai.service.interface.ts`) is a generic, capability-shaped interface — point new AI tools at it. Today it exposes `generateObject<T>({ schema, system?, prompt?, files? })`; `generateText`/`stream` are intended future additions. Impl: `AiService` (`src/infrastructure/services/ai.service.ts`) — the only place that imports `ai`. PDFs are passed as `files` (file message parts) straight to a multimodal model, so there is no local PDF parser.

## Architecture

```
app/
  _components/                # All React components, grouped by route
    app-shell.tsx             #   layout: AppShell, AppSidebar, ThemeToggle, ToolCard
    app-sidebar.tsx
    theme-toggle.tsx
    tool-card.tsx
    <route-id>/               #   one folder per route, e.g. resume-analyzer/
  _lib/tools.ts               # Tool registry (drives catalog + sidebar nav)
  _providers/providers.tsx    # @repo/ui ThemeProvider + TooltipProvider + Toaster
  actions/<tool-id>.ts        # Server actions, split per tool
  tools/<tool-id>/page.tsx    # One route per tool (thin — imports its _components/<id> group)
  page.tsx                    # Catalog dashboard
  layout.tsx                  # Geist fonts + Providers + AppShell
  globals.css                 # @import "@repo/ui/styles/globals.css"

src/
  entities/
    errors/common.ts          # InputParseError, NotFoundError, etc.
    models/logger.model.ts    # LogLevel + LOG_LEVEL_PRIORITY
    models/resume-analysis.model.ts       # Resume Analyzer Zod schemas (input, file, result)
  application/
    services/ai.service.interface.ts      # IAiService
    services/logger.service.interface.ts  # ILoggerService
    use-cases/resume-analyzer/            # analyze-resume
  interface-adapters/
    controllers/resume-analyzer/          # analyze-resume
  infrastructure/
    services/ai.service.ts                # AiService (the only file that imports `ai`)
    services/mock-ai.service.ts           # MockAiService (NODE_ENV=test)
    services/console-logger.service.ts    # ConsoleLoggerService
    services/mock-logger.service.ts       # MockLoggerService (NODE_ENV=test)

di/
  container.ts                # getInjection<K>(symbol)
  types.ts                    # DI_SYMBOLS + DI_RETURN_TYPES
  modules/logger.module.ts
  modules/resume-analyzer.module.ts  # IAiService + the resume-analyzer use case and controller
```

**No root `lib/` yet:** `stash` and `hectors-recipes` keep framework-agnostic setup there (`@/lib/*`), e.g. `lib/logger.ts`, a standalone `ConsoleLoggerService` for root or edge code the DI container doesn't reach (a route handler, `proxy.ts`). Add it when the first such file needs it. `app/_lib/` is different: an App-Router-private folder for route-scoped modules (the tool registry); don't put root `lib/` code under `app/`.

**Components:** all components live under `app/_components/`, never inside a route folder. Layout-level components sit at the top; route-specific components go in a `app/_components/<route-id>/` subfolder (e.g. `resume-analyzer/`). Route `page.tsx` files stay thin and import from there.

When a tool needs an inward layer (entity, use-case, controller, repository) follow the canonical [clean-architecture guide](../../docs/clean-architecture.md). `hectors-recipes` is the reference implementation; where `stash` differs, follow recipes.

## Adding a Tool

1. Add an entry to `app/_lib/tools.ts` — `{ id, name, description, href, icon, status }`. Catalog cards and sidebar nav both read from this array.
2. Create the route at `app/tools/<id>/page.tsx`.
3. For tools that need server logic (most AI tools will), follow the clean-arch feature order:
   - Zod model → `src/entities/models/<name>.model.ts`
   - Service interface → `src/application/services/<name>.service.interface.ts`
   - Service impl → `src/infrastructure/services/<name>.service.ts`
   - Use case → `src/application/use-cases/<tool-id>/<name>.use-case.ts`
   - Controller → `src/interface-adapters/controllers/<tool-id>/<name>.controller.ts`
   - DI symbol + binding → `di/types.ts` + `di/modules/<tool-id>.module.ts` (load it in `di/container.ts`). `IAiService` is bound once (in `resume-analyzer.module.ts`); new tools reuse it, don't re-bind.
   - Server action → `app/actions/<tool-id>.ts`
   - UI → `app/_components/<tool-id>/` (imported by the thin `app/tools/<id>/page.tsx`)
4. Only introduce `db/`, `proxy.ts`, or auth layers when a tool genuinely needs persistence or user identity. Port from `hectors-recipes` when that day comes.

## Conventions

### Logging
- Never use `console.*` directly. Use `ILoggerService` via DI (`getInjection("ILoggerService").child({ layer, op })`); root or edge code outside the container gets `lib/logger.ts` (see above).
- Standard `layer` values: `action`, `use-case`, `controller`, `service`, `route`, `page`. `op` is the function name.

### File Naming
- All files and folders use kebab-case.
- Model files use `.model.ts`, interfaces use `.interface.ts`; mocks are `<name>.repository.mock.ts` for repositories and `mock-<name>.service.ts` for services.

### Zod 4
- `import { z } from "zod"` (we are on `zod@^4`).
- Use top-level validators: `z.uuid()`, `z.url()`, `z.email()`. Use `error` (not `message`) for custom errors.

### Sidebar
- `@repo/ui/components/sidebar` is BaseUI-backed. Use `render={<Link href="..." />}` on `SidebarMenuButton` to make it render as a Next.js `Link` (no `asChild`).

### Reusable UI
- `@repo/ui/components/file-drop-zone` (`FileDropZone`) is a shared, controlled drag-and-drop file picker (`value`/`onValueChange`, `accept`, `maxSizeBytes`, `hint`). It is not a form field — read its `File` from component state and append it to `FormData` in the submit handler (see the Resume Analyzer form).

## Commands
```bash
bun run dev --filter=hectors-tools
bun run build --filter=hectors-tools
bun check --filter=hectors-tools && bun ts --filter=hectors-tools
```

## Before Finishing Any Change
Scope checks to this app:
```bash
bun check --filter=hectors-tools && bun ts --filter=hectors-tools
```
