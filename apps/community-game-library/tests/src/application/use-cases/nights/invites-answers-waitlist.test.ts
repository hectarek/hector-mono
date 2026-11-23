import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  setSystemTime,
} from "bun:test";
import {
  ChangedError,
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, sam, priya, jo, ben, mei, dev } = CAST.people;
const { saturdayGameNight, heavyGamesAtMine, bensBirthdayGames } = CAST.nights;
const { josSaltAndSignal, samsHarborLights, samsQuarryLane, yourNightMarket } =
  CAST.copies;
// The kit's today, Tue Nov 10, 2026, in the morning.
const NOW = new Date("2026-11-10T09:30:00-05:00");
const TODAY = "2026-11-10";

describeEachBackend("invites, answers, the waitlist and guests (U19)", () => {
  let app: ReturnType<typeof makeApp>;
  const statusOf = async (nightId: string, userId: string) =>
    (await app.repos.gameNights.getAttendee(nightId, userId))?.status ?? null;
  const told = async (userId: string) =>
    (await app.noticesOf(userId)).map((one) => [one.type, one.gameNightId]);
  const onTable = async (nightId: string) =>
    (await app.repos.gameNights.listGames([nightId])).map(
      (one) => one.userGameId,
    );

  beforeEach(async () => {
    // Unfriending and People you may know read the clock themselves.
    setSystemTime(NOW);
    app = makeApp();
    await app.makeCast();
  });
  afterEach(() => {
    setSystemTime();
  });

  describe("Answering (R31, R47)", () => {
    it("AE4: with 6 seats, guests allowed and 5 going, a member bringing a guest goes on the waitlist, and moves to going, told, when someone stops going", async () => {
      // Alice's Saturday night: 6 seats, guests allowed, 4 going; you make it 5.
      await app.answerNight(
        saturdayGameNight.id,
        { answer: "going", guests: 0 },
        you.id,
      );
      await expect(
        app.answerNight(
          saturdayGameNight.id,
          { answer: "going", guests: 1 },
          ben.id,
        ),
      ).rejects.toBeInstanceOf(ChangedError);
      expect(
        await app.answerNight(
          saturdayGameNight.id,
          { answer: "waitlisted", guests: 1 },
          ben.id,
        ),
      ).toEqual({ status: "waitlisted", guestCount: 1, place: 1 });

      await app.answerNight(
        saturdayGameNight.id,
        { answer: "cant-go", guests: 0 },
        jo.id,
      );
      expect(await statusOf(saturdayGameNight.id, ben.id)).toBe("going");
      expect(await told(ben.id)).toEqual([
        ["waitlist-seat", saturdayGameNight.id],
      ]);
      // Jo's game left the table with Jo.
      expect(await onTable(saturdayGameNight.id)).not.toContain(
        josSaltAndSignal.id,
      );
    });

    it("keeps the waitlist's order, and skips someone whose seats don't fit", async () => {
      await app.answerNight(
        saturdayGameNight.id,
        { answer: "going", guests: 0 },
        you.id,
      );
      await app.answerNight(
        saturdayGameNight.id,
        { answer: "going", guests: 0 },
        ben.id,
      );
      // Full: Mei waits with a guest, then Dev... can't see it; Ben's friend Noor can't either,
      // so Ben steps back and waits alone behind Mei.
      await app.answerNight(
        saturdayGameNight.id,
        { answer: "waitlisted", guests: 1 },
        mei.id,
      );
      expect(
        await app.answerNight(
          saturdayGameNight.id,
          { answer: "maybe", guests: 0 },
          priya.id,
        ),
      ).toMatchObject({ status: "maybe" });
      // Priya's seat went to nobody: Mei needs two.
      expect(await statusOf(saturdayGameNight.id, mei.id)).toBe("waitlisted");
      await app.answerNight(
        saturdayGameNight.id,
        { answer: "waitlisted", guests: 0 },
        priya.id,
      );
      // Priya fits the one seat, so she's going again rather than waiting.
      expect(await statusOf(saturdayGameNight.id, priya.id)).toBe("going");
    });

    it("refuses guests on a night that doesn't take them, and the host's own answer", async () => {
      await expect(
        app.answerNight(
          heavyGamesAtMine.id,
          { answer: "going", guests: 0 },
          you.id,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await app.updateNight(
        saturdayGameNight.id,
        { guestsAllowed: false },
        alice.id,
        NOW,
      );
      await expect(
        app.answerNight(
          saturdayGameNight.id,
          { answer: "going", guests: 1 },
          you.id,
        ),
      ).rejects.toBeInstanceOf(InputParseError);
    });

    it("answers a friend's night with no invite, and drops the Nights count once answered", async () => {
      expect((await app.getTabCounts(you.id, TODAY)).nights).toBe(1);
      await app.answerNight(
        saturdayGameNight.id,
        { answer: "maybe", guests: 0 },
        you.id,
      );
      expect((await app.getTabCounts(you.id, TODAY)).nights).toBe(0);
      expect(
        await app.answerNight(
          bensBirthdayGames.id,
          { answer: "waitlisted", guests: 0 },
          you.id,
        ),
      ).toEqual({ status: "waitlisted", guestCount: 0, place: 1 });
    });

    it("moves the waitlist up when the host adds seats", async () => {
      await app.updateNight(heavyGamesAtMine.id, { capacity: 7 }, you.id, NOW);
      expect(await statusOf(heavyGamesAtMine.id, dev.id)).toBe("going");
      expect(await told(dev.id)).toEqual([
        ["waitlist-seat", heavyGamesAtMine.id],
      ]);
    });
  });

  describe("Invites (R30, D10)", () => {
    it("lets only the host invite, unless people going may, and tells each person invited", async () => {
      await expect(
        app.inviteToNight(saturdayGameNight.id, [mei.id], sam.id),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await app.updateNight(
        saturdayGameNight.id,
        { attendeesCanInvite: true },
        alice.id,
        NOW,
      );
      expect(
        await app.inviteToNight(saturdayGameNight.id, [ben.id], sam.id),
      ).toEqual([]);
      expect(
        await app.inviteToNight(saturdayGameNight.id, [mei.id], alice.id),
      ).toEqual([mei.id]);
      expect(
        await app.repos.gameNights.getAttendee(saturdayGameNight.id, mei.id),
      ).toMatchObject({ status: "invited", invitedBy: alice.id });
      expect(await told(mei.id)).toEqual([
        ["night-invite", saturdayGameNight.id],
      ]);
      expect((await app.getTabCounts(mei.id, TODAY)).nights).toBe(1);
    });

    it("invites only the inviter's friends, and offers those not on the list", async () => {
      await expect(
        app.inviteToNight(heavyGamesAtMine.id, [mei.id], you.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(
        (await app.getInviteChoices(heavyGamesAtMine.id, you.id)).map(
          (one) => one.name,
        ),
      ).toEqual(["Alice"]);
      await expect(
        app.getInviteChoices(heavyGamesAtMine.id, sam.id),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("The night's link (R30, KTD18)", () => {
    it("shows the night's title and seats signed out, and puts whoever opens it on the list", async () => {
      expect(await app.checkNightLink("7QK2-MARR")).toEqual({
        title: "Heavy games at mine",
        startsAt: new Date("2026-11-20T19:00:00-05:00"),
        capacity: 6,
        seatsOpen: 0,
        waitlisted: 1,
      });
      expect(await app.openNightLink("7QK2-MARR", mei.id)).toBe(
        heavyGamesAtMine.id,
      );
      expect(
        await app.repos.gameNights.getAttendee(heavyGamesAtMine.id, mei.id),
      ).toMatchObject({ status: "invited", invitedBy: null });
      // A link's invite isn't counted on the Nights tab (R33).
      expect((await app.getTabCounts(mei.id, TODAY)).nights).toBe(0);
      expect(
        (await app.getNight(heavyGamesAtMine.id, mei.id)).night.address,
      ).toBe("9 Juniper Court");
    });

    it("makes a new link that ends the old one, for the host alone", async () => {
      const token = await app.makeNightLink(heavyGamesAtMine.id, you.id);
      expect(token).not.toBe("7QK2-MARR");
      await expect(app.checkNightLink("7QK2-MARR")).rejects.toBeInstanceOf(
        NotFoundError,
      );
      expect((await app.checkNightLink(token)).title).toBe(
        "Heavy games at mine",
      );
      await expect(
        app.makeNightLink(heavyGamesAtMine.id, sam.id),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });

    it("gives the link only to someone who may invite", async () => {
      expect(
        (await app.getNight(heavyGamesAtMine.id, you.id)).night.linkToken,
      ).toBe("7QK2-MARR");
      expect(
        (await app.getNight(heavyGamesAtMine.id, sam.id)).night.linkToken,
      ).toBeNull();
    });

    it("gives a new night only invited people see a link", async () => {
      const night = await app.createNight(
        {
          title: "Quiet night in",
          startsAt: new Date("2026-11-27T19:00:00-05:00"),
          endsAt: null,
          place: "Robin’s place",
          address: null,
          hostNote: null,
          capacity: 4,
          audience: "invited",
          attendeesCanInvite: false,
          guestsAllowed: false,
          userGameIds: [],
        },
        you.id,
        NOW,
      );
      expect(night.linkToken).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    });
  });

  describe("The waitlist (R31)", () => {
    it("lets the host take someone off it, who's told and stays on the list", async () => {
      await expect(
        app.removeFromWaitlist(heavyGamesAtMine.id, dev.id, sam.id),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await app.removeFromWaitlist(heavyGamesAtMine.id, dev.id, you.id);
      expect(await statusOf(heavyGamesAtMine.id, dev.id)).toBe("cant-go");
      expect(await told(dev.id)).toEqual([
        ["removed-from-waitlist", heavyGamesAtMine.id],
      ]);
    });

    it("lists the waitlist in its order on the night's page", async () => {
      const page = await app.getNight(heavyGamesAtMine.id, you.id);
      expect(page.waitlist.map((one) => one.name)).toEqual(["Dev"]);
      expect(page.canInvite).toBe(true);
    });
  });

  describe("Games and votes (R32, R38)", () => {
    it("lets only people going vote, and takes their votes and games away when they stop", async () => {
      await expect(
        app.vote(
          saturdayGameNight.id,
          { userGameId: samsHarborLights.id, play: true },
          ben.id,
        ),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await app.vote(
        saturdayGameNight.id,
        { userGameId: josSaltAndSignal.id, play: true },
        priya.id,
      );
      const votersOf = async (copyId: string) =>
        (await app.getNight(saturdayGameNight.id, you.id)).games
          .find((one) => one.userGameId === copyId)
          ?.voters.map((one) => one.name);
      expect(await votersOf(josSaltAndSignal.id)).toEqual(["Priya"]);
      await app.vote(
        saturdayGameNight.id,
        { userGameId: josSaltAndSignal.id, play: false },
        priya.id,
      );
      expect(await votersOf(josSaltAndSignal.id)).toEqual([]);

      await app.answerNight(
        saturdayGameNight.id,
        { answer: "cant-go", guests: 0 },
        sam.id,
      );
      expect(await onTable(saturdayGameNight.id)).toEqual([
        CAST.copies.alicesTinKettleDerby.id,
        josSaltAndSignal.id,
      ]);
      expect(await votersOf(samsHarborLights.id)).toBeUndefined();
    });

    it("lets someone going bring their own games, and take them off again", async () => {
      await app.answerNight(
        saturdayGameNight.id,
        { answer: "going", guests: 0 },
        you.id,
      );
      await app.addGameToNight(
        saturdayGameNight.id,
        [yourNightMarket.id],
        you.id,
      );
      expect(await onTable(saturdayGameNight.id)).toContain(yourNightMarket.id);
      await expect(
        app.addGameToNight(saturdayGameNight.id, [samsQuarryLane.id], you.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      await app.removeGameFromNight(
        saturdayGameNight.id,
        yourNightMarket.id,
        you.id,
      );
      expect(await onTable(saturdayGameNight.id)).not.toContain(
        yourNightMarket.id,
      );
    });
  });

  describe("Friendships and nights (from U10)", () => {
    it("takes each off the other's nights on unfriending, and gives the seat to the waitlist", async () => {
      await app.unfriend(sam.id, you.id);
      expect(await statusOf(heavyGamesAtMine.id, sam.id)).toBeNull();
      expect(await onTable(heavyGamesAtMine.id)).toEqual([
        yourNightMarket.id,
        CAST.copies.yourSaltAndSignal.id,
      ]);
      expect(await statusOf(heavyGamesAtMine.id, dev.id)).toBe("going");
      // Sam still goes to Alice's night, which neither of you hosts.
      expect(await statusOf(saturdayGameNight.id, sam.id)).toBe("going");
    });

    it("offers people from a past night in People you may know, who can be asked", async () => {
      // Quinn knows none of your friends: only a night brings you together.
      const quinn = "00000000-0000-4000-8000-000000000998";
      await app.repos.userProfiles.create({
        userId: quinn,
        name: "Quinn",
        pieceShape: "pawn",
        pieceColor: "teal",
      });
      await app.addNight({
        id: "00000000-0000-4000-8000-000000000499",
        createdBy: priya.id,
        startsAt: new Date("2026-10-10T19:00:00-04:00"),
        list: [
          { userId: priya.id, status: "going" },
          { userId: you.id, status: "going" },
          { userId: quinn, status: "going" },
          { userId: dev.id, status: "going" },
        ],
      });
      await expect(
        app.sendFriendRequest(quinn, alice.id),
      ).rejects.toBeInstanceOf(NotFoundError);
      const people = await app.listPeopleYouMayKnow(you.id);
      expect(
        people.map(({ person, via, night }) => [
          person.name,
          via?.name ?? null,
          night,
        ]),
      ).toEqual([
        // A friend you share wins over a night.
        ["Dev", "Alice", null],
        ["Noor", "Sam", null],
        ["Quinn", null, "Game night"],
      ]);
      expect(await app.sendFriendRequest(quinn, you.id)).toMatchObject({
        recipientUserId: quinn,
      });
    });
  });
});
