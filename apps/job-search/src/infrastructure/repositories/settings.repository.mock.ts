import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  Settings,
  SettingsValues,
} from "@/src/entities/models/settings.model";
import { nextUpdatedAt } from "@/src/infrastructure/repositories/updated-at.mock";

// Each owner's settings in memory. Like the table, a second first save fails, and each update
// moves updatedAt on by at least a millisecond.
export class MockSettingsRepository implements ISettingsRepository {
  private readonly rows = new Map<string, Settings>();

  async get(ownerId: string): Promise<Settings | undefined> {
    return copyOf(this.rows.get(ownerId));
  }

  async getForUpdate(ownerId: string): Promise<Settings | undefined> {
    return this.get(ownerId);
  }

  async create(ownerId: string, values: SettingsValues): Promise<Settings> {
    if (this.rows.has(ownerId)) {
      throw new DatabaseOperationError("create failed");
    }
    return this.put(ownerId, values, new Date());
  }

  async update(ownerId: string, values: SettingsValues): Promise<Settings> {
    const previous = this.rows.get(ownerId)?.updatedAt;
    if (!previous) {
      throw new DatabaseOperationError("update found no settings");
    }
    return this.put(ownerId, values, nextUpdatedAt(previous));
  }

  private put(
    ownerId: string,
    { targets, pendingCap }: SettingsValues,
    updatedAt: Date,
  ): Settings {
    const row = { targets: { ...targets }, pendingCap, updatedAt };
    this.rows.set(ownerId, row);
    return { ...row, targets: { ...targets } };
  }
}

function copyOf(row: Settings | undefined): Settings | undefined {
  return row && { ...row, targets: { ...row.targets } };
}
