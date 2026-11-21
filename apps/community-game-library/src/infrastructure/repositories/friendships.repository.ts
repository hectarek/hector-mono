import { and, asc, eq, or } from "drizzle-orm";
import { friendships } from "@/db/schema";
import type { IFriendshipsRepository } from "@/src/application/repositories/friendships.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

const oneWay = (userId: string, friendUserId: string) =>
  and(
    eq(friendships.userId, userId),
    eq(friendships.friendUserId, friendUserId),
  );

export class FriendshipsRepository
  extends BaseRepository
  implements IFriendshipsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "friendships");
  }

  // Both rows are made and removed together, so one says it.
  async areFriends(
    userId: string,
    friendUserId: string,
    tx?: ITransaction,
  ): Promise<boolean> {
    try {
      const [row] = await this.getDbContext(tx)
        .select({ userId: friendships.userId })
        .from(friendships)
        .where(oneWay(userId, friendUserId))
        .limit(1);
      return row !== undefined;
    } catch (err) {
      this.handleError(err, "areFriends", { userId, friendUserId });
    }
  }

  async listFriendIds(userId: string, tx?: ITransaction): Promise<string[]> {
    try {
      const rows = await this.getDbContext(tx)
        .select({ friendUserId: friendships.friendUserId })
        .from(friendships)
        .where(eq(friendships.userId, userId))
        .orderBy(asc(friendships.friendUserId));
      return rows.map((row) => row.friendUserId);
    } catch (err) {
      this.handleError(err, "listFriendIds", { userId });
    }
  }

  // Both rows in one statement, so they land together. The table's check refuses a friendship
  // with oneself.
  async add(
    userId: string,
    friendUserId: string,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .insert(friendships)
        .values([
          { userId, friendUserId },
          { userId: friendUserId, friendUserId: userId },
        ])
        .onConflictDoNothing();
    } catch (err) {
      this.handleError(err, "add", { userId, friendUserId });
    }
  }

  async remove(
    userId: string,
    friendUserId: string,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(friendships)
        .where(or(oneWay(userId, friendUserId), oneWay(friendUserId, userId)));
    } catch (err) {
      this.handleError(err, "remove", { userId, friendUserId });
    }
  }
}
