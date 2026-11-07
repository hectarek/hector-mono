import { beforeEach, expect, it } from "bun:test";
import { ConflictError, InputParseError } from "@/src/entities/errors/common";
import {
  addBlocksSchema,
  type Block,
  updateBlockSchema,
} from "@/src/entities/models/block.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { CLAUDE, HECTOR } from "@/tests/_support/jobs";

describeEachBackend("updateBlock", () => {
  let app: TestApp;
  let block: Block;

  beforeEach(async () => {
    app = makeApp();
    const [added] = await app.addBlocks(
      CLAUDE,
      addBlocksSchema.parse({
        blocks: [
          {
            startsAt: "2026-11-09T09:30:00-05:00",
            endsAt: "2026-11-09T11:00:00-05:00",
            effort: "applying",
            title: "Two applications",
            doneWhen: "Both are sent.",
          },
        ],
      }),
    );
    if (!added) {
      throw new Error("no block added");
    }
    block = added;
  });

  const update = (input: Record<string, unknown>) =>
    app.updateBlock(HECTOR, updateBlockSchema.parse(input));

  const changesTo = async () =>
    (
      await app.listActivity(OWNER, {
        record: { kind: "block", id: block.id },
        limit: 20,
        offset: 0,
      })
    ).entries.map(({ action, changes }) => ({ action, changes }));

  it("sets how it went and what happened, logging one change with both", async () => {
    const updated = await update({
      id: block.id,
      updatedAt: block.updatedAt.toISOString(),
      state: "partial",
      whatHappened: "One sent; the other needs a referral first.",
    });

    expect(updated).toMatchObject({
      state: "partial",
      whatHappened: "One sent; the other needs a referral first.",
    });
    expect((await changesTo())[0]).toEqual({
      action: "updated",
      changes: [
        { field: "state", before: "planned", after: "partial" },
        {
          field: "whatHappened",
          before: null,
          after: "One sent; the other needs a referral first.",
        },
      ],
    });
  });

  it("writes and logs nothing when the change sets what's already there", async () => {
    const same = await update({
      id: block.id,
      updatedAt: block.updatedAt.toISOString(),
      state: "planned",
      startsAt: "2026-11-09T09:30:00-05:00",
    });

    expect(same.updatedAt).toEqual(block.updatedAt);
    expect(await changesTo()).toHaveLength(1);
  });

  it("refuses a change made against an old updatedAt, with the block as it is now", async () => {
    const done = await update({
      id: block.id,
      updatedAt: block.updatedAt.toISOString(),
      state: "done",
    });

    const refusal = await update({
      id: block.id,
      updatedAt: block.updatedAt.toISOString(),
      state: "skipped",
    }).catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(ConflictError);
    expect((refusal as ConflictError).current).toEqual(done);
  });

  it("moves a rescheduled block to its new start's day", async () => {
    const moved = await update({
      id: block.id,
      updatedAt: block.updatedAt.toISOString(),
      startsAt: "2026-11-10T13:00:00-05:00",
      endsAt: "2026-11-10T14:30:00-05:00",
    });

    expect(moved.day).toBe("2026-11-10");
    expect(
      (await app.listBlocks(OWNER, { week: "2026-11-09" })).blocks.map(
        ({ day }) => day,
      ),
    ).toEqual(["2026-11-10"]);
  });

  it("refuses a change that would end the block before it starts, naming its end", async () => {
    const refusal = await update({
      id: block.id,
      updatedAt: block.updatedAt.toISOString(),
      startsAt: "2026-11-09T12:00:00-05:00",
    }).catch((err: unknown) => err);

    expect(refusal).toBeInstanceOf(InputParseError);
    expect(
      ((refusal as InputParseError).cause as { issues: { path: string[] }[] })
        .issues[0]?.path,
    ).toEqual(["endsAt"]);
    expect(await changesTo()).toHaveLength(1);
  });
});
