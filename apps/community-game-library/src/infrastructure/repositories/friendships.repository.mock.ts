import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { Friendship } from "@/src/entities/models/friendship.model";

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
      .sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  }

  async add(userId: string, friendUserId: string): Promise<void> {
    // As the table's check: a friendship is between two people.
    if (userId === friendUserId) {
      throw new DatabaseOperationError("add failed");
    }
    const createdAt = new Date();
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
