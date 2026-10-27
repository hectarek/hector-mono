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

// The settings form's save, against what it read.
const save = (
  read: Settings,
  values: Partial<UpdateSettingsInput> = {},
): UpdateSettingsInput => ({
  targets: TARGETS,
  pendingCap: 8,
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

  it("reads the defaults before the first save: no targets, and a queue of 10", async () => {
    expect(await app.getSettings(OWNER)).toEqual(DEFAULT_SETTINGS);
  });

  it("stores the targets and cap Hector saves, reads them back, and logs each value that changed", async () => {
    const saved = await app.updateSettings(
      HECTOR,
      save(await app.getSettings(OWNER)),
    );

    expect(saved).toEqual({
      targets: TARGETS,
      pendingCap: 8,
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
          { field: "pendingCap", before: 10, after: 8 },
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
      .updateSettings(HECTOR, save(read, { pendingCap: 20 }))
      .catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(ConflictError);
    expect((refusal as ConflictError).current).toEqual(other);
    expect((await app.getSettings(OWNER)).pendingCap).toBe(8);
  });

  it("writes and logs nothing when nothing changed", async () => {
    const saved = await app.updateSettings(
      HECTOR,
      save(await app.getSettings(OWNER)),
    );

    expect(await app.updateSettings(HECTOR, save(saved))).toEqual(saved);
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
