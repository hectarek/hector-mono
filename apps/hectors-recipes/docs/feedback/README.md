# Feedback

What people who use the app tell us, one file per round, and what became of each thing they said ([ux-plan.md](../ux-plan.md) D71). Feedback is data, not a plan: it's filed here and never edited after the round closes, except for each item's outcome.

This repo is public. Leave out anything that identifies a person: names, emails, where they live or work, and quotes that would give them away. Summarize in your own words when in doubt.

## A round

A file named `<date>-<who>.md`, such as `2026-10-07-first-testers.md`, with:

1. **Where it came from:** who gave it, in general terms ("first testers, on their phones"), how (messages, a call, watching them use it), and the date.
2. **The feedback as given:** numbered F1, F2, … in the order received.
3. **Placed on the map:** each item answers [ux-map.md](../ux-map.md)'s four questions (the job, the screen and its room, the pattern, the cost to the other jobs) and gets an outcome.
4. **What it says about the app:** patterns across the items, such as a screen many items land on, or requests for things that already exist.

## Outcomes

Each item ends as one of these, written beside it:

- **Planned:** the phase and task that will build it (P23.1). It becomes **Built** when that phase merges.
- **Decided:** the D-number, when the answer was "not like that" or a rule changed.
- **Needs scoping:** too large or unclear to place yet. Kept in Hector's private tracker until it's discussed.
- **Dropped:** with the reason.

## How it informs the app

- An item that asks for something the app already does is a **clarity problem** on that screen, not a new feature: the fix is making what exists easier to find.
- Several items landing on one screen mean that screen needs one rework, not several additions (its **Room** on the map says how much it can take).
- An item that fits none of the map's jobs is a possible **new job**, and that's Hector's call before any design.
- What a round decides goes into the map in the same change as the code, as every change does (ux-plan.md's definition of done for a UI task).
