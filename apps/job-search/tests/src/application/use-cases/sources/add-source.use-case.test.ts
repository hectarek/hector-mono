import { beforeEach, expect, it } from "bun:test";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { addSourceSchema } from "@/src/entities/models/lead-source.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

const CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: OWNER,
  tool: "add_source",
};
const HECTOR: ChangeContext = { actor: "owner", ownerId: OWNER };

// add_source's input as its controller reads it.
const named = (name: string) => addSourceSchema.parse({ name });

describeEachBackend("addSource", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  const sourceHistory = async () =>
    (
      await app.listActivity(OWNER, {
        record: { kind: "lead-source" },
        limit: 20,
        offset: 0,
      })
    ).entries;

  it("adds a source, logged as made by whoever added it", async () => {
    const added = await app.addSource(CLAUDE, named("Widget Jobs"));

    expect(added).toEqual({
      source: { id: expect.any(String), name: "Widget Jobs" },
      created: true,
    });
    expect(await app.listSources(OWNER)).toEqual([added.source]);
    expect(await sourceHistory()).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "add_source",
        record: { kind: "lead-source", id: added.source.id },
        action: "created",
        changes: [{ field: "name", before: null, after: "Widget Jobs" }],
      }),
    ]);
  });

  it("answers with the source already listed under the name in any case, adding and logging nothing", async () => {
    const listed = await app.addSource(HECTOR, named("Widget Jobs"));

    expect(await app.addSource(CLAUDE, named("widget  jobs"))).toEqual({
      source: listed.source,
      created: false,
    });
    expect(await app.listSources(OWNER)).toEqual([listed.source]);
    expect(await sourceHistory()).toHaveLength(1);
  });

  it("keeps each owner's sources apart", async () => {
    const theirs = await app.addSource(
      { actor: "owner", ownerId: ANOTHER_OWNER },
      named("Widget Jobs"),
    );

    const mine = await app.addSource(HECTOR, named("Widget Jobs"));
    expect(mine.created).toBe(true);
    expect(mine.source.id).not.toBe(theirs.source.id);
    expect(await app.listSources(OWNER)).toEqual([mine.source]);
  });

  it("lists the owner's sources by name, case ignored", async () => {
    for (const name of ["referral", "Widget Jobs", "Gadget Board"]) {
      await app.addSource(HECTOR, named(name));
    }

    expect((await app.listSources(OWNER)).map((source) => source.name)).toEqual(
      ["Gadget Board", "referral", "Widget Jobs"],
    );
  });
});
