import { beforeEach, expect, it } from "bun:test";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, sam, jo, ben, priya } = CAST.people;
const { youHaveMossAndMortar, joHasGullAndAnchor } = CAST.loans;
const NIGHT = "00000000-0000-4000-8000-000000000901";
const CANCELLED = "00000000-0000-4000-8000-000000000902";
const TOMORROW = "00000000-0000-4000-8000-000000000903";

// 7:00 in the morning, Eastern time, as the schedule runs.
const at = (day: string) => new Date(`${day}T07:00:00-05:00`);

describeEachBackend("the daily run (U17, KTD8)", () => {
  let app: ReturnType<typeof makeApp>;
  // The reminders about one loan or night, in the order they were written.
  const remindersAbout = async (id: string, userIds: string[]) =>
    (
      await Promise.all(
        userIds.map(async (userId) => await app.noticesOf(userId)),
      )
    )
      .flat()
      .filter(
        (notice) =>
          notice.remindedOn !== null &&
          (notice.loanId ?? notice.gameNightId) === id,
      )
      .map((notice) => [notice.remindedOn, notice.type, notice.userId])
      .sort();

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("AE3: reminds about Moss & Mortar, due Friday, on Wednesday, Friday, Saturday and every three days after, until it's given back", async () => {
    for (const day of [
      "2026-11-10",
      "2026-11-11",
      "2026-11-12",
      "2026-11-13",
      "2026-11-14",
      "2026-11-15",
      "2026-11-16",
      "2026-11-17",
    ]) {
      await app.runDaily(at(day));
    }
    await app.giveBack(
      youHaveMossAndMortar.id,
      "2026-11-18",
      you.id,
      "2026-11-18",
    );
    await app.runDaily(at("2026-11-20"));
    expect(
      await remindersAbout(youHaveMossAndMortar.id, [you.id, sam.id]),
    ).toEqual(
      [
        ["2026-11-11", "due-soon", you.id],
        ["2026-11-13", "due-back-today", sam.id],
        ["2026-11-13", "due-today", you.id],
        ["2026-11-14", "overdue", sam.id],
        ["2026-11-14", "overdue", you.id],
        ["2026-11-17", "overdue", sam.id],
        ["2026-11-17", "overdue", you.id],
      ].sort(),
    );
  });

  it("writes nothing on a second run the same day", async () => {
    const first = await app.runDaily(at("2026-11-13"));
    expect(first.reminders).toBeGreaterThan(0);
    expect(await app.runDaily(at("2026-11-13"))).toEqual({
      reminders: 0,
      closed: 0,
    });
  });

  it("closes a return left 7 days on the day Jo gave, and tells you", async () => {
    await app.giveBack(
      joHasGullAndAnchor.id,
      "2026-11-10",
      jo.id,
      "2026-11-10",
    );
    expect((await app.runDaily(at("2026-11-16"))).closed).toBe(0);
    expect((await app.runDaily(at("2026-11-17"))).closed).toBe(1);
    expect(await app.repos.loans.getById(joHasGullAndAnchor.id)).toMatchObject({
      status: "returned",
      returnedOn: "2026-11-10",
    });
    const closedNotices = (await app.noticesOf(you.id)).filter(
      (notice) => notice.type === "return-closed",
    );
    expect(closedNotices.map((notice) => notice.loanId)).toEqual([
      joHasGullAndAnchor.id,
    ]);
    expect((await app.runDaily(at("2026-11-17"))).closed).toBe(0);
  });

  it("tells everyone going to tonight's night, and nobody for a night cancelled or tomorrow's", async () => {
    await app.addNight({
      id: NIGHT,
      createdBy: sam.id,
      startsAt: new Date("2026-11-10T19:00:00-05:00"),
      list: [
        { userId: sam.id, status: "going" },
        { userId: you.id, status: "going" },
        { userId: jo.id, status: "maybe" },
        { userId: ben.id, status: "invited" },
      ],
    });
    await app.addNight({
      id: CANCELLED,
      createdBy: priya.id,
      startsAt: new Date("2026-11-10T18:00:00-05:00"),
      cancelledAt: new Date("2026-11-09T12:00:00-05:00"),
      list: [{ userId: priya.id, status: "going" }],
    });
    await app.addNight({
      id: TOMORROW,
      createdBy: jo.id,
      startsAt: new Date("2026-11-11T19:00:00-05:00"),
      list: [{ userId: jo.id, status: "going" }],
    });
    await app.runDaily(at("2026-11-10"));
    const people = [sam.id, you.id, jo.id, ben.id, priya.id];
    expect(await remindersAbout(NIGHT, people)).toEqual(
      [
        ["2026-11-10", "night-today", sam.id],
        ["2026-11-10", "night-today", you.id],
      ].sort(),
    );
    expect(await remindersAbout(CANCELLED, people)).toEqual([]);
    expect(await remindersAbout(TOMORROW, people)).toEqual([]);
  });
});
