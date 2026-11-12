import { beforeEach, describe, expect, it } from "bun:test";
import { updateSettings } from "@/app/actions/settings";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import type { Settings } from "@/src/entities/models/settings.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const OWNER_ID = TEST_ACCOUNTS.owner.user.id;
const HECTOR: CurrentActor = { actor: "owner", ownerId: OWNER_ID };

// The test container's settings live for the whole run, so each test reads them first.
const current = () => getInjection("IGetSettingsController")({}, HECTOR);

// The settings form's input: fictional targets, against what was read.
const input = (read: Settings, payFloor: number) => ({
  targets: {
    messagesSent: 12,
    conversationsHeld: 3,
    applications: 6,
    practiceSessions: 4,
    screensReached: 1,
  },
  payFloor,
  seasonStart: null,
  seasonFinish: null,
  checkpoints: [],
  updatedAt: read.updatedAt?.toISOString() ?? null,
});

const latestChange = async () =>
  (
    await getInjection("IListActivityController")(
      { record: { kind: "settings", id: OWNER_ID }, limit: 1 },
      HECTOR,
    )
  ).entries[0];

beforeEach(() => {
  nextState.revalidated = [];
});

describe("updateSettings", () => {
  it("stores the targets Hector saves, reads them back, and refreshes the settings page", async () => {
    signInAs("owner");
    const read = await current();
    const payFloor = read.payFloor === 123_456 ? 654_321 : 123_456;

    const result = await updateSettings(input(read, payFloor));

    expect(result).toEqual({
      ok: true,
      data: {
        targets: input(read, payFloor).targets,
        payFloor,
        season: null,
        updatedAt: expect.any(Date),
      },
      asOf: expect.any(String),
    });
    expect(await current()).toEqual(result.ok ? result.data : read);
    expect(await latestChange()).toMatchObject({
      actor: "owner",
      action: "updated",
    });
    expect(nextState.revalidated).toEqual(["/", "/settings"]);
  });

  // R21: settings are Hector's alone.
  it("refuses Claude with `human-only`, logs the refusal, and stores nothing", async () => {
    const read = await current();

    signInAs("agent");
    expect(await updateSettings(input(read, (read.payFloor ?? 0) + 1))).toEqual(
      {
        ok: false,
        code: "human-only",
        message: "Only Hector can do this.",
      },
    );

    expect(await current()).toEqual(read);
    expect(await latestChange()).toMatchObject({
      actor: "agent",
      action: "refused",
      reason: "change-settings",
    });
    expect(nextState.revalidated).toEqual([]);
  });

  it("answers a save against what was read before another save with `conflict` and the settings as they are now", async () => {
    signInAs("owner");
    const read = await current();
    const saved = await updateSettings(
      input(read, read.payFloor === 111_111 ? 222_222 : 111_111),
    );
    if (!saved.ok) throw new Error(`The first save failed: ${saved.code}`);

    expect(await updateSettings(input(read, 20))).toEqual({
      ok: false,
      code: "conflict",
      message: "This changed since it was read.",
      current: saved.data,
    });
  });

  it("answers values it can't take with `validation`, naming the field", async () => {
    signInAs("owner");
    expect(await updateSettings(input(await current(), -1))).toEqual({
      ok: false,
      code: "validation",
      message: "Pay floor: At least 0",
      fields: { payFloor: "At least 0" },
    });
  });

  // R12 as revised 2026-11-10: the season's checks name the field they're about.
  it("answers a season that finishes before it starts with `validation`, under the finish", async () => {
    signInAs("owner");
    const read = await current();
    expect(
      await updateSettings({
        ...input(read, 1),
        seasonStart: "2026-11-02",
        seasonFinish: "2026-11-01",
      }),
    ).toEqual({
      ok: false,
      code: "validation",
      message: "Season finish: After the season's start",
      fields: { seasonFinish: "After the season's start" },
    });
  });

  it("answers a session the app can't act for with its code", async () => {
    const read = await current();
    signInAs("stranger");
    expect(await updateSettings(input(read, 9))).toMatchObject({
      ok: false,
      code: "not-allowed",
    });
  });
});
