import { beforeEach, expect, it } from "bun:test";
import {
  ChangedError,
  InputParseError,
  NotFoundError,
} from "@/src/entities/errors/common";
import { parseLibraryView } from "@/src/entities/library-filters";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";

const { you, alice, sam, mei, dev, noor } = CAST.people;
const { samsMossAndMortar, samsQuarryLane } = CAST.copies;
// The kit's today, Tue Nov 10, 2026, in the morning.
const NOW = new Date("2026-11-10T09:00:00-05:00");
const TODAY = "2026-11-10";
const DAY = 24 * 60 * 60 * 1000;
const VIEW = parseLibraryView({});
// A member who joins through a friend link, with nobody yet.
const NEWCOMER = "00000000-0000-4000-8000-00000000a001";

describeEachBackend("friend links", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("gives a member a link a week long, in the boards' form, and the same one again", async () => {
    const link = await app.getFriendLink(sam.id, NOW);
    expect(link.token).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}-[0-9A-HJKMNP-TV-Z]{4}$/);
    expect(link.expiresAt).toEqual(new Date(NOW.getTime() + 7 * DAY));
    expect((await app.getFriendLink(sam.id, NOW)).token).toBe(link.token);
  });

  it("makes a new link once the old one has run out", async () => {
    const link = await app.getFriendLink(sam.id, NOW);
    const later = new Date(NOW.getTime() + 8 * DAY);
    const next = await app.getFriendLink(sam.id, later);
    expect(next.token).not.toBe(link.token);
    expect(next.expiresAt).toEqual(new Date(later.getTime() + 7 * DAY));
  });

  it("makes two people friends at once, both ways, and ends a request between them", async () => {
    const link = await app.getFriendLink(noor.id, NOW);
    await app.sendFriendRequest(noor.id, you.id);

    const friend = await app.openFriendLink(link.token, you.id, NOW);

    expect(friend.name).toBe("Noor");
    expect(await app.repos.friendships.areFriends(you.id, noor.id)).toBe(true);
    expect(await app.repos.friendships.areFriends(noor.id, you.id)).toBe(true);
    expect(await app.repos.friendRequests.getBetween(you.id, noor.id)).toBe(
      undefined,
    );
    // Opening it again changes nothing.
    await app.openFriendLink(link.token, you.id, NOW);
    expect(await app.repos.friendships.listFriendIds(noor.id)).toContain(
      you.id,
    );
  });

  it("makes friends of a member with no profile yet, who signed up through the link", async () => {
    const link = await app.getFriendLink(sam.id, NOW);
    await app.openFriendLink(link.token, NEWCOMER, NOW);
    expect(await app.repos.friendships.areFriends(NEWCOMER, sam.id)).toBe(true);
  });

  it("stops the old link when a new one is made, and a link that has run out", async () => {
    const old = await app.getFriendLink(sam.id, NOW);
    const next = await app.makeFriendLink(sam.id, NOW);
    expect(next.token).not.toBe(old.token);

    await expect(app.openFriendLink(old.token, you.id, NOW)).rejects.toThrow(
      NotFoundError,
    );
    await expect(app.checkFriendLink(old.token, NOW)).rejects.toThrow(
      NotFoundError,
    );
    const later = new Date(next.expiresAt.getTime() + 1);
    await expect(app.openFriendLink(next.token, you.id, later)).rejects.toThrow(
      NotFoundError,
    );
    expect(await app.checkFriendLink(next.token, NOW)).toEqual({
      expiresAt: next.expiresAt,
    });
  });

  it("says a member's own link is theirs", async () => {
    const link = await app.getFriendLink(you.id, NOW);
    await expect(app.openFriendLink(link.token, you.id, NOW)).rejects.toThrow(
      InputParseError,
    );
  });
});

