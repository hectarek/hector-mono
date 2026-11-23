import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { FriendLink } from "@/src/entities/models/friend-link.model";

export class MockFriendLinksRepository implements IFriendLinksRepository {
  private rows: FriendLink[] = [];

  async getByUserId(userId: string): Promise<FriendLink | undefined> {
    return this.rows.find((row) => row.userId === userId);
  }

  async getByToken(token: string): Promise<FriendLink | undefined> {
    return this.rows.find((row) => row.token === token);
  }

  async set(
    userId: string,
    token: string,
    expiresAt: Date,
  ): Promise<FriendLink> {
    // As the table's unique token.
    if (this.rows.some((row) => row.token === token && row.userId !== userId)) {
      throw new DatabaseOperationError("set failed");
    }
    const now = new Date();
    const current = this.rows.find((row) => row.userId === userId);
    if (current) {
      Object.assign(current, { token, expiresAt, updatedAt: now });
      return { ...current };
    }
    const row = { userId, token, expiresAt, createdAt: now, updatedAt: now };
    this.rows.push(row);
    return { ...row };
  }

  async remove(userId: string): Promise<void> {
    this.rows = this.rows.filter((row) => row.userId !== userId);
  }
}
