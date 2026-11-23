import { describe, expect, it } from "bun:test";
import {
  fits,
  isUpcoming,
  movingUp,
  seatsOpen,
  seatsTaken,
  waitlistOf,
} from "@/src/entities/night";

const going = (guestCount = 0) => ({ status: "going" as const, guestCount });

describe("a night's seats (R31, R47)", () => {
  it("counts each member going, the host among them, and their guests", () => {
    const list = [
      going(),
      going(),
      going(1),
      { status: "maybe" as const, guestCount: 0 },
      { status: "waitlisted" as const, guestCount: 2 },
    ];
    expect(seatsTaken(list)).toBe(4);
    expect(seatsOpen(6, list)).toBe(2);
  });

  it("never has fewer than no seats open", () => {
    expect(seatsOpen(2, [going(), going(1)])).toBe(0);
  });
});

describe("a night coming up (R33)", () => {
  it("stays coming up until its day is over in New York", () => {
    // 7 PM on Sat, Nov 14 in New York is midnight UTC on the 15th.
    const saturday = new Date("2026-11-15T00:00:00Z");
    expect(isUpcoming(saturday, "2026-11-14")).toBe(true);
    expect(isUpcoming(saturday, "2026-11-15")).toBe(false);
  });
});

describe("who fits, and the waitlist (R31, AE4)", () => {
  const at = (minute: number) =>
    new Date(`2026-11-08T13:${String(minute).padStart(2, "0")}:00-05:00`);
  const row = (
    userId: string,
    status: "going" | "waitlisted" | "maybe",
    guestCount = 0,
    waitlistedAt: Date | null = null,
  ) => ({ userId, status, guestCount, waitlistedAt });

  it("AE4: with 6 seats and 5 going, a member bringing a guest doesn't fit, and alone does", () => {
    const list = ["a", "b", "c", "d", "e"].map((id) => row(id, "going"));
    expect(fits(6, list, "jo", 1)).toBe(false);
    expect(fits(6, list, "jo", 0)).toBe(true);
    // Someone going counts the seats they hold already.
    expect(fits(6, [...list, row("jo", "going")], "jo", 0)).toBe(true);
    expect(fits(6, [...list, row("jo", "going")], "jo", 1)).toBe(false);
  });

  it("moves up the earliest waitlisted who fit, skipping one who doesn't", () => {
    const list = [
      ...["a", "b", "c", "d"].map((id) => row(id, "going")),
      row("late", "waitlisted", 0, at(30)),
      row("first", "waitlisted", 2, at(10)),
      row("second", "waitlisted", 0, at(20)),
    ];
    // 2 seats open: "first" needs 3, so "second" and "late" move up.
    expect(waitlistOf(list).map((one) => one.userId)).toEqual([
      "first",
      "second",
      "late",
    ]);
    expect(movingUp(6, list).map((one) => one.userId)).toEqual([
      "second",
      "late",
    ]);
    expect(movingUp(4, list)).toEqual([]);
  });
});
