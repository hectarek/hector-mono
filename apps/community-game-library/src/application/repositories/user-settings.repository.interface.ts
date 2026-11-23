import type { ITransaction } from "@/src/entities/models/transaction.model";
import type {
  NewUserSettings,
  UserSettings,
  UserSettingsChanges,
} from "@/src/entities/models/user-settings.model";

// Each member's settings (docs/data-model.md, user_settings), made with their profile.
export interface IUserSettingsRepository {
  getByUserId(
    userId: string,
    tx?: ITransaction,
  ): Promise<UserSettings | undefined>;
  // A member has one row of settings: a second is refused.
  create(settings: NewUserSettings, tx?: ITransaction): Promise<UserSettings>;
  update(
    userId: string,
    changes: UserSettingsChanges,
    tx?: ITransaction,
  ): Promise<void>;

  // An account's end (U22).
  remove(userId: string, tx: ITransaction): Promise<void>;
}