describeEachBackend("friend requests", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("asks a friend's friend, who's told, and keeps one request however often it's asked", async () => {
    const request = await app.sendFriendRequest(noor.id, you.id);
    expect(request).toMatchObject({
      createdBy: you.id,
      recipientUserId: noor.id,
      status: "waiting",
    });
    expect(await app.noticesOf(noor.id)).toEqual([
      expect.objectContaining({
        type: "friend-request",
        createdBy: you.id,
        friendRequestId: request.id,
      }),
    ]);
    expect((await app.sendFriendRequest(noor.id, you.id)).id).toBe(request.id);
    expect(await app.noticesOf(noor.id)).toHaveLength(1);
  });

  it("can't ask a stranger, a friend, or someone who asked first", async () => {
    // Mei's friend Alice is your friend, but Noor's friends don't include Mei's.
    await expect(app.sendFriendRequest(noor.id, mei.id)).rejects.toThrow(
      NotFoundError,
    );
    await expect(app.sendFriendRequest(sam.id, you.id)).rejects.toThrow(
      InputParseError,
    );
    await expect(app.sendFriendRequest(mei.id, you.id)).rejects.toThrow(
      InputParseError,
    );
  });

  it("accepts: friends both ways, and the request goes with its notice", async () => {
    const request = await app.sendFriendRequest(noor.id, you.id);
    await app.answerFriendRequest(request.id, "accept", noor.id);

    expect(await app.repos.friendships.areFriends(noor.id, you.id)).toBe(true);
    expect(await app.repos.friendRequests.getById(request.id)).toBe(undefined);
    expect(await app.noticesOf(noor.id)).toEqual([]);
  });

  it("declines without the sender being told: they still see You asked", async () => {
    const request = await app.sendFriendRequest(noor.id, you.id);
    await app.answerFriendRequest(request.id, "decline", noor.id);

    const yours = await app.listFriends(you.id);
    expect(yours.requestsYouSent.map((row) => row.person.name).sort()).toEqual([
      "Dev",
      "Noor",
    ]);
    expect((await app.listFriends(noor.id)).requestsToYou).toEqual([]);
    expect(await app.noticesOf(you.id)).toEqual([]);
    await expect(
      app.answerFriendRequest(request.id, "accept", noor.id),
    ).rejects.toThrow(ChangedError);
  });

  it("is cancelled by its sender only, and an answer after that finds it gone", async () => {
    const request = await app.sendFriendRequest(noor.id, you.id);
    await expect(app.cancelFriendRequest(request.id, noor.id)).rejects.toThrow(
      NotFoundError,
    );
    await app.cancelFriendRequest(request.id, you.id);

    expect(await app.repos.friendRequests.getById(request.id)).toBe(undefined);
    expect(await app.noticesOf(noor.id)).toEqual([]);
    const answer = app.answerFriendRequest(request.id, "accept", noor.id);
    await expect(answer).rejects.toThrow(ChangedError);
  });

  it("answers only a request sent to you", async () => {
    const [mine] = (await app.listFriends(you.id)).requestsToYou;
    if (!mine) throw new Error("Mei's request is the cast's");
    await expect(
      app.answerFriendRequest(mine.requestId, "accept", alice.id),
    ).rejects.toThrow(NotFoundError);
  });
});

describeEachBackend("Friends (E1)", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("lists E1's requests, friends with their games, and people you may know", async () => {
    const friends = await app.listFriends(you.id);
    const named = (rows: { person: { name: string } }[]) =>
      rows.map((row) => row.person.name);

    expect(
      friends.requestsToYou.map((row) => [row.person.name, row.via?.name]),
    ).toEqual([["Mei", "Alice"]]);
    expect(
      friends.requestsYouSent.map((row) => [row.person.name, row.via?.name]),
    ).toEqual([["Dev", "Alice"]]);
    expect(friends.friends.map((row) => [row.person.name, row.games])).toEqual([
      ["Alice", 2],
      ["Ben", 0],
      ["Jo", 1],
      ["Priya", 1],
      ["Sam", 3],
    ]);
    expect(named(friends.peopleYouMayKnow)).toEqual(["Noor"]);
    expect(friends.peopleYouMayKnow[0]?.via?.name).toBe("Sam");
  });

  it("gives a newcomer their new friend's friends, with You asked once asked (A5)", async () => {
    const link = await app.getFriendLink(sam.id, NOW);
    await app.openFriendLink(link.token, NEWCOMER, NOW);
    // A newcomer with a profile, as A4 makes it.
    await app.createProfile(
      {
        name: "Kit",
        phone: null,
        pieceShape: "cone",
        pieceColor: "teal",
      },
      NEWCOMER,
    );
    await app.sendFriendRequest(alice.id, NEWCOMER);

    const people = await app.listPeopleYouMayKnow(NEWCOMER);
    expect(
      people.map((row) => [row.person.name, row.yourRequestId !== null]),
    ).toEqual([
      ["Alice", true],
      ["Ben", false],
      ["Jo", false],
      ["Noor", false],
      ["Priya", false],
      ["Robin Vale", false],
    ]);
    expect(new Set(people.map((row) => row.via?.name))).toEqual(
      new Set(["Sam"]),
    );
  });
});

