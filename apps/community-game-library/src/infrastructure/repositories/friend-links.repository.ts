import { eq } from "drizzle-orm";
import { friendLinks } from "@/db/schema";
import type { IFriendLinksRepository } from "@/src/application/repositories/friend-links.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { FriendLink } from "@/src/entities/models/friend-link.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class FriendLinksRepository
  extends BaseRepository
  implements IFriendLinksRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "friend_links");
  }

  async getByUserId(
    userId: string,
    tx?: ITransaction,
  ): Promise<FriendLink | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(friendLinks)
        .where(eq(friendLinks.userId, userId));
      return row;
    } catch (err) {
      this.handleError(err, "getByUserId", { userId });
    }
  }

  async getByToken(
    token: string,
    tx?: ITransaction,
  ): Promise<FriendLink | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(friendLinks)
        .where(eq(friendLinks.token, token));
      return row;
    } catch (err) {
      this.handleError(err, "getByToken");
    }
  }

  async set(
    userId: string,
    token: string,
    expiresAt: Date,
    tx: ITransaction,
  ): Promise<FriendLink> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(friendLinks)
        .values({ userId, token, expiresAt })
        .onConflictDoUpdate({
          target: friendLinks.userId,
          set: { token, expiresAt },
        })
        .returning();
      if (!row) {
        throw new Error("No row returned");
      }
      return row;
    } catch (err) {
      this.handleError(err, "set", { userId });
    }
  }
}
