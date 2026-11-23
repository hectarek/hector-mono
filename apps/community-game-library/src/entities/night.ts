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

type Listed = Pick<
  GameNightAttendee,
  "userId" | "status" | "guestCount" | "waitlistedAt"
>;

// The seats a member takes: theirs, and one for each guest (R47).
const seatsFor = (guestCount: number): number => 1 + guestCount;

// Whether a member bringing `guests` fits on the night, counting the seats they hold already if
// they're going (AE4: with one seat open, a member with a guest doesn't).
export function fits(
  capacity: number,
  list: readonly Listed[],
  userId: string,
  guests: number,
): boolean {
  const others = list.filter((one) => one.userId !== userId);
  return seatsTaken(others) + seatsFor(guests) <= capacity;
}

// The waitlist, in the order its people joined it (R31).
export function waitlistOf<T extends Listed>(list: readonly T[]): T[] {
  return list
    .filter((one) => one.status === "waitlisted")
    .sort(
      (a, b) =>
        (a.waitlistedAt?.getTime() ?? 0) - (b.waitlistedAt?.getTime() ?? 0) ||
        (a.userId < b.userId ? -1 : 1),
    );
}

// Who moves from the waitlist to going when seats open: the earliest waitlisted members whose
// seats fit, each in turn, skipping one who doesn't (R31, AE4).
export function movingUp<T extends Listed>(
  capacity: number,
  list: readonly T[],
): T[] {
  let taken = seatsTaken(list);
  const moving: T[] = [];
  for (const one of waitlistOf(list)) {
    if (taken + seatsFor(one.guestCount) <= capacity) {
      taken += seatsFor(one.guestCount);
      moving.push(one);
    }
  }
  return moving;
}