describeEachBackend("a friend's page (E3)", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("shows Sam, friends since July, and his library as you see it", async () => {
    const page = await app.getFriend(sam.id, you.id, TODAY, VIEW);

    expect(page.profile.name).toBe("Sam");
    expect(page.since).toEqual(new Date("2026-07-11T19:00:00-04:00"));
    expect(
      page.library.items.map(({ game, card }) => [game.title, card.stamp.word]),
    ).toEqual([
      ["Harbor Lights", "Available"],
      ["Moss & Mortar", "Due Fri"],
      ["Quarry Lane", "You asked"],
    ]);
    expect(page.between).toEqual({
      staying: [{ title: "Moss & Mortar", yours: false }],
      withdrawn: [{ title: "Quarry Lane", yours: false }],
      cancelled: [],
      // Sam is on your Heavy games at mine (U19).
      nights: [{ title: "Heavy games at mine", yours: true }],
    });
  });

  it("is Not found to anyone who isn't their friend, and for your own id (AE8)", async () => {
    await expect(app.getFriend(noor.id, you.id, TODAY, VIEW)).rejects.toThrow(
      NotFoundError,
    );
    await expect(app.getFriend(you.id, you.id, TODAY, VIEW)).rejects.toThrow(
      NotFoundError,
    );
    await expect(app.getFriend(you.id, dev.id, TODAY, VIEW)).rejects.toThrow(
      NotFoundError,
    );
  });
});

describeEachBackend("unfriending (R50)", () => {
  let app: ReturnType<typeof makeApp>;
  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  const openLoansOf = async (copyId: string) =>
    (await app.repos.loans.listOpenForCopies([copyId])).map((loan) => [
      loan.borrowerUserId,
      loan.status,
    ]);

  it("ends the friendship both ways, withdraws requests, keeps a loan that's out, and tells nobody", async () => {
    await app.unfriend(sam.id, you.id);

    expect(await app.repos.friendships.areFriends(you.id, sam.id)).toBe(false);
    expect(await app.repos.friendships.areFriends(sam.id, you.id)).toBe(false);
    // Your request for Quarry Lane is withdrawn; Moss & Mortar stays with you until it's back.
    expect(await openLoansOf(samsQuarryLane.id)).toEqual([]);
    expect(await openLoansOf(samsMossAndMortar.id)).toContainEqual([
      you.id,
      "out",
    ]);
    expect(await app.noticesOf(sam.id)).toEqual([]);
    expect(await app.noticesOf(you.id)).toEqual([]);
    await expect(app.getFriend(sam.id, you.id, TODAY, VIEW)).rejects.toThrow(
      NotFoundError,
    );
  });

  it("cancels a yes not picked up yet, and a friend request between them", async () => {
    const [quarryLane] = await app.repos.loans.listOpenForCopies([
      samsQuarryLane.id,
    ]);
    if (!quarryLane) throw new Error("Your request is the cast's");
    await app.repos.transactions.startTransaction((tx) =>
      app.repos.loans.setStatus(quarryLane.id, "accepted", tx),
    );

    await app.unfriend(you.id, sam.id);

    expect(await openLoansOf(samsQuarryLane.id)).toEqual([]);
  });

  it("says the two aren't friends any more when it's done already", async () => {
    await app.unfriend(sam.id, you.id);
    await expect(app.unfriend(sam.id, you.id)).rejects.toThrow(ChangedError);
  });
});
