import { describe, expect, it } from "bun:test";
import { isUpcoming, seatsOpen, seatsTaken } from "@/src/entities/night";

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
