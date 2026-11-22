import { eq } from "drizzle-orm";
import { userSettings } from "@/db/schema";
import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import type {
  NewUserSettings,
  UserSettings,
  UserSettingsChanges,
} from "@/src/entities/models/user-settings.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

export class UserSettingsRepository
  extends BaseRepository
  implements IUserSettingsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "userSettings");
  }

  async getByUserId(
    userId: string,
    tx?: ITransaction,
  ): Promise<UserSettings | undefined> {
    try {
      const [settings] = await this.getDbContext(tx)
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, userId));
      return settings;
    } catch (err) {
      this.handleError(err, "getByUserId", { userId });
    }
  }

  async create(
    settings: NewUserSettings,
    tx?: ITransaction,
  ): Promise<UserSettings> {
    try {
      const [created] = await this.getDbContext(tx)
        .insert(userSettings)
        .values(settings)
        .returning();
      if (!created) {
        throw new DatabaseOperationError("create failed");
      }
      return created;
    } catch (err) {
      this.handleError(err, "create", { userId: settings.userId });
    }
  }

  async update(
    userId: string,
    changes: UserSettingsChanges,
    tx?: ITransaction,
  ): Promise<void> {
    try {
      await this.getDbContext(tx)
        .update(userSettings)
        .set(changes)
        .where(eq(userSettings.userId, userId));
    } catch (err) {
      this.handleError(err, "update", { userId });
    }
  }
}
