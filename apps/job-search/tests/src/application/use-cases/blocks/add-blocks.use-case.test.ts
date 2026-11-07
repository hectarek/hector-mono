import { beforeEach, expect, it } from "bun:test";
import { InputParseError } from "@/src/entities/errors/common";
import { addBlocksSchema } from "@/src/entities/models/block.model";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { addBlocksController } from "@/src/interface-adapters/controllers/blocks/add-blocks.controller";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE } from "@/tests/_support/jobs";

const BLOCK = {
  startsAt: "2026-11-09T09:30:00-05:00",
  endsAt: "2026-11-09T11:00:00-05:00",
  effort: "networking",
  title: "Messages to the week's list",
  doneWhen: "Five messages are sent.",
};

describeEachBackend("addBlocks", () => {
  let app: TestApp;

  beforeEach(() => {
    app = makeApp();
  });

  const week = async () =>
    (await app.listBlocks(OWNER, { week: "2026-11-09" })).blocks;

  it("adds a week's blocks, each planned on its start's Eastern day and logged as Claude's", async () => {
    const added = await app.addBlocks(
      { ...CLAUDE, tool: "add_blocks" },
      addBlocksSchema.parse({
        blocks: [
          BLOCK,
          {
            ...BLOCK,
            startsAt: "2026-11-15T23:30:00-05:00",
            endsAt: "2026-11-15T23:59:00-05:00",
            effort: "upkeep",
            title: "Plan the week",
          },
        ],
      }),
    );

    expect(added.map(({ day, state }) => ({ day, state }))).toEqual([
      { day: "2026-11-09", state: "planned" },
      { day: "2026-11-15", state: "planned" },
    ]);
    expect(await week()).toEqual(added);
    const history = await app.listActivity(OWNER, {
      record: { kind: "block", id: added[0]?.id ?? "" },
      limit: 20,
      offset: 0,
    });
    expect(history.entries).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: "add_blocks",
        action: "created",
        changes: expect.arrayContaining([
          {
            field: "title",
            before: null,
            after: "Messages to the week's list",
          },
          { field: "state", before: null, after: "planned" },
        ]),
      }),
    ]);
  });

  it("adds none of the blocks when one is refused", async () => {
    const add = addBlocksController(app.addBlocks, new MockLoggerService());

    await expect(
      add(
        {
          blocks: [
            BLOCK,
            {
              ...BLOCK,
              title: "Ends first",
              endsAt: "2026-11-09T09:00:00-05:00",
            },
          ],
        },
        CLAUDE,
      ),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(await week()).toEqual([]);
  });
});
