import { describe, expect, it } from "bun:test";
import {
  addBlocksSchema,
  type Block,
  blockDay,
  effortCounts,
} from "@/src/entities/models/block.model";

const BLOCK = {
  startsAt: "2026-11-09T09:30:00-05:00",
  endsAt: "2026-11-09T11:00:00-05:00",
  effort: "networking",
  title: "Messages to the week's list",
  doneWhen: "Five messages are sent.",
};

describe("blockDay", () => {
  // KTD18: the server runs in UTC, where this start is already Monday.
  it("puts a block that starts at 11:30 pm Eastern on a Sunday on that Sunday", () => {
    expect(blockDay(new Date("2026-11-15T23:30:00-05:00"))).toBe("2026-11-15");
  });

  it("reads the day in Eastern time on both sides of the change to standard time", () => {
    expect(blockDay(new Date("2026-10-31T23:30:00-04:00"))).toBe("2026-10-31");
    expect(blockDay(new Date("2026-11-01T23:30:00-05:00"))).toBe("2026-11-01");
  });
});

describe("addBlocksSchema", () => {
  it("plans a block given no state, with no done-when line or what happened when none is given", () => {
    const { blocks } = addBlocksSchema.parse({
      blocks: [{ ...BLOCK, doneWhen: undefined }],
    });

    expect(blocks).toEqual([
      {
        startsAt: new Date("2026-11-09T14:30:00Z"),
        endsAt: new Date("2026-11-09T16:00:00Z"),
        effort: "networking",
        title: "Messages to the week's list",
        doneWhen: null,
        state: "planned",
        whatHappened: null,
      },
    ]);
  });

  it("takes a block added after the fact, already done", () => {
    const { blocks } = addBlocksSchema.parse({
      blocks: [{ ...BLOCK, state: "done", whatHappened: "Sent six." }],
    });

    expect(blocks[0]).toMatchObject({
      state: "done",
      whatHappened: "Sent six.",
    });
  });

  it("refuses the whole call when one block ends before it starts, naming its end", () => {
    const result = addBlocksSchema.safeParse({
      blocks: [BLOCK, { ...BLOCK, endsAt: "2026-11-09T09:00:00-05:00" }],
    });

    expect(result.success).toBe(false);
    expect(result.error?.issues).toEqual([
      expect.objectContaining({
        path: ["blocks", 1, "endsAt"],
        message: "A block ends after it starts",
      }),
    ]);
  });

  it("refuses an effort or a state outside the lists", () => {
    expect(
      addBlocksSchema.safeParse({ blocks: [{ ...BLOCK, effort: "errands" }] })
        .success,
    ).toBe(false);
    expect(
      addBlocksSchema.safeParse({ blocks: [{ ...BLOCK, state: "half-done" }] })
        .success,
    ).toBe(false);
  });

  it("takes one block to 40 at once", () => {
    expect(addBlocksSchema.safeParse({ blocks: [] }).success).toBe(false);
    expect(
      addBlocksSchema.safeParse({ blocks: Array(40).fill(BLOCK) }).success,
    ).toBe(true);
    expect(
      addBlocksSchema.safeParse({ blocks: Array(41).fill(BLOCK) }).success,
    ).toBe(false);
  });
});

describe("effortCounts", () => {
  const block = (effort: Block["effort"], state: Block["state"]): Block => ({
    id: crypto.randomUUID(),
    day: "2026-11-09",
    startsAt: new Date("2026-11-09T14:30:00Z"),
    endsAt: new Date("2026-11-09T16:00:00Z"),
    effort,
    title: "A block",
    doneWhen: null,
    state,
    whatHappened: null,
    updatedAt: new Date(),
  });

  it("counts each effort's blocks done, partly done and planned, in the efforts' order, leaving moved ones out", () => {
    expect(
      effortCounts([
        block("practice", "done"),
        block("networking", "done"),
        block("networking", "partial"),
        block("networking", "skipped"),
        block("networking", "planned"),
        block("networking", "moved"),
        block("projects", "moved"),
      ]),
    ).toEqual([
      { effort: "networking", done: 1, partial: 1, planned: 4 },
      { effort: "practice", done: 1, partial: 0, planned: 1 },
    ]);
  });
});
