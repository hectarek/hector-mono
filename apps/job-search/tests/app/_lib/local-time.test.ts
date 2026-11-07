import { describe, expect, it } from "bun:test";
import { localOf, minutesAfter, momentOf } from "@/app/_lib/local-time";

describe("a time field's value", () => {
  it("is the wall time in Eastern time, whatever the zone the code runs in", () => {
    expect(localOf(new Date("2026-11-10T17:00:00Z"))).toBe("2026-11-10T12:00");
    expect(localOf(new Date("2026-10-28T13:30:00Z"))).toBe("2026-10-28T09:30");
  });

  it("names the moment it shows, on both sides of the change to standard time", () => {
    expect(momentOf("2026-10-31T23:30")).toBe("2026-11-01T03:30:00.000Z");
    expect(momentOf("2026-11-01T09:30")).toBe("2026-11-01T14:30:00.000Z");
    expect(momentOf(localOf(new Date("2026-11-10T17:00:00Z")))).toBe(
      "2026-11-10T17:00:00.000Z",
    );
  });

  it("moves on the wall clock, past midnight too", () => {
    expect(minutesAfter("2026-11-10T12:00", 30)).toBe("2026-11-10T12:30");
    expect(minutesAfter("2026-11-10T23:30", 60)).toBe("2026-11-11T00:30");
  });
});
