# Relationship Meter Algorithm

This document explains the research-based algorithms used to calculate relationship decay and interaction boosts in the Relationship Meter app.

## Overview

The app models relationships using concepts from relationship science research:

- **Granovetter's Tie Strength Theory** - Relationships are defined by time, emotional intensity, intimacy, and reciprocity
- **Dunbar's Social Layers** - Humans maintain ~150 relationships in concentric circles of closeness
- **Roberts & Dunbar's Decay Studies** - Relationships decay without active maintenance; kin bonds are more resilient than friendships

## Core Concepts

### Relationship Strength (0-100 Scale)

Every relationship has a `strength` value from 0-100:

| Range | Status | Meaning |
|-------|--------|---------|
| 80-100 | Thriving | Strong, healthy relationship |
| 60-79 | Healthy | Doing well, keep it up |
| 40-59 | Needs Attention | Should reach out soon |
| 20-39 | At Risk | Reconnect now before it fades |
| 0-19 | Dormant | Major effort needed to revive |

### Relationship Categories

Relationships fall into two categories with different decay behaviors:

| Category | Types | Decay Rate | Minimum Floor |
|----------|-------|------------|---------------|
| **Kin** | Family, Significant Other | Slow (180-day half-life) | 30 (never fully decays) |
| **Non-Kin** | Friends, Colleagues, Acquaintances | Fast (30-day half-life) | 0 (can fully decay) |
| **Long-Term Non-Kin** | Friends > 5 years | Medium (60-day half-life) | 10 (residual bond) |

### Dunbar Layers

Relationships are organized into layers based on closeness:

| Layer | Size | Contact Frequency | Social Time Share |
|-------|------|-------------------|-------------------|
| Support Clique | ~5 | Every 3 days | 40% |
| Sympathy Group | ~15 | Weekly | 20% |
| Affinity Group | ~50 | Bi-weekly | 20% |
| Active Network | ~150 | Monthly | 20% |

A new relationship without a chosen layer goes to the closest layer its starting strength qualifies for (85+ Support Clique, 65+ Sympathy Group, 40+ Affinity Group) that still has room, else the next one out (`assignDunbarLayer`).

---

## Decay Algorithm

### How Decay Works

Relationships naturally decay over time without interaction. The decay follows an **exponential half-life model**, meaning:

- After one half-life period, strength drops to 50%
- After two half-life periods, strength drops to 25%
- And so on...

### Decay Formula

```
newStrength = currentStrength × (0.5 ^ (daysSinceContact / adjustedHalfLife))
```

Where `adjustedHalfLife` accounts for:
1. **Category** - Kin relationships decay slower
2. **Relationship Duration** - Long-term friendships (5+ years) decay slower
3. **Inertia** - Strong relationships resist decay more than weak ones

### Inertia Effect

Strong relationships have "inertia" - they resist decay:

| Current Strength | Decay Speed | Half-Life Modifier |
|------------------|-------------|-------------------|
| 90-100 | Very Slow | 2x longer |
| 70-89 | Slow | 1.33x longer |
| 50-69 | Normal | 1x (baseline) |
| 30-49 | Fast | 0.8x shorter |
| 0-29 | Very Fast | 0.67x shorter |

**Example**: A friend with 90% strength and base 30-day half-life would have an effective half-life of 60 days.

### Decay Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        DECAY CALCULATION                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ INPUT: currentStrength, lastInteraction, type, relationshipYears │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Calculate days since contact  │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Determine category (kin/nonKin)│
              │ from relationship type         │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Select decay profile:          │
              │ • kin (180 days)               │
              │ • nonKin (30 days)             │
              │ • longTermNonKin (60 days)     │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Get inertia multiplier from    │
              │ current strength               │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ adjustedHalfLife =             │
              │ baseHalfLife / inertiaMultiplier│
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ decayFactor = 0.5 ^ (days /    │
              │               adjustedHalfLife)│
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ newStrength = max(             │
              │   currentStrength × decayFactor,│
              │   minimumFloor                 │
              │ )                              │
              └───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ OUTPUT: newStrength, healthStatus, isOverdue, recommendedContact │
