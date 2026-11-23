import { beforeEach, expect, it } from "bun:test";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, dev, noor } = CAST.people;
const {
  saturdayGameNight,
  heavyGamesAtMine,
  bensBirthdayGames,
  halloweenOneShots,
  septemberGameNight,
} = CAST.nights;
const { yourNightMarket, yourSaltAndSignal } = CAST.copies;
// Someone with no account in the cast, who's nobody's friend.
const STRANGER = "00000000-0000-4000-8000-000000000999";
const ids = (found: { id: string }[]) => found.map(({ id }) => id);
const SEPTEMBER = new Date("2026-09-01T00:00:00-04:00");

describeEachBackend("IGameNightsRepository", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("lists the nights a member can see, soonest first: their own, the ones they're on, and their friends' for friends", async () => {
    const visible = (userId: string) =>
      app.repos.gameNights.listVisibleFrom(userId, SEPTEMBER);
    expect(ids(await visible(you.id))).toEqual([
      septemberGameNight.id,
      halloweenOneShots.id,
      saturdayGameNight.id,
      heavyGamesAtMine.id,
      bensBirthdayGames.id,
    ]);
    // Alice isn't on your private night's list.
    expect(ids(await visible(alice.id))).not.toContain(heavyGamesAtMine.id);
    // Dev is on its list, and isn't your friend.
    expect(ids(await visible(dev.id))).toContain(heavyGamesAtMine.id);
    // Noor is only Sam's friend: she sees his September night and nothing else.
    expect(ids(await visible(noor.id))).toEqual([septemberGameNight.id]);
    expect(await visible(STRANGER)).toEqual([]);
  });

  it("leaves out a night before `from` and a cancelled one", async () => {
    expect(
      ids(
        await app.repos.gameNights.listVisibleFrom(
          you.id,
          new Date("2026-11-15T00:00:00-05:00"),
        ),
      ),
    ).toEqual([heavyGamesAtMine.id, bensBirthdayGames.id]);
  });

  it("reads a night's list in the order its people joined, and its table in the order games went on it", async () => {
    const list = await app.repos.gameNights.listAttendees([
      heavyGamesAtMine.id,
    ]);
    expect(list.map((one) => [one.userId, one.status, one.guestCount])).toEqual(
      [
        [you.id, "going", 0],
        [CAST.people.sam.id, "going", 0],
        [CAST.people.priya.id, "going", 0],
        [CAST.people.jo.id, "going", 0],
        [CAST.people.ben.id, "going", 1],
        [dev.id, "waitlisted", 0],
      ],
    );
    expect(
      await app.repos.gameNights.getAttendee(heavyGamesAtMine.id, alice.id),
    ).toBeUndefined();
  });

  it("makes a night with its host and games, keeping the games in the order given and each once", async () => {
    const night = await app.repos.transactions.startTransaction(async (tx) => {
      const made = await app.repos.gameNights.create(
        {
          createdBy: you.id,
          title: "Quiet night in",
          startsAt: new Date("2026-11-27T19:00:00-05:00"),
          endsAt: null,
          place: "Robin’s place",
          address: null,
          hostNote: null,
          capacity: 4,
          audience: "friends",
          attendeesCanInvite: false,
          guestsAllowed: false,
        },
        tx,
      );
      await app.repos.gameNights.addAttendee(
        { gameNightId: made.id, userId: you.id, status: "going" },
        tx,
      );
      await app.repos.gameNights.addGames(
        made.id,
        [yourSaltAndSignal.id, yourNightMarket.id],
        tx,
      );
      await app.repos.gameNights.addGames(made.id, [yourSaltAndSignal.id], tx);
      return made;
    });
    expect(night).toMatchObject({ linkToken: null, cancelledAt: null });
    expect(
      (await app.repos.gameNights.listGames([night.id])).map(
        (one) => one.userGameId,
      ),
    ).toEqual([yourSaltAndSignal.id, yourNightMarket.id]);
  });

  it("refuses a night with no seats, an end before its start, and a second row for one person", async () => {
    const bad = {
      createdBy: you.id,
      title: "Never",
      startsAt: new Date("2026-11-27T19:00:00-05:00"),
      endsAt: null,
      place: "Nowhere",
      address: null,
      hostNote: null,
      capacity: 4,
      audience: "friends",
      attendeesCanInvite: false,
      guestsAllowed: false,
    } as const;
    const write = (fn: (tx: ITransaction) => Promise<unknown>) =>
      app.repos.transactions.startTransaction(fn);
    await expect(
      write((tx) => app.repos.gameNights.create({ ...bad, capacity: 0 }, tx)),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
    await expect(
      write((tx) =>
        app.repos.gameNights.create(
          { ...bad, endsAt: new Date("2026-11-27T18:00:00-05:00") },
          tx,
        ),
      ),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
    await expect(
      write((tx) =>
        app.repos.gameNights.addAttendee(
          { gameNightId: heavyGamesAtMine.id, userId: you.id, status: "going" },
          tx,
        ),
      ),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });
});
