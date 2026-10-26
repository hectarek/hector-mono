import { beforeEach, describe, expect, it } from "bun:test";
import type { ActionResult } from "@/app/actions/shared";
import { addSource } from "@/app/actions/sources";
import { getInjection } from "@/di/container";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { TEST_ACCOUNTS } from "@/src/infrastructure/services/mock-auth.service";
import { nextState } from "@/tests/_support/next";
import { signInAs } from "@/tests/_support/session";

const HECTOR: CurrentActor = {
  actor: "owner",
  ownerId: TEST_ACCOUNTS.owner.user.id,
};

// The test container's sources live for the whole run, so each test names its own.
const fictional = (name: string) =>
  `${name} ${crypto.randomUUID().slice(0, 8)}`;

function dataOf<T>(result: ActionResult<T>): T {
  if (!result.ok) {
    throw new Error(`Expected a success, got ${result.code}`);
  }
  return result.data;
}

const historyOf = async (id: string) =>
  (
    await getInjection("IListActivityController")(
      { record: { kind: "lead-source", id } },
      HECTOR,
    )
  ).entries;

beforeEach(() => {
  nextState.revalidated = [];
});

describe("addSource", () => {
  it("adds Claude's source, logged as Claude's through the tool, and refreshes the pages that list it", async () => {
    signInAs("agent");
    const name = fictional("Widget Jobs");

    const added = dataOf(await addSource({ name }, "add_source"));

    expect(added).toEqual({
      source: { id: expect.any(String), name },
      created: true,
    });
    expect(await historyOf(added.source.id)).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "add_source",
        action: "created",
      }),
    ]);
    expect(nextState.revalidated).toEqual(["/settings", "/agent"]);
  });

  it("answers with the source already listed under the name in any case, and changes nothing", async () => {
    signInAs("owner");
    const name = fictional("Widget Jobs");
    const listed = dataOf(await addSource({ name }));
    nextState.revalidated = [];

    signInAs("agent");
    expect(
      dataOf(await addSource({ name: name.toLowerCase() }, "add_source")),
    ).toEqual({ source: listed.source, created: false });
    expect(await historyOf(listed.source.id)).toHaveLength(1);
    expect(nextState.revalidated).toEqual([]);
  });

  it("answers a blank name with `validation`", async () => {
    signInAs("owner");
    expect(await addSource({ name: "  " })).toEqual({
      ok: false,
      code: "validation",
      message: "A source needs a name",
      fields: { name: "A source needs a name" },
    });
  });

  it("answers a session the app can't act for with its code", async () => {
    signInAs("stranger");
    expect(await addSource({ name: "Widget Jobs" })).toMatchObject({
      ok: false,
      code: "not-allowed",
    });
    signInAs("signed-out");
    expect(await addSource({ name: "Widget Jobs" })).toMatchObject({
      ok: false,
      code: "unauthenticated",
    });
  });
});
