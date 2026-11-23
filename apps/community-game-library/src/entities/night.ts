// A night's seats, guests and waitlist (R31, R47; docs/data-model.md, game_night_attendees).
// U18 counts the seats; U19 adds who fits and the waitlist's order.
import type { GameNightAttendee } from "./models/game-night-attendee.model";
import { PLAN_TIME_ZONE, todayIn } from "./week";

type Seated = Pick<GameNightAttendee, "status" | "guestCount">;

// The seats taken: 1 plus their guests for each member going, the host among them.
export function seatsTaken(list: readonly Seated[]): number {
  return list.reduce(
    (taken, one) =>
      one.status === "going" ? taken + 1 + one.guestCount : taken,
    0,
  );
}

// The seats still open, never fewer than none.
export function seatsOpen(capacity: number, list: readonly Seated[]): number {
  return Math.max(0, capacity - seatsTaken(list));
}

// A night is coming up until the day it starts is over, in Eastern time (KTD9), so one under
// way tonight stays on Nights (R33). Past nights fold away (U21).
export function isUpcoming(startsAt: Date, today: string): boolean {
  return todayIn(PLAN_TIME_ZONE, startsAt) >= today;
}