└─────────────────────────────────────────────────────────────────┘
```

### Decay Examples

**Example 1: Close Friend (Non-Kin)**
- Current strength: 80
- Days since contact: 30
- Half-life: 30 days (non-kin)
- Inertia: 0.75x (strong = slower decay)
- Adjusted half-life: 30 / 0.75 = 40 days
- Decay factor: 0.5 ^ (30/40) = 0.59
- New strength: 80 × 0.59 = **47**

**Example 2: Family Member (Kin)**
- Current strength: 80
- Days since contact: 30
- Half-life: 180 days (kin)
- Inertia: 0.75x
- Adjusted half-life: 180 / 0.75 = 240 days
- Decay factor: 0.5 ^ (30/240) = 0.92
- New strength: 80 × 0.92 = **74**

---

## Interaction Algorithm

### How Interactions Work

Interactions boost relationship strength. The boost amount depends on:

1. **Interaction Type** - Deep conversations boost more than quick check-ins
2. **Emotional Tone** - Positive interactions boost more; negative can harm
3. **Reciprocity** - Balanced relationships get full boost; one-sided get less
4. **Duration** - Longer interactions are more impactful

### Interaction Types and Base Boosts

| Type | Base Boost | Description |
|------|------------|-------------|
| Deep Conversation | +25 | Personal sharing, emotional support, confiding |
| Shared Activity | +20 | Doing something together (meal, activity, hangout) |
| Synchronous Contact | +15 | Real-time: call, video chat, in-person chat |
| Asynchronous Contact | +8 | Messages, emails, comments |
| Passive Acknowledgment | +3 | Likes, reactions, brief acknowledgment |

### Modifiers

#### Emotional Tone Modifier

| Tone | Modifier | Effect |
|------|----------|--------|
| Positive | ×1.0 | Full boost |
| Neutral | ×0.5 | Half boost |
| Mixed | ×0.3 | Reduced boost |
| Negative | ×-0.5 | **Harms** the relationship |

#### Reciprocity Modifier

| State | Modifier | Meaning |
|-------|----------|---------|
| Mutual | ×1.0 | Both parties engage equally |
| One-Way Receiver | ×0.8 | They reach out more than you |
| One-Way Initiator | ×0.7 | You're carrying the relationship |
| Dormant | ×0.5 | Neither party engaging |

The state comes from who initiated the last 10 interactions, counting the one being logged ("You initiated?" in the dialog): 70% or more you is One-Way Initiator, 30% or less is One-Way Receiver, anything between is Mutual. With fewer than 3 interactions the current state stays (`calculateReciprocityState`). Dormant is only ever set directly, never computed.

#### Duration Modifier

| Duration | Modifier |
|----------|----------|
| Brief (≤5 min) | ×0.5 |
| Short (5-15 min) | ×0.75 |
| Medium (15-30 min) | ×1.0 |
| Long (30-60 min) | ×1.25 |
| Extended (60+ min) | ×1.5 |

### Interaction Formula

```
finalBoost = baseBoost × toneModifier × reciprocityModifier × durationModifier
newStrength = min(100, max(0, currentStrength + finalBoost))
```

### Interaction Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERACTION CALCULATION                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ INPUT: interactionType, emotionalTone, reciprocityState,        │
│        durationMinutes, activityContext                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Get base boost from            │
              │ interaction type (3-25 points) │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Apply emotional tone modifier  │
              │ (-0.5 to 1.0)                  │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Apply reciprocity modifier     │
              │ (0.5 to 1.0)                   │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Apply duration modifier        │
              │ (0.5 to 1.5)                   │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ finalBoost = base × tone ×     │
              │              reciprocity ×     │
              │              duration          │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ newStrength = clamp(0, 100,    │
              │   currentStrength + finalBoost)│
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │ Update activity diversity if   │
              │ new context was added          │
              └───────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ OUTPUT: newStrength, strengthChange, newActivityDiversity        │
└─────────────────────────────────────────────────────────────────┘
```

