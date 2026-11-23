import { asc, eq, inArray } from "drizzle-orm";
import { userProfiles } from "@/db/schema";
import type { IUserProfilesRepository } from "@/src/application/repositories/user-profiles.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type {
  NameAndPiece,
  NewUserProfile,
  UserProfile,
  UserProfileChanges,
} from "@/src/entities/models/user-profile.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

const nameAndPiece = {
  userId: userProfiles.userId,
  name: userProfiles.name,
  pieceShape: userProfiles.pieceShape,
  pieceColor: userProfiles.pieceColor,
};

export class UserProfilesRepository
  extends BaseRepository
  implements IUserProfilesRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "userProfiles");
  }

  async getByUserId(
    userId: string,
    tx?: ITransaction,
  ): Promise<UserProfile | undefined> {
    try {
      const [profile] = await this.getDbContext(tx)
        .select()
        .from(userProfiles)
        .where(eq(userProfiles.userId, userId));
      return profile;
    } catch (err) {
      this.handleError(err, "getByUserId", { userId });
    }
  }

  async getManyByUserIds(
    userIds: readonly string[],
    tx?: ITransaction,
  ): Promise<NameAndPiece[]> {
    if (userIds.length === 0) {
      return [];
    }
    try {
      return await this.getDbContext(tx)
        .select(nameAndPiece)
        .from(userProfiles)
        .where(inArray(userProfiles.userId, [...userIds]))
        .orderBy(asc(userProfiles.userId));
    } catch (err) {
      this.handleError(err, "getManyByUserIds");
    }
  }

  async create(
    profile: NewUserProfile,
    tx?: ITransaction,
  ): Promise<UserProfile> {
    try {
      const [created] = await this.getDbContext(tx)
        .insert(userProfiles)
        .values(profile)
        .returning();
      if (!created) {
        throw new DatabaseOperationError("create failed");
      }
      return created;
    } catch (err) {
      this.handleError(err, "create", { userId: profile.userId });
    }
  }

  async update(
    userId: string,
    changes: UserProfileChanges,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(userProfiles)
        .set(changes)
        .where(eq(userProfiles.userId, userId));
    } catch (err) {
      this.handleError(err, "update", { userId });
    }
  }

  async listAll(tx?: ITransaction): Promise<UserProfile[]> {
    try {
      return await this.getDbContext(tx)
        .select()
        .from(userProfiles)
        .orderBy(asc(userProfiles.userId));
    } catch (err) {
      this.handleError(err, "listAll");
    }
  }

  async remove(userId: string, tx: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx)
        .delete(userProfiles)
        .where(eq(userProfiles.userId, userId));
    } catch (err) {
      this.handleError(err, "remove", { userId });
    }
  }
}
