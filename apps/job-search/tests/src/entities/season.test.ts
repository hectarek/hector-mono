import { describe, expect, it } from "bun:test";
import type { Season } from "@/src/entities/models/settings.model";
import { legsOf, placeOf } from "@/src/entities/season";

// A fictional season of 91 days with two checkpoints, as the design system's TrackMap draws it.
const SEASON: Season = {
  start: "2026-11-02",
  finish: "2027-02-01",
  checkpoints: [
    { on: "2026-11-13", name: "Portfolio live" },
    { on: "2026-12-18", name: "Five screens" },
  ],
};

describe("the season's legs (R9 as revised 2026-11-10)", () => {
  it("runs a leg to each checkpoint, then one to the finish, each with its length and where it ends", () => {
    expect(legsOf(SEASON)).toEqual([
      {
        sector: 1,
        startsOn: "2026-11-02",
        endsOn: "2026-11-13",
        name: "Portfolio live",
        days: 11,
        share: 11 / 91,
      },
      {
        sector: 2,
        startsOn: "2026-11-13",
        endsOn: "2026-12-18",
        name: "Five screens",
        days: 35,
        share: 46 / 91,
      },
      {
        sector: 3,
        startsOn: "2026-12-18",
        endsOn: "2027-02-01",
        name: null,
        days: 45,
        share: 1,
      },
    ]);
  });

  it("makes one leg of a season with no checkpoints", () => {
    expect(legsOf({ ...SEASON, checkpoints: [] })).toEqual([
      {
        sector: 1,
        startsOn: "2026-11-02",
        endsOn: "2027-02-01",
        name: null,
        days: 91,
        share: 1,
      },
    ]);
  });
});

describe("where today falls in the season", () => {
  it("puts today on its leg, by its day of the leg and its share of the season", () => {
    expect(placeOf(SEASON, "2026-11-05")).toEqual({
      when: "during",
      share: 3 / 91,
      leg: expect.objectContaining({ sector: 1, name: "Portfolio live" }),
      day: 4,
    });
  });

  it("starts the next leg on a checkpoint's day, and keeps the finish's day on the last leg", () => {
    expect(placeOf(SEASON, "2026-11-12")).toMatchObject({
      leg: { sector: 1 },
      day: 11,
    });
    expect(placeOf(SEASON, "2026-11-13")).toMatchObject({
      leg: { sector: 2 },
      day: 1,
    });
    expect(placeOf(SEASON, "2027-02-01")).toMatchObject({
      when: "during",
      share: 1,
      leg: { sector: 3 },
      day: 46,
    });
  });

  it("holds today at the start before the season, and at the finish after it", () => {
    expect(placeOf(SEASON, "2026-11-01")).toEqual({
      when: "before",
      share: 0,
    });
    expect(placeOf(SEASON, "2027-02-02")).toEqual({ when: "after", share: 1 });
  });
});
