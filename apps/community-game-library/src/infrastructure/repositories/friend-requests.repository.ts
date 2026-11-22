import { and, asc, eq, or } from "drizzle-orm";
import { friendRequests } from "@/db/schema";
import type { IFriendRequestsRepository } from "@/src/application/repositories/friend-requests.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { FriendRequest } from "@/src/entities/models/friend-request.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

const between = (userId: string, otherUserId: string) =>
  or(
    and(
      eq(friendRequests.createdBy, userId),
      eq(friendRequests.recipientUserId, otherUserId),
    ),
    and(
      eq(friendRequests.createdBy, otherUserId),
      eq(friendRequests.recipientUserId, userId),
    ),
  );

export class FriendRequestsRepository
  extends BaseRepository
  implements IFriendRequestsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "friend_requests");
  }

  async add(
    request: Pick<FriendRequest, "createdBy" | "recipientUserId">,
    tx: ITransaction,
  ): Promise<FriendRequest> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(friendRequests)
        .values(request)
        .returning();
      if (!row) {
        throw new Error("No row returned");
      }
      return row;
    } catch (err) {
      this.handleError(err, "add", {
        createdBy: request.createdBy,
        recipientUserId: request.recipientUserId,
      });
    }
  }

  async getById(
    id: string,
    tx?: ITransaction,
  ): Promise<FriendRequest | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(friendRequests)
        .where(eq(friendRequests.id, id));
      return row;
    } catch (err) {
      this.handleError(err, "getById", { friendRequestId: id });
    }
  }

  async getBetween(
    userId: string,
    otherUserId: string,
    tx?: ITransaction,
  ): Promise<FriendRequest | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(friendRequests)
        .where(between(userId, otherUserId));
      return row;
    } catch (err) {
      this.handleError(err, "getBetween", { userId, otherUserId });
    }
  }

  async listInvolving(
    userId: string,
    tx?: ITransaction,
  ): Promise<FriendRequest[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(friendRequests)
        .where(
          or(
            eq(friendRequests.createdBy, userId),
            eq(friendRequests.recipientUserId, userId),
          ),
        )
        .orderBy(asc(friendRequests.createdAt), asc(friendRequests.id));
    } catch (err) {
      this.handleError(err, "listInvolving", { userId });
    }
  }

  async decline(id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(friendRequests)
        .set({ status: "declined" })
        .where(eq(friendRequests.id, id));
    } catch (err) {
      this.handleError(err, "decline", { friendRequestId: id });
    }
  }

  async remove(id: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(friendRequests)
        .where(eq(friendRequests.id, id));
    } catch (err) {
      this.handleError(err, "remove", { friendRequestId: id });
    }
  }

  async removeBetween(
    userId: string,
    otherUserId: string,
    tx: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(friendRequests)
        .where(between(userId, otherUserId));
    } catch (err) {
      this.handleError(err, "removeBetween", { userId, otherUserId });
    }
  }
}
