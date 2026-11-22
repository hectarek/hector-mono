import { and, asc, eq, ne, notExists, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
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

  async getSince(
    userId: string,
    friendUserId: string,
    tx?: ITransaction,
  ): Promise<Date | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select({ createdAt: friendships.createdAt })
        .from(friendships)
        .where(oneWay(userId, friendUserId));
      return row?.createdAt;
    } catch (err) {
      this.handleError(err, "getSince", { userId, friendUserId });
    }
  }

  async listFriendsOfFriends(
    userId: string,
    tx?: ITransaction,
  ): Promise<{ userId: string; viaUserId: string }[]> {
    const theirs = alias(friendships, "theirs");
    const mine = alias(friendships, "mine");
    try {
      const db = this.getDbContext(tx);
      return await db
        .select({
          userId: theirs.friendUserId,
          viaUserId: friendships.friendUserId,
        })
        .from(friendships)
        .innerJoin(theirs, eq(theirs.userId, friendships.friendUserId))
        .where(
          and(
            eq(friendships.userId, userId),
            ne(theirs.friendUserId, userId),
            notExists(
              db
                .select({ userId: mine.userId })
                .from(mine)
                .where(
                  and(
                    eq(mine.userId, userId),
                    eq(mine.friendUserId, theirs.friendUserId),
                  ),
                ),
            ),
          ),
        )
        .orderBy(asc(theirs.friendUserId), asc(friendships.friendUserId));
    } catch (err) {
      this.handleError(err, "listFriendsOfFriends", { userId });
    }
  }

  // Both rows in one statement, so they land together. The table's check refuses a friendship
  // with oneself.
  async add(
    {
      userId,
      friendUserId,
      createdAt,
    }: { userId: string; friendUserId: string; createdAt?: Date },
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .insert(friendships)
        .values([
          { userId, friendUserId, createdAt },
          { userId: friendUserId, friendUserId: userId, createdAt },
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
