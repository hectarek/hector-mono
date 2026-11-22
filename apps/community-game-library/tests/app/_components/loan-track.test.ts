import { describe, expect, it } from "bun:test";
import { trackSpaces } from "@/app/_components/loan-track";

const labels = (track: ReturnType<typeof trackSpaces>) =>
  track.spaces.map((space) =>
    space.late
      ? `${space.label}!`
      : space.due
        ? `${space.label}*`
        : space.label,
  );

// The boards' tracks: * is the due space, ! a late one.
describe("a loan's track spaces (U13)", () => {
  it("runs a space a day from today to the due day within a week (C5: Moss & Mortar, due Fri)", () => {
    const track = trackSpaces("2026-11-06", "2026-11-13", "2026-11-10");
    expect(labels(track)).toEqual(["TUE", "WED", "THU", "FRI*"]);
    expect(track.today).toBe(0);
  });

  it("shows the last days up to the due one and a late space for the piece (C7: Gull & Anchor, a day overdue)", () => {
    const track = trackSpaces("2026-11-02", "2026-11-09", "2026-11-10");
    expect(labels(track)).toEqual(["SAT", "SUN", "MON*", "+1!"]);
    expect(track.today).toBe(3);
  });

  it("runs a space a week for a longer loan, the piece on this week (C3's preview of 2 weeks)", () => {
    const track = trackSpaces("2026-11-10", "2026-11-24", "2026-11-10");
    expect(labels(track)).toEqual(["WK 1", "WK 2*"]);
    expect(track.today).toBe(0);
    const month = trackSpaces("2026-11-01", "2026-12-01", "2026-11-17");
    expect(labels(month)).toEqual(["WK 1", "WK 2", "WK 3", "WK 4", "WK 5*"]);
    expect(month.today).toBe(2);
  });

  it("tells a week's repeated weekday apart by its day", () => {
    const track = trackSpaces("2026-11-10", "2026-11-17", "2026-11-10");
    expect(labels(track)).toEqual([
      "TUE",
      "WED",
      "THU",
      "FRI",
      "SAT",
      "SUN",
      "MON",
      "TUE*",
    ]);
    expect(new Set(track.spaces.map((space) => space.id)).size).toBe(8);
  });
});
