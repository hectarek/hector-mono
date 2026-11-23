import type { IUserSettingsRepository } from "@/src/application/repositories/user-settings.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  NewUserSettings,
  UserSettings,
  UserSettingsChanges,
} from "@/src/entities/models/user-settings.model";
import { DEFAULT_NOTICES_OFF } from "@/src/entities/notice-types";

export class MockUserSettingsRepository implements IUserSettingsRepository {
  private readonly settings = new Map<string, UserSettings>();

  async getByUserId(userId: string): Promise<UserSettings | undefined> {
    const settings = this.settings.get(userId);
    return settings && { ...settings, noticesOff: [...settings.noticesOff] };
  }

  async create(settings: NewUserSettings): Promise<UserSettings> {
    // As the table's key: one row a member.
    if (this.settings.has(settings.userId)) {
      throw new DatabaseOperationError("create failed");
    }
    const now = new Date();
    // The table's defaults.
    const created: UserSettings = {
      userId: settings.userId,
      defaultPassAlong: settings.defaultPassAlong ?? false,
      noticesOff: [...(settings.noticesOff ?? DEFAULT_NOTICES_OFF)],
      createdAt: now,
      updatedAt: now,
    };
    this.settings.set(created.userId, created);
    return { ...created, noticesOff: [...created.noticesOff] };
  }

  async update(userId: string, changes: UserSettingsChanges): Promise<void> {
    const settings = this.settings.get(userId);
    if (!settings) {
      return;
    }
    // As drizzle's update, which leaves out a change that's undefined.
    const set = Object.fromEntries(
      Object.entries(changes).filter(([, value]) => value !== undefined),
    ) as UserSettingsChanges;
    this.settings.set(userId, { ...settings, ...set, updatedAt: new Date() });
  }

  async remove(userId: string): Promise<void> {
    this.settings.delete(userId);
  }
}