### Interaction Examples

**Example 1: Positive Deep Conversation**
- Type: Deep Conversation (+25)
- Tone: Positive (×1.0)
- Reciprocity: Mutual (×1.0)
- Duration: 45 minutes (×1.25)
- Final boost: 25 × 1.0 × 1.0 × 1.25 = **+31.25**

**Example 2: Neutral Quick Check-in**
- Type: Asynchronous Contact (+8)
- Tone: Neutral (×0.5)
- Reciprocity: One-Way Initiator (×0.7)
- Duration: 2 minutes (×0.5)
- Final boost: 8 × 0.5 × 0.7 × 0.5 = **+1.4**

**Example 3: Negative Interaction**
- Type: Synchronous Contact (+15)
- Tone: Negative (×-0.5)
- Reciprocity: Mutual (×1.0)
- Duration: 30 minutes (×1.0)
- Final boost: 15 × -0.5 × 1.0 × 1.0 = **-7.5**

---

## Additional Factors

### Activity Diversity

Relationships are stronger when people share multiple contexts. `applyInteraction` updates the diversity level from each interaction's context, and the shown strength applies its multiplier (see Shown Strength below).

| Contexts | Multiplier | Example |
|----------|------------|---------|
| 1 | ×1.0 | Just work colleagues |
| 2-3 | ×1.15 | Work + occasional lunch |
| 4+ | ×1.3 | Work + gym + dinners + travel |

### Interdependence

How much you influence each other's lives. The level is set in the edit dialog, and the shown strength adds its weighted bonus (see Shown Strength below).

| Level | Weight | Description |
|-------|--------|-------------|
| Independent | 0.2 | Lives don't overlap |
| Moderate | 0.5 | Some shared decisions |
| Intertwined | 0.8 | Significant daily influence |
| Merged | 1.0 | Deeply interconnected (partners) |

### Shown Strength

The meter, health status, filters and sorting use the decayed strength adjusted by both factors above (`calculateComprehensiveScore`):

```
shown = decayed + (100 − decayed) × ((diversityMultiplier − 1) + 0.2 × interdependenceWeight)
```

Each factor closes a share of the gap to 100: diversity up to 30% (Diverse), interdependence up to 20% (Merged), so at most half the gap. The order of relationships is kept, and only one already at 100 shows 100. A friend at 81 with diverse contexts and moderate interdependence shows 89. The adjustment isn't stored: an interaction builds on the decayed strength alone, so the bonus never compounds.

### IOS Scale (Initial Calibration)

When adding a relationship, users rate closeness on a 1-7 scale:

| IOS Rating | Initial Strength | Label |
|------------|------------------|-------|
| 1 | 15 | Stranger/New acquaintance |
| 2 | 30 | Acquaintance |
| 3 | 45 | Casual friend |
| 4 | 60 | Friend |
| 5 | 75 | Good friend |
| 6 | 88 | Close friend/Family |
| 7 | 100 | Closest bond |

---

## Implementation Reference

All constants and functions are defined in:
- [`app/_lib/model.ts`](../app/_lib/model.ts) - Constants, types, and algorithms
- [`app/_lib/types.ts`](../app/_lib/types.ts) - TypeScript interfaces

### Key Functions

```typescript
// Calculate decay for a relationship
calculateRelationshipDecay(input: DecayInput): DecayResult

// Apply an interaction and get new strength
applyInteraction(input: InteractionInput): InteractionResult

// Get health status from strength
getHealthStatus(strength: number): HealthStatusInfo

// Check if contact is overdue
isContactOverdue(days, dunbarLayer, category): boolean
```

---

## Research Sources

- Granovetter, M. S. (1973). *The Strength of Weak Ties*
- Roberts, S. G. B., & Dunbar, R. I. M. (2011). *The costs of family and friends*
- Dunbar, R. I. M. (various). *Social brain hypothesis and Dunbar's number*
- Mønster, D. et al. (2018). *Measuring social integration and tie strength*

See [research.md](./research.md), [research2.md](./research2.md), and [research3.md](./research3.md) for full citations.
