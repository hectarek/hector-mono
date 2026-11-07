import { beforeEach, expect, it } from "bun:test";
import { HumanOnlyError, NotFoundError } from "@/src/entities/errors/common";
import { addBlocksSchema, type Block } from "@/src/entities/models/block.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR } from "@/tests/_support/jobs";

describeEachBackend("deleteBlock", () => {
  let app: TestApp;
  let block: Block;

  beforeEach(async () => {
    app = makeApp();
    const [added] = await app.addBlocks(
      HECTOR,
      addBlocksSchema.parse({
        blocks: [
          {
            startsAt: "2026-11-11T13:00:00-05:00",
            endsAt: "2026-11-11T15:00:00-05:00",
            effort: "projects",
            title: "Build the demo",
          },
        ],
      }),
    );
    if (!added) {
      throw new Error("no block added");
    }
    block = added;
  });

  const actionsOn = async () =>
    (
      await app.listActivity(OWNER, {
        record: { kind: "block", id: block.id },
        limit: 20,
        offset: 0,
      })
    ).entries.map(({ action }) => action);

  // R21: deleting anything is Hector's.
  it("refuses Claude's delete with HumanOnlyError, logging the refusal, and takes Hector's", async () => {
    await expect(
      app.deleteBlock(CLAUDE, { id: block.id }),
    ).rejects.toBeInstanceOf(HumanOnlyError);
    expect(await app.getBlock(OWNER, { id: block.id })).toEqual(block);

    expect(await app.deleteBlock(HECTOR, { id: block.id })).toEqual({
      id: block.id,
      day: "2026-11-11",
    });
    await expect(app.getBlock(OWNER, { id: block.id })).rejects.toBeInstanceOf(
      NotFoundError,
    );
    expect(await actionsOn()).toEqual(["deleted", "refused", "created"]);
  });
});
