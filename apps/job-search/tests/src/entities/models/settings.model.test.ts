import { describe, expect, it } from "bun:test";
import { updateSettingsSchema } from "@/src/entities/models/settings.model";

// The settings form's input with no targets, pay floor or season, and the season's fields given.
const input = (season: {
  seasonStart?: string | null;
  seasonFinish?: string | null;
  checkpoints?: { on: string; name: string }[];
}) => ({
  targets: {
    messagesSent: null,
    conversationsHeld: null,
    applications: null,
    practiceSessions: null,
    screensReached: null,
  },
  payFloor: null,
  seasonStart: null,
  seasonFinish: null,
  checkpoints: [],
  updatedAt: null,
  ...season,
});

// Each issue's field and message.
const issuesOf = (value: unknown) => {
  const parsed = updateSettingsSchema.safeParse(value);
  return parsed.success
    ? []
    : parsed.error.issues.map(({ path, message }) => [path.join("."), message]);
};

const SEASON = { seasonStart: "2026-11-02", seasonFinish: "2027-02-01" };

describe("the settings form's season (R12 as revised 2026-11-10)", () => {
  it("reads no season from a blank start and finish", () => {
    expect(updateSettingsSchema.parse(input({})).season).toBeNull();
  });

  it("makes one season of the start, the finish and the checkpoints, named as typed and in date order", () => {
    expect(
      updateSettingsSchema.parse(
        input({
          ...SEASON,
          checkpoints: [
            { on: "2026-12-18", name: " Five screens " },
            { on: "2026-11-13", name: "Portfolio live" },
          ],
        }),
      ).season,
    ).toEqual({
      start: "2026-11-02",
      finish: "2027-02-01",
      checkpoints: [
        { on: "2026-11-13", name: "Portfolio live" },
        { on: "2026-12-18", name: "Five screens" },
      ],
    });
  });

  it("takes a start and a finish only together, the finish after the start", () => {
    expect(issuesOf(input({ seasonStart: "2026-11-02" }))).toEqual([
      ["seasonFinish", "Needed with the season's start"],
    ]);
    expect(issuesOf(input({ seasonFinish: "2027-02-01" }))).toEqual([
      ["seasonStart", "Needed with the season's finish"],
    ]);
    expect(
      issuesOf(
        input({ seasonStart: "2026-11-02", seasonFinish: "2026-11-02" }),
      ),
    ).toEqual([["seasonFinish", "After the season's start"]]);
  });

  it("takes checkpoints only in a season, each named, between its start and finish, on days of their own", () => {
    expect(
      issuesOf(input({ checkpoints: [{ on: "2026-11-13", name: "Live" }] })),
    ).toEqual([
      ["checkpoints", "Checkpoints need the season's start and finish"],
    ]);
    expect(
      issuesOf(
        input({
          ...SEASON,
          checkpoints: [
            { on: "2026-11-13", name: "  " },
            { on: "2027-02-01", name: "Too late" },
            { on: "someday", name: "No date" },
          ],
        }),
      ),
    ).toEqual([
      ["checkpoints", "Checkpoint 1 needs a short name"],
      [
        "checkpoints",
        "Checkpoint 2 needs a date between the season's start and finish",
      ],
      ["checkpoints", "Checkpoint 3 needs a date like 2026-12-01"],
    ]);
    expect(
      issuesOf(
        input({
          ...SEASON,
          checkpoints: [
            { on: "2026-11-13", name: "One" },
            { on: "2026-11-13", name: "Two" },
          ],
        }),
      ),
    ).toEqual([["checkpoints", "Checkpoints need days of their own"]]);
  });

  // The form sends all its rows, so a check names a checkpoint by the row it's typed in.
  it("leaves blank rows out, and names a checkpoint by its row", () => {
    const blank = { on: "", name: " " };
    expect(
      updateSettingsSchema.parse(
        input({
          ...SEASON,
          checkpoints: [blank, { on: "2026-11-13", name: "Live" }, blank],
        }),
      ).season?.checkpoints,
    ).toEqual([{ on: "2026-11-13", name: "Live" }]);
    expect(
      issuesOf(
        input({
          ...SEASON,
          checkpoints: [blank, blank, { on: "2026-11-13", name: "" }],
        }),
      ),
    ).toEqual([["checkpoints", "Checkpoint 3 needs a short name"]]);
    expect(
      updateSettingsSchema.parse(input({ checkpoints: [blank, blank, blank] }))
        .season,
    ).toBeNull();
  });

  it("takes at most three checkpoints, each name at most 40 characters", () => {
    const checkpoint = (on: string) => ({ on, name: "A checkpoint" });
    expect(
      issuesOf(
        input({
          ...SEASON,
          checkpoints: [
            checkpoint("2026-11-10"),
            checkpoint("2026-11-20"),
            checkpoint("2026-11-30"),
            checkpoint("2026-12-10"),
          ],
        }),
      ),
    ).toEqual([["checkpoints", "At most 3 checkpoints"]]);
    expect(
      issuesOf(
        input({
          ...SEASON,
          checkpoints: [{ on: "2026-11-13", name: "x".repeat(41) }],
        }),
      ),
    ).toEqual([
      ["checkpoints", "Checkpoint 1's name takes at most 40 characters"],
    ]);
  });
});
