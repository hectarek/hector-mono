import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import { NotFoundError } from "@/src/entities/errors/common";
import { addBlocksSchema } from "@/src/entities/models/block.model";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";
import { HECTOR } from "@/tests/_support/jobs";

// 11:30 pm Eastern on Sunday, Nov 15: already Monday on the server's UTC clock.
const LATE_SUNDAY = new Date("2026-11-16T04:30:00Z");

const at = (day: string, time: string) => `${day}T${time}:00-05:00`;

describeEachBackend("listBlocks", () => {
  let app: TestApp;

  beforeEach(() => {
    setSystemTime(LATE_SUNDAY);
    app = makeApp();
  });

  afterEach(() => {
    setSystemTime();
  });

  const add = (
    ownerId: string,
    blocks: {
      day: string;
      time: string;
      title: string;
      effort?: string;
      state?: string;
    }[],
  ) =>
    app.addBlocks(
      { ...HECTOR, ownerId },
      addBlocksSchema.parse({
        blocks: blocks.map(({ day, time, title, effort, state }) => ({
          startsAt: at(day, time),
          endsAt: at(day, "23:59"),
          effort: effort ?? "practice",
          title,
          state,
        })),
      }),
    );

  it("lists this week in Eastern time by default, by start, its late Sunday block included", async () => {
    await add(OWNER, [
      {
        day: "2026-11-15",
        time: "23:30",
        title: "Plan the week",
        effort: "upkeep",
      },
      { day: "2026-11-10", time: "14:00", title: "B session" },
      { day: "2026-11-10", time: "09:30", title: "Morning session" },
      { day: "2026-11-10", time: "14:00", title: "A session" },
      { day: "2026-11-16", time: "09:30", title: "Next week" },
      { day: "2026-11-08", time: "09:30", title: "Last week" },
    ]);

    const week = await app.listBlocks(OWNER, {});

    expect(week.monday).toBe("2026-11-09");
    expect(week.blocks.map(({ title }) => title)).toEqual([
      "Morning session",
      "A session",
      "B session",
      "Plan the week",
    ]);
  });

  it("lists the week holding the day given, with each effort's counts", async () => {
    await add(OWNER, [
      { day: "2026-11-16", time: "09:30", title: "Done", state: "done" },
      { day: "2026-11-17", time: "09:30", title: "Partly", state: "partial" },
      { day: "2026-11-18", time: "09:30", title: "Moved", state: "moved" },
      {
        day: "2026-11-19",
        time: "09:30",
        title: "Messages",
        effort: "networking",
      },
    ]);

    const week = await app.listBlocks(OWNER, { week: "2026-11-19" });

    expect(week.monday).toBe("2026-11-16");
    expect(week.blocks).toHaveLength(4);
    expect(week.efforts).toEqual([
      { effort: "networking", done: 0, partial: 0, planned: 1 },
      { effort: "practice", done: 1, partial: 1, planned: 2 },
    ]);
  });

  it("keeps another owner's blocks out of the list and the reads", async () => {
    const [theirs] = await add(ANOTHER_OWNER, [
      { day: "2026-11-10", time: "09:30", title: "Theirs" },
    ]);

    expect((await app.listBlocks(OWNER, {})).blocks).toEqual([]);
    await expect(
      app.getBlock(OWNER, { id: theirs?.id ?? "" }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
