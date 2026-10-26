import type {
  Settings,
  SettingsValues,
} from "@/src/entities/models/settings.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// An owner's settings (docs/build-plan.md U5): one row, from the owner's first save on.
export interface ISettingsRepository {
  // The owner's settings, or undefined before the first save.
  get(ownerId: string): Promise<Settings | undefined>;
  // The same, read for a change: the row stays locked until the transaction ends.
  getForUpdate(
    ownerId: string,
    tx: ITransaction,
  ): Promise<Settings | undefined>;
  // The first save.
  create(
    ownerId: string,
    values: SettingsValues,
    tx: ITransaction,
  ): Promise<Settings>;
  // A later save: moves updatedAt on.
  update(
    ownerId: string,
    values: SettingsValues,
    tx: ITransaction,
  ): Promise<Settings>;
}
