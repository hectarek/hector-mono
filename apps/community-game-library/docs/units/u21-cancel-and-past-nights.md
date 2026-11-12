# U21. Cancelling, past nights and the calendar file

| | |
|---|---|
| Batch | 5, Nights (`feat/community-game-library-b5-nights`) |
| Model | Standard |
| After | U19. Build it after U20, so the batch's branch stays linear |
| Serves | R33 (past nights), R34 (cancelling), R35, R52; KTD18, KTD24 |

The host cancels a night, with an offer to text everyone too. Past and cancelled nights fold away, and a night downloads as a calendar file.

## Read first

Besides step 2 of [How to build a unit](../build-plan.md#how-to-build-a-unit):

- Boards: `D11-CancelNight`, `D15-NightCancelled`, `D12-PastNights`, and D7 and D13 for Add to my calendar and Cancel the night.
- [screens.md](../screens.md): After each action, Cancel a night; Actions that ask first, Cancel a night; Empty lists, Past nights.
- [data-model.md](../data-model.md): `game_nights.cancelled_at`, and the notice type `night-cancelled`.
- [build-plan.md](../build-plan.md): R33, R34, R35, R52; KTD18, KTD24.

## Build

1. **`cancel-night`**: the host, after D11's dialog. It sets `cancelled_at`, and sends `night-cancelled` to everyone going, invited or waitlisted. The night leaves Nights for everyone. D15 follows, with "Text them too" through the share button and a ready message (R52).
2. **`list-past-nights`** (D12 at `/nights/past`): the past and cancelled nights the member could see, newest first, with "Cancelled" stamped where it was, and the Past nights empty state.
3. **The calendar file** (KTD24): `src/entities/calendar-file.ts` writes the night as an iCalendar event, with its text escaped and its times in UTC. `/nights/[id]/calendar` answers `text/calendar` only to someone who can see the night. "Add to my calendar" on D7 and D13 downloads it.

## Tests

- Cancelling tells everyone going, invited or waitlisted, and nobody else; a cancelled night is gone from upcoming and stamped in past.
- Only the host cancels.
- The calendar file's fields and escaping; the route refuses someone who can't see the night.
- Screens: Cancel a night's After each action row and dialog, D15, and Past nights when empty.

## Done when

- [ ] The checks, dead code and tests pass
- [ ] D11, D15 and D12 match their boards at 390 px, and work at 768 and 1280 px
- [ ] A downloaded file opens in a phone's calendar with the right time
- [ ] Committed as `feat(community-game-library): U21 cancelling, past nights and the calendar file`
- [ ] Batch 5 is pushed and its PR opened
