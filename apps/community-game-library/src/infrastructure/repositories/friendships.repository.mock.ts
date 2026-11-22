import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { Friendship } from "@/src/entities/models/friendship.model";

// Ids in code-point order, as the table's uuid order.
const compare = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

export class MockFriendshipsRepository implements IFriendshipsRepository {
  private rows: Friendship[] = [];

  async areFriends(userId: string, friendUserId: string): Promise<boolean> {
    return this.rows.some(
      (row) => row.userId === userId && row.friendUserId === friendUserId,
    );
  }

  async listFriendIds(userId: string): Promise<string[]> {
    return this.rows
      .filter((row) => row.userId === userId)
      .map((row) => row.friendUserId)
      .sort(compare);
  }

  async getSince(
    userId: string,
    friendUserId: string,
  ): Promise<Date | undefined> {
    return this.rows.find(
      (row) => row.userId === userId && row.friendUserId === friendUserId,
    )?.createdAt;
  }

  async listFriendsOfFriends(
    userId: string,
  ): Promise<{ userId: string; viaUserId: string }[]> {
    const mine = new Set(await this.listFriendIds(userId));
    return this.rows
      .filter(
        (row) =>
          mine.has(row.userId) &&
          row.friendUserId !== userId &&
          !mine.has(row.friendUserId),
      )
      .map((row) => ({ userId: row.friendUserId, viaUserId: row.userId }))
      .sort((a, b) =>
        a.userId === b.userId
          ? compare(a.viaUserId, b.viaUserId)
          : compare(a.userId, b.userId),
      );
  }

  async add({
    userId,
    friendUserId,
    createdAt = new Date(),
  }: {
    userId: string;
    friendUserId: string;
    createdAt?: Date;
  }): Promise<void> {
    // As the table's check: a friendship is between two people.
    if (userId === friendUserId) {
      throw new DatabaseOperationError("add failed");
    }
    for (const [one, other] of [
      [userId, friendUserId],
      [friendUserId, userId],
    ] as const) {
      if (!(await this.areFriends(one, other))) {
        this.rows.push({ userId: one, friendUserId: other, createdAt });
      }
    }
  }

  async remove(userId: string, friendUserId: string): Promise<void> {
    const between = (row: Friendship, one: string, other: string) =>
      row.userId === one && row.friendUserId === other;
    this.rows = this.rows.filter(
      (row) =>
        !between(row, userId, friendUserId) &&
        !between(row, friendUserId, userId),
    );
  }
}
