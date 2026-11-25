import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import {
  ChangedError,
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, sam, priya, jo, ben, mei, dev, noor } = CAST.people;
const {
  saturdayGameNight,
  heavyGamesAtMine,
  halloweenOneShots,
  septemberGameNight,
} = CAST.nights;
const { samsHarborLights } = CAST.copies;
// The kit's today, Tue Nov 10, 2026, in the morning.
const NOW = new Date("2026-11-10T09:30:00-05:00");

describeEachBackend("cancelling and past nights (U21)", () => {
  let app: ReturnType<typeof makeApp>;
  const cancelledNotices = async (userId: string) =>
    (await app.noticesOf(userId))
      .filter((one) => one.type === "night-cancelled")
      .map((one) => [one.gameNightId, one.answerNote, one.createdBy]);
  const pastOf = async (userId: string) =>
    (await app.listPastNights(userId, NOW)).map((one) => [
      one.night.title,
      one.came,
      one.games,
      one.night.cancelledAt !== null,
    ]);
  const isChanged = (err: unknown) =>
    err instanceof ChangedError && err.reason === "night-cancelled";

  beforeEach(async () => {
    setSystemTime(NOW);
    app = makeApp();
    await app.makeCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("tells everyone going, invited or waiting, with the host's note, and nobody else (R34)", async () => {
    // Alice's night: Sam, Jo and Priya going, Ben maybe, and you invited by name.
    await app.cancelNight(saturdayGameNight.id, "I’m sick.", alice.id, NOW);
    for (const person of [sam, jo, priya, you]) {
      expect(await cancelledNotices(person.id)).toEqual([
        [saturdayGameNight.id, "I’m sick.", alice.id],
      ]);
    }
    for (const person of [alice, ben, mei, dev]) {
      expect(await cancelledNotices(person.id)).toEqual([]);
    }
    // Your night: Dev waits for a seat, so Dev is told too.
    await app.cancelNight(heavyGamesAtMine.id, null, you.id, NOW);
    expect(await cancelledNotices(dev.id)).toEqual([
      [heavyGamesAtMine.id, null, you.id],
    ]);
  });

  it("takes a cancelled night off Nights and puts it on Past game nights, newest first (D12)", async () => {
    expect(await pastOf(you.id)).toEqual([
      ["Halloween one-shots", 5, 3, false],
      ["September game night", 4, 2, false],
    ]);
    await app.cancelNight(heavyGamesAtMine.id, null, you.id, NOW);
    expect(
      (await app.listNights(you.id, NOW)).map((card) => card.night.title),
    ).not.toContain("Heavy games at mine");
    for (const person of [you, sam]) {
      expect(await pastOf(person.id)).toEqual([
        ["Heavy games at mine", 6, 4, true],
        ["Halloween one-shots", 5, 3, false],
        ["September game night", 4, 2, false],
      ]);
    }
  });

  it("counts the games on a past night's table, not the copies: Jo's Salt & Signal beside yours is one game (D12)", async () => {
    await app.addGameToNight(
      heavyGamesAtMine.id,
      [CAST.copies.josSaltAndSignal.id],
      jo.id,
    );
    await app.cancelNight(heavyGamesAtMine.id, null, you.id, NOW);
    expect((await pastOf(you.id))[0]).toEqual([
      "Heavy games at mine",
      6,
      4,
      true,
    ]);
  });

  it("lists only the past nights the member could see (KTD4)", async () => {
    // Mei went to none and is friends with neither host; Noor is Sam's friend.
    expect(await pastOf(mei.id)).toEqual([]);
    expect(await pastOf(noor.id)).toEqual([
      ["September game night", 4, 2, false],
    ]);
    expect(
      (await app.listPastNights(jo.id, NOW)).map((one) => one.night.id),
    ).toEqual([halloweenOneShots.id, septemberGameNight.id]);
  });

  it("lets only the host cancel, and only while the night is coming up", async () => {
    await expect(
      app.cancelNight(heavyGamesAtMine.id, null, sam.id, NOW),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    await expect(
      app.cancelNight(heavyGamesAtMine.id, null, alice.id, NOW),
    ).rejects.toBeInstanceOf(NotFoundError);
    await expect(
      app.cancelNight(halloweenOneShots.id, null, jo.id, NOW),
    ).rejects.toBeInstanceOf(InputParseError);
    expect(
      (await app.repos.gameNights.getById(heavyGamesAtMine.id))?.cancelledAt,
    ).toBeNull();
  });

  it("refuses every change to a cancelled night with its changed line (KTD16)", async () => {
    await app.cancelNight(heavyGamesAtMine.id, null, you.id, NOW);
    // One at a time, as a member's taps come.
    const refusals = [
      () => app.cancelNight(heavyGamesAtMine.id, null, you.id, NOW),
      () =>
        app.answerNight(
          heavyGamesAtMine.id,
          { answer: "cant-go", guests: 0 },
          sam.id,
        ),
      () => app.removeFromWaitlist(heavyGamesAtMine.id, dev.id, you.id),
      () => app.inviteToNight(heavyGamesAtMine.id, [alice.id], you.id),
      () => app.makeNightLink(heavyGamesAtMine.id, you.id),
      () =>
        app.updateNight(
          heavyGamesAtMine.id,
          { guestsAllowed: false },
          you.id,
          NOW,
        ),
      () =>
        app.vote(
          heavyGamesAtMine.id,
          { userGameId: samsHarborLights.id, play: true },
          priya.id,
        ),
    ];
    for (const refusal of refusals) {
      const err = await refusal().catch((caught: unknown) => caught);
      expect(isChanged(err)).toBe(true);
    }
  });
});
