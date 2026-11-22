import { beforeEach, describe, expect, it } from "bun:test";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import { FriendshipsRepository } from "@/src/infrastructure/repositories/friendships.repository";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { CAST } from "@/tests/_support/cast";
import { resetDatabase, sql } from "@/tests/_support/database";

const { you, alice, sam, priya, jo, ben, mei, dev, noor } = CAST.people;

describeEachBackend("IFriendshipsRepository", () => {
  let app: ReturnType<typeof makeApp>;

  beforeEach(async () => {
    app = makeApp();
    await app.makeCast();
  });

  it("knows the circle's friendships, from either side", async () => {
    const { friendships } = app.repos;

    expect(await friendships.areFriends(you.id, alice.id)).toBe(true);
    expect(await friendships.areFriends(alice.id, you.id)).toBe(true);
    expect(await friendships.areFriends(jo.id, ben.id)).toBe(true);
  });

  // E1: Mei and Dev are Alice's friends and Noor is Sam's, so you may know them, but they
  // aren't yours.
  it("doesn't make a friend's friend yours", async () => {
    for (const stranger of [mei, dev, noor]) {
      expect(await app.repos.friendships.areFriends(you.id, stranger.id)).toBe(
        false,
      );
    }
  });

  it("lists a member's friends by id", async () => {
    expect(await app.repos.friendships.listFriendIds(you.id)).toEqual([
      alice.id,
      sam.id,
      priya.id,
      jo.id,
      ben.id,
    ]);
    expect(await app.repos.friendships.listFriendIds(noor.id)).toEqual([
      sam.id,
    ]);
  });

  it("adds both sides at once, and adding again changes nothing", async () => {
    const { friendships } = app.repos;

    await friendships.add({ userId: mei.id, friendUserId: you.id });
    await friendships.add({ userId: you.id, friendUserId: mei.id });

    expect(await friendships.areFriends(you.id, mei.id)).toBe(true);
    expect(await friendships.listFriendIds(mei.id)).toEqual([you.id, alice.id]);
    expect(await friendships.listFriendIds(you.id)).toEqual([
      alice.id,
      sam.id,
      priya.id,
      jo.id,
      ben.id,
      mei.id,
    ]);
  });

  it("removes both sides at once, and nobody else's", async () => {
    const { friendships } = app.repos;

    await friendships.remove(alice.id, you.id);

    expect(await friendships.areFriends(you.id, alice.id)).toBe(false);
    expect(await friendships.areFriends(alice.id, you.id)).toBe(false);
    expect(await friendships.listFriendIds(alice.id)).toEqual([
      sam.id,
      priya.id,
      jo.id,
      ben.id,
      mei.id,
      dev.id,
    ]);
  });

  it("refuses a friendship with oneself", async () => {
    await expect(
      app.repos.friendships.add({ userId: you.id, friendUserId: you.id }),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
  });
});

describe("FriendshipsRepository on Postgres", () => {
  beforeEach(resetDatabase);

  it("keeps a friendship as two rows, made and deleted together", async () => {
    const friendships = new FriendshipsRepository(new MockLoggerService());
    const rows = () =>
      sql<{ user_id: string; friend_user_id: string }>(
        "select user_id, friend_user_id from friendships order by user_id",
      );

    await friendships.add({ userId: sam.id, friendUserId: you.id });
    expect(await rows()).toEqual([
      { user_id: you.id, friend_user_id: sam.id },
      { user_id: sam.id, friend_user_id: you.id },
    ]);

    await friendships.remove(you.id, sam.id);
    expect(await rows()).toEqual([]);
  });
});
