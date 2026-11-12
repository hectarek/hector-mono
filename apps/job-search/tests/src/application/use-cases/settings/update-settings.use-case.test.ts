import { beforeEach, expect, it } from "bun:test";
import { ConflictError, HumanOnlyError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  DEFAULT_SETTINGS,
  type Settings,
  type UpdateSettingsInput,
} from "@/src/entities/models/settings.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

const CLAUDE: ChangeContext = { actor: "agent", ownerId: OWNER };
const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

// Fictional targets.
const TARGETS = {
  messagesSent: 10,
  conversationsHeld: 2,
  applications: 5,
  practiceSessions: 4,
  screensReached: null,
};

// A fictional season, its checkpoints in date order.
const SEASON = {
  start: "2026-11-02",
  finish: "2027-02-01",
  checkpoints: [
    { on: "2026-11-13", name: "Portfolio live" },
    { on: "2026-12-18", name: "Five screens" },
  ],
};

// The settings form's save, against what it read.
const save = (
  read: Settings,
  values: Partial<UpdateSettingsInput> = {},
): UpdateSettingsInput => ({
  targets: TARGETS,
  payFloor: 123_456,
  season: null,
  updatedAt: read.updatedAt,
  ...values,
});

describeEachBackend("updateSettings", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  const settingsHistory = async () =>
    (
      await app.listActivity(OWNER, {
        record: { kind: "settings", id: OWNER },
        limit: 20,
        offset: 0,
      })
    ).entries;

  it("reads the defaults before the first save: no targets, pay floor or season", async () => {
    expect(await app.getSettings(OWNER)).toEqual(DEFAULT_SETTINGS);
  });

  it("stores the targets and pay floor Hector saves, reads them back, and logs each value that changed", async () => {
    const saved = await app.updateSettings(
      HECTOR,
      save(await app.getSettings(OWNER)),
    );

    expect(saved).toEqual({
      targets: TARGETS,
      payFloor: 123_456,
      season: null,
      updatedAt: expect.any(Date),
    });
    expect(await app.getSettings(OWNER)).toEqual(saved);
    expect(await settingsHistory()).toEqual([
      expect.objectContaining({
        actor: "owner",
        record: { kind: "settings", id: OWNER },
        action: "updated",
        changes: [
          { field: "messagesSent", before: null, after: 10 },
          { field: "conversationsHeld", before: null, after: 2 },
          { field: "applications", before: null, after: 5 },
          { field: "practiceSessions", before: null, after: 4 },
          { field: "payFloor", before: null, after: 123_456 },
        ],
      }),
    ]);
  });

  it("saves again against what it read, moving updatedAt on", async () => {
    const first = await app.updateSettings(
      HECTOR,
      save(await app.getSettings(OWNER)),
    );

    const second = await app.updateSettings(
      HECTOR,
      save(first, { targets: { ...TARGETS, screensReached: 1 } }),
    );

    expect(second.targets.screensReached).toBe(1);
    expect(second.updatedAt?.getTime()).toBeGreaterThan(
      first.updatedAt?.getTime() ?? Number.POSITIVE_INFINITY,
    );
    const [latest] = await settingsHistory();
    expect(latest?.changes).toEqual([
      { field: "screensReached", before: null, after: 1 },
    ]);
  });

  // R12 as revised 2026-11-10: the season Today tracks toward.
  it("stores the season Hector saves, reads it back, and logs its start, finish and checkpoints", async () => {
    const saved = await app.updateSettings(
      HECTOR,
      save(await app.getSettings(OWNER), { season: SEASON }),
    );

    expect(saved.season).toEqual(SEASON);
    expect((await app.getSettings(OWNER)).season).toEqual(SEASON);
    const [latest] = await settingsHistory();
    expect(latest?.changes).toEqual(
      expect.arrayContaining([
        { field: "seasonStart", before: null, after: "2026-11-02" },
        { field: "seasonFinish", before: null, after: "2027-02-01" },
        {
          field: "checkpoints",
          before: null,
          after: "2026-11-13 Portfolio live; 2026-12-18 Five screens",
        },
      ]),
    );
  });

  it("clears the season, and logs what it was", async () => {
    const first = await app.updateSettings(
      HECTOR,
      save(await app.getSettings(OWNER), { season: SEASON }),
    );

    const cleared = await app.updateSettings(HECTOR, save(first));

    expect(cleared.season).toBeNull();
    const [latest] = await settingsHistory();
    expect(latest?.changes).toEqual([
      { field: "seasonStart", before: "2026-11-02", after: null },
      { field: "seasonFinish", before: "2027-02-01", after: null },
      {
        field: "checkpoints",
        before: "2026-11-13 Portfolio live; 2026-12-18 Five screens",
        after: null,
      },
    ]);
  });

  // R21: settings are Hector's alone.
  it("refuses Claude with HumanOnlyError, logs the refusal, and stores nothing", async () => {
    await expect(
      app.updateSettings(CLAUDE, save(await app.getSettings(OWNER))),
    ).rejects.toBeInstanceOf(HumanOnlyError);

    expect(await app.getSettings(OWNER)).toEqual(DEFAULT_SETTINGS);
    expect(await settingsHistory()).toEqual([
      expect.objectContaining({
        actor: "agent",
        action: "refused",
        reason: "change-settings",
      }),
    ]);
  });

  // R22: a save against settings that changed since the form read them is caught.
  it("refuses a save made against what was read before another save, with the settings as they are now", async () => {
    const read = await app.getSettings(OWNER);
    const other = await app.updateSettings(HECTOR, save(read));

    const refusal = await app
      .updateSettings(HECTOR, save(read, { payFloor: 654_321 }))
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(ConflictError);
    expect((refusal as ConflictError).current).toEqual(other);
    expect((await app.getSettings(OWNER)).payFloor).toBe(123_456);
  });

  it("writes and logs nothing when nothing changed, the season included", async () => {
    const saved = await app.updateSettings(
      HECTOR,
      save(await app.getSettings(OWNER), { season: SEASON }),
    );

    expect(
      await app.updateSettings(HECTOR, save(saved, { season: SEASON })),
    ).toEqual(saved);
    expect(await settingsHistory()).toHaveLength(1);
  });

  it("keeps each owner's settings apart", async () => {
    await app.updateSettings(
      { actor: "owner", ownerId: ANOTHER_OWNER },
      save(DEFAULT_SETTINGS),
    );

    expect(await app.getSettings(OWNER)).toEqual(DEFAULT_SETTINGS);
  });
});
