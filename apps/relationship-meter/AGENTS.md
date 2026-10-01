# AGENTS.md — relationship-meter

> Read the root [AGENTS.md](../../AGENTS.md) first. This file only covers relationship-meter-specific context.

## Overview
Client-side relationship strength tracker with research-based decay and interaction models. No backend, no auth, no database.

## Stack
- Next.js 16, React 19, Tailwind CSS, shadcn/ui
- Client-side state only — data is in-memory, lost on refresh

## Architecture
Simple app — no DI, no domain error classes, no use cases.

```
app/
  _components/
    relationship-meter-container.tsx   # Main state container
    relationship-card.tsx              # Card UI with interaction/edit dialogs
    relationship-list.tsx              # Grouped or flat list rendering
    add-relationship-dialog.tsx
    edit-dialog.tsx
    interaction-dialog.tsx
    interaction-history.tsx
    sort-filter-controls.tsx
    header.tsx
  _lib/
    model.ts    # Research-based algorithms (decay, interaction boost, Dunbar layers)
    types.ts    # Relationship, Interaction, CreateRelationshipInput
    data.ts     # Static seed data (initialRelationships)
    utils.ts    # Helpers (formatRelativeTime, daysSince, etc.)
  _providers/
    providers.tsx
```

## Data
- Seed data in `_lib/data.ts` — array of sample relationships
- All state managed in `relationship-meter-container.tsx` via `useState`
- No persistence (localStorage, API, or database)

## Patterns
- Single-page app — one route, container component owns all state
- Props drilling: `onInteraction`, `onEdit` passed down from container → list → card
- Domain logic in `_lib/model.ts` — Granovetter tie strength, Dunbar layers, IOS scale, decay profiles

## Commands
```bash
bun run dev --filter=relationship-meter
bun run build --filter=relationship-meter
```

## Before Finishing Any Change
Scope checks to this app:
```bash
bun check --filter=relationship-meter && bun ts --filter=relationship-meter
```
