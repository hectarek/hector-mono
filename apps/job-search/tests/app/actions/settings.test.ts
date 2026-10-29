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
const current = () => getInjection("IGetSettingsController")(HECTOR);

// The settings form's input: fictional targets, against what was read.
const input = (read: Settings, pendingCap: number) => ({
  targets: {
    messagesSent: 12,
    conversationsHeld: 3,
    applications: 6,
    practiceSessions: 4,
    screensReached: 1,
  },
  pendingCap,
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
    const pendingCap = read.pendingCap === 7 ? 8 : 7;

    const result = await updateSettings(input(read, pendingCap));

    expect(result).toEqual({
      ok: true,
      data: {
        targets: input(read, pendingCap).targets,
        pendingCap,
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
    expect(await updateSettings(input(read, read.pendingCap + 1))).toEqual({
      ok: false,
      code: "human-only",
      message: "Only Hector can do this.",
    });

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
      input(read, read.pendingCap === 5 ? 6 : 5),
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
    expect(await updateSettings(input(await current(), 0))).toEqual({
      ok: false,
      code: "validation",
      message: "Queue cap: At least 1",
      fields: { pendingCap: "At least 1" },
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
