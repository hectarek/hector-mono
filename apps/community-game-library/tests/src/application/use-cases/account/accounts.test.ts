import { afterEach, beforeEach, expect, it, setSystemTime } from "bun:test";
import {
  ChangedError,
  InputParseError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST, CAST_TODAY } from "@/tests/_support/cast";

const { you, alice, sam, priya, jo, ben, dev } = CAST.people;
const { heavyGamesAtMine, saturdayGameNight } = CAST.nights;
const {
  benHasAlicesHarborLights,
  benHasFenwickFair,
  priyaAskedForNightMarket,
  priyaHadGullAndAnchor,
} = CAST.loans;
// The kit's today, Tue Nov 10, 2026, in the morning.
const NOW = new Date("2026-11-10T09:30:00-05:00");

describeEachBackend("deleting an account and the admin's removal (U22)", () => {
  let app: ReturnType<typeof makeApp>;
  // A game that's out comes back to its owner, which settles its loan.
  const takeBack = (loanId: string, ownerId: string) =>
    app.confirmReturn(
      loanId,
      { answer: "back", returnedOn: CAST_TODAY, note: null },
      ownerId,
      CAST_TODAY,
    );
  const isLoanOpen = (err: unknown) =>
    err instanceof ChangedError && err.reason === "loan-open";

  beforeEach(async () => {
    setSystemTime(NOW);
    app = makeApp();
    await app.makeCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  it("lists what deleting ends (E8): the loans to settle, the night, the requests and places in line, and the games", async () => {
    const ends = await app.listWhatEnds(you.id, NOW);
    // The game you have first, then the one Jo has.
    expect(
      ends.settleFirst.map((one) => [one.game.title, one.holder.name]),
    ).toEqual([
      ["Moss & Mortar", you.name],
      ["Gull & Anchor", jo.name],
    ]);
    expect(ends.nights.map((night) => night.title)).toEqual([
      "Heavy games at mine",
    ]);
    expect(
      ends.yourRequests.map((one) => [one.game.title, one.inLine]),
    ).toEqual([
      ["Quarry Lane", false],
      ["Fenwick Fair", true],
    ]);
    expect(
      ends.requestsForYours.map((one) => [
        one.by.name,
        one.game.title,
        one.inLine,
      ]),
    ).toEqual([
      [priya.name, "Night Market", false],
      [ben.name, "Gull & Anchor", true],
    ]);
    expect(ends.games).toBe(4);
  });

  it("refuses while a game of theirs is out, and changes nothing (R41)", async () => {
    const refused = await app
      .deleteAccount(you.id, NOW)
      .catch((err: unknown) => err);
    expect(isLoanOpen(refused)).toBe(true);
    expect(await app.repos.userProfiles.getByUserId(you.id)).toBeDefined();
    expect(
      (await app.repos.gameNights.getById(heavyGamesAtMine.id))?.cancelledAt,
    ).toBeNull();
    expect(await app.anonymizedSignIns()).toEqual([]);
  });

  it("deletes what goes with an account once its loans are settled, and keeps what stays (Priya)", async () => {
    await takeBack(benHasFenwickFair.id, priya.id);
    const yourNotices = (await app.noticesOf(you.id)).length;
    await app.deleteAccount(priya.id, NOW);

    expect(await app.repos.userProfiles.getByUserId(priya.id)).toBeUndefined();
    expect(await app.repos.userSettings.getByUserId(priya.id)).toBeUndefined();
    expect(await app.repos.friendLinks.getByUserId(priya.id)).toBeUndefined();
    expect(await app.repos.friendships.listFriendIds(priya.id)).toEqual([]);
    expect(await app.repos.friendships.areFriends(you.id, priya.id)).toBe(
      false,
    );
    expect(await app.repos.userGames.listOwn(priya.id)).toEqual([]);
    expect(await app.noticesOf(priya.id)).toEqual([]);
    for (const night of [heavyGamesAtMine, saturdayGameNight]) {
      expect(
        await app.repos.gameNights.getAttendee(night.id, priya.id),
      ).toBeUndefined();
    }
    expect(
      (await app.repos.gameNights.listVotes([saturdayGameNight.id])).filter(
        (vote) => vote.userId === priya.id,
      ),
    ).toEqual([]);
    // Her request for your Night Market ends, and nobody is told.
    expect(
      (await app.repos.loans.getById(priyaAskedForNightMarket.id))?.status,
    ).toBe("withdrawn");
    expect((await app.noticesOf(you.id)).length).toBe(yourNotices);
    // Her seat at your night goes to Dev, first on its waitlist, who is told (R31).
    expect(
      (await app.repos.gameNights.getAttendee(heavyGamesAtMine.id, dev.id))
        ?.status,
    ).toBe("going");
    expect(
      (await app.noticesOf(dev.id)).map((one) => [one.type, one.gameNightId]),
    ).toContainEqual(["waitlist-seat", heavyGamesAtMine.id]);
    // Kept: her past loan of your Gull & Anchor, as A former member, on Past loans and on the
    // copy's page.
    const { lent } = await app.listPastLoans(you.id);
    expect(
      lent
        .filter((one) => one.loan.id === priyaHadGullAndAnchor.id)
        .map((one) => one.other.name),
    ).toEqual(["A former member"]);
    const copy = await app.getUserGame(
      CAST.copies.yourGullAndAnchor.id,
      you.id,
      CAST_TODAY,
    );
    expect(copy.people[priya.id]?.name).toBe("A former member");
    // Her sign-in is anonymized with them.
    expect(await app.anonymizedSignIns()).toEqual([priya.id]);
  });

  it("cancels the nights the member hosts, and tells everyone going, invited or waiting (Alice)", async () => {
    await takeBack(benHasAlicesHarborLights.id, alice.id);
    await app.deleteAccount(alice.id, NOW);

    expect(
      (await app.repos.gameNights.getById(saturdayGameNight.id))?.cancelledAt,
    ).not.toBeNull();
    for (const person of [sam, jo, priya, you]) {
      expect(
        (await app.noticesOf(person.id))
          .filter((one) => one.type === "night-cancelled")
          .map((one) => [one.gameNightId, one.createdBy]),
      ).toEqual([[saturdayGameNight.id, alice.id]]);
    }
    // Ben said maybe, so he isn't told.
    expect(
      (await app.noticesOf(ben.id)).filter(
        (one) => one.type === "night-cancelled",
      ),
    ).toEqual([]);
    // The night leaves Nights, and Past game nights and its page show its host as A former
    // member.
    expect(
      (await app.listNights(sam.id, NOW)).map((card) => card.night.title),
    ).not.toContain("Saturday game night");
    expect(
      (await app.listPastNights(sam.id, NOW))
        .filter((one) => one.night.id === saturdayGameNight.id)
        .map((one) => [one.host.name, one.night.cancelledAt !== null]),
    ).toEqual([["A former member", true]]);
    expect((await app.getNight(saturdayGameNight.id, sam.id)).host.name).toBe(
      "A former member",
    );
  });

  it("lets the admin remove an account the same way, which then sees only /removed (G8)", async () => {
    await takeBack(benHasAlicesHarborLights.id, alice.id);
    expect(await app.removeAccount(alice.id, you.id, NOW)).toEqual({
      name: alice.name,
    });
    expect(await app.getAccountState(alice.id)).toEqual({ state: "removed" });
    expect(await app.repos.userProfiles.getByUserId(alice.id)).toBeUndefined();
    expect(
      (await app.repos.gameNights.getById(saturdayGameNight.id))?.cancelledAt,
    ).not.toBeNull();
    expect(await app.anonymizedSignIns()).toEqual([alice.id]);
  });

  it("lets only the admin remove an account, never their own, and not while a game is out", async () => {
    // One at a time, as the admin's taps come.
    const refusals = [
      () => app.removeAccount(alice.id, sam.id, NOW),
      () => app.removeAccount(you.id, you.id, NOW),
      () => app.removeAccount(alice.id, you.id, NOW),
    ];
    const errors: unknown[] = [];
    for (const refusal of refusals) {
      errors.push(await refusal().catch((err: unknown) => err));
    }
    expect(errors[0]).toBeInstanceOf(UnauthorizedError);
    expect(errors[1]).toBeInstanceOf(InputParseError);
    expect(isLoanOpen(errors[2])).toBe(true);
    expect((await app.getAccountState(alice.id)).state).toBe("ready");
  });

  it("finds accounts by name for the admin, with their games and loans to settle (G8)", async () => {
    expect(
      (await app.listAccounts("A", you.id)).map((one) => [
        one.profile.name,
        one.games,
        one.openLoans,
      ]),
    ).toEqual([
      [alice.name, 2, 1],
      [priya.name, 1, 1],
      [sam.name, 3, 1],
    ]);
    expect(await app.listAccounts("  ", you.id)).toEqual([]);
    const refused = await app
      .listAccounts("a", sam.id)
      .catch((err: unknown) => err);
    expect(refused).toBeInstanceOf(UnauthorizedError);
  });
});
