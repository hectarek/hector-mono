import { beforeEach, describe, expect, it } from "bun:test";
import {
  InputParseError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, sam, priya, jo, ben, mei, dev, noor } = CAST.people;
const { saturdayGameNight, heavyGamesAtMine, bensBirthdayGames } = CAST.nights;
const {
  yourNightMarket,
  yourSaltAndSignal,
  yourPaperKites,
  yourGullAndAnchor,
  samsQuarryLane,
} = CAST.copies;
// The kit's today, Tue Nov 10, 2026, in the morning.
const NOW = new Date("2026-11-10T09:30:00-05:00");
// Someone with no account in the cast, who's nobody's friend.
const STRANGER = "00000000-0000-4000-8000-000000000999";

// A new night of the host's, as D5 sends it once the controller has its times.
const newNight = {
  title: "Quiet night in",
  startsAt: new Date("2026-11-27T19:00:00-05:00"),
  endsAt: new Date("2026-11-27T22:00:00-05:00"),
  place: "Robin’s place",
  address: null,
  hostNote: null,
  capacity: 4,
  audience: "friends",
  attendeesCanInvite: false,
  guestsAllowed: false,
  userGameIds: [yourSaltAndSignal.id, yourNightMarket.id],
} as const;

describeEachBackend("nights and a new night (U18)", () => {
  let app: ReturnType<typeof makeApp>;
  const titlesFor = async (userId: string) =>
    (await app.listNights(userId, NOW)).map((card) => card.night.title);

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  describe("Create a game night (D5, R29)", () => {
    it("makes the night with the host going and the picked games on its table, in their order", async () => {
      const night = await app.createNight(newNight, you.id, NOW);
      expect(night).toMatchObject({
        createdBy: you.id,
        title: "Quiet night in",
        capacity: 4,
        audience: "friends",
      });
      const page = await app.getNight(night.id, you.id);
      expect(page.you).toBe("host");
      expect(page.going.map((one) => one.name)).toEqual(["Robin Vale"]);
      expect(page.games.map((one) => one.game.title)).toEqual([
        "Salt & Signal",
        "Night Market",
      ]);
    });

    it("counts the host against the seats", async () => {
      const night = await app.createNight(newNight, you.id, NOW);
      const card = (await app.listNights(you.id, NOW)).find(
        (one) => one.night.id === night.id,
      );
      expect(card?.seatsOpen).toBe(3);
    });

    it("refuses a start before now and a copy that isn't the host's", async () => {
      await expect(
        app.createNight(
          { ...newNight, startsAt: new Date("2026-11-10T08:00:00-05:00") },
          you.id,
          NOW,
        ),
      ).rejects.toBeInstanceOf(InputParseError);
      await expect(
        app.createNight(
          { ...newNight, userGameIds: [samsQuarryLane.id] },
          you.id,
          NOW,
        ),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("Who sees a night (KTD4, R30, R36)", () => {
    it("AE5: a member who isn't invited to a private night sees neither it nor its place", async () => {
      expect(await titlesFor(alice.id)).not.toContain("Heavy games at mine");
      await expect(
        app.getNight(heavyGamesAtMine.id, alice.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("shows a private night to the people on its list, friends or not", async () => {
      expect(await titlesFor(dev.id)).toContain("Heavy games at mine");
      const page = await app.getNight(heavyGamesAtMine.id, dev.id);
      expect(page.night.address).toBe("9 Juniper Court");
      expect(page.you).toBe("waitlisted");
    });

    it("shows a night for friends to the host's friends, and to nobody else", async () => {
      expect(await titlesFor(mei.id)).toContain("Saturday game night");
      expect(await titlesFor(noor.id)).not.toContain("Saturday game night");
      expect(await titlesFor(STRANGER)).toEqual([]);
      await expect(
        app.getNight(saturdayGameNight.id, noor.id),
      ).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("Nights (D1, R33)", () => {
    it("lists the upcoming nights you can see, soonest first, with your stamp, the people going and the seats", async () => {
      const cards = await app.listNights(you.id, NOW);
      expect(
        cards.map(({ night, you: mine, going, seatsOpen, waitlisted }) => [
          night.title,
          mine,
          going.map((one) =>
            one.guestCount > 0 ? `${one.name} +${one.guestCount}` : one.name,
          ),
          seatsOpen,
          waitlisted,
        ]),
      ).toEqual([
        [
          "Saturday game night",
          "invited",
          ["Alice", "Sam", "Jo", "Priya"],
          2,
          0,
        ],
        [
          "Heavy games at mine",
          "host",
          ["Robin Vale", "Sam", "Priya", "Jo", "Ben +1"],
          0,
          1,
        ],
        [
          "Ben’s birthday games",
          null,
          ["Ben", "Alice", "Sam", "Priya", "Jo", "Mei", "Dev +1"],
          0,
          0,
        ],
      ]);
    });

    it("keeps a night on the list until its day is over", async () => {
      const lateThatNight = new Date("2026-11-14T23:30:00-05:00");
      const nextMorning = new Date("2026-11-15T08:00:00-05:00");
      const titles = async (now: Date) =>
        (await app.listNights(you.id, now)).map((card) => card.night.title);
      expect(await titles(lateThatNight)).toContain("Saturday game night");
      expect(await titles(nextMorning)).not.toContain("Saturday game night");
    });

    it("lists the nights a friend is going to, for their page (E3)", async () => {
      const going = async (friendId: string) =>
        (await app.listNights(you.id, NOW, { goingUserId: friendId })).map(
          (card) => card.night.title,
        );
      expect(await going(sam.id)).toEqual([
        "Saturday game night",
        "Heavy games at mine",
        "Ben’s birthday games",
      ]);
      expect(await going(ben.id)).toEqual([
        "Heavy games at mine",
        "Ben’s birthday games",
      ]);
    });
  });

  describe("A night's page (D2, D7)", () => {
    it("gives the host the place, who's going with their guests, and the games on the table with who brings them", async () => {
      const page = await app.getNight(heavyGamesAtMine.id, you.id);
      expect(page.night).toMatchObject({
        place: "Robin’s place",
        address: "9 Juniper Court",
      });
      expect(page.going.find((one) => one.name === "Ben")?.guestCount).toBe(1);
      // Most wanted first, as D7 draws them (U19's votes).
      expect(
        page.games.map(({ game, owner, voters }) => [
          game.title,
          owner.name,
          voters.length,
        ]),
      ).toEqual([
        ["Quarry Lane", "Sam", 4],
        ["Night Market", "Robin Vale", 3],
        ["Harbor Lights", "Sam", 1],
        ["Salt & Signal", "Robin Vale", 0],
      ]);
    });

    it("says who said maybe", async () => {
      const page = await app.getNight(saturdayGameNight.id, you.id);
      expect(page.maybe.map((one) => one.name)).toEqual(["Ben"]);
      expect(page.you).toBe("invited");
    });
  });

  describe("Edit (R34)", () => {
    const details = {
      startsAt: new Date("2026-11-20T18:30:00-05:00"),
      place: "Robin’s place",
    };

    it("tells everyone going but the host when the time moves, and nobody on the waitlist", async () => {
      const { night, told } = await app.updateNight(
        heavyGamesAtMine.id,
        details,
        you.id,
        NOW,
      );
      expect(night.startsAt).toEqual(details.startsAt);
      expect([...told].sort()).toEqual(
        [sam.id, priya.id, jo.id, ben.id].sort(),
      );
      const changed = async (userId: string) =>
        (await app.noticesOf(userId)).map((one) => [one.type, one.gameNightId]);
      expect(await changed(sam.id)).toEqual([
        ["night-changed", heavyGamesAtMine.id],
      ]);
      expect(await changed(dev.id)).toEqual([]);
      expect(await changed(you.id)).toEqual([]);
    });

    it("changes the seats or a switch without telling anyone", async () => {
      const seats = await app.updateNight(
        heavyGamesAtMine.id,
        { capacity: 8 },
        you.id,
        NOW,
      );
      const guests = await app.updateNight(
        heavyGamesAtMine.id,
        { guestsAllowed: false },
        you.id,
        NOW,
      );
      expect(seats.told).toEqual([]);
      expect(guests.told).toEqual([]);
      expect(guests.night).toMatchObject({ capacity: 8, guestsAllowed: false });
    });

    it("keeps the seats at the ones taken or more, and a new start from now on", async () => {
      await expect(
        app.updateNight(heavyGamesAtMine.id, { capacity: 5 }, you.id, NOW),
      ).rejects.toThrow("6 seats are taken, so the night needs at least 6.");
      await expect(
        app.updateNight(
          heavyGamesAtMine.id,
          { startsAt: new Date("2026-11-09T19:00:00-05:00") },
          you.id,
          NOW,
        ),
      ).rejects.toBeInstanceOf(InputParseError);
    });

    it("lets only the host edit: someone going is refused, and someone who can't see it gets Not found", async () => {
      await expect(
        app.updateNight(heavyGamesAtMine.id, details, sam.id, NOW),
      ).rejects.toBeInstanceOf(UnauthorizedError);
      await expect(
        app.updateNight(heavyGamesAtMine.id, details, alice.id, NOW),
      ).rejects.toBeInstanceOf(NotFoundError);
      await expect(
        app.updateNight(bensBirthdayGames.id, details, you.id, NOW),
      ).rejects.toBeInstanceOf(UnauthorizedError);
    });
  });

  describe("Pick from your library (D6)", () => {
    it("offers every copy of yours: at home and lent first, then kept, then out with who has it", async () => {
      const choices = await app.getNightGameChoices(you.id);
      expect(
        choices.map(({ userGameId, lendable, holder }) => [
          userGameId,
          lendable,
          holder?.name ?? null,
        ]),
      ).toEqual([
        [yourNightMarket.id, true, null],
        [yourSaltAndSignal.id, true, null],
        [yourPaperKites.id, false, null],
        [yourGullAndAnchor.id, true, "Jo"],
      ]);
    });
  });
});
