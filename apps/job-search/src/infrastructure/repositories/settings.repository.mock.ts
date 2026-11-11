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
    const row = this.rows.get(ownerId);
    return row && copyOf(row);
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
    { targets, payFloor, season }: SettingsValues,
    updatedAt: Date,
  ): Settings {
    const row = { targets, payFloor, season, updatedAt };
    this.rows.set(ownerId, copyOf(row));
    return copyOf(row);
  }
}

// A copy that shares nothing with the row it's made from, as a read from the table would.
function copyOf(row: Settings): Settings {
  return {
    ...row,
    targets: { ...row.targets },
    season: row.season && {
      ...row.season,
      checkpoints: row.season.checkpoints.map((checkpoint) => ({
        ...checkpoint,
      })),
    },
  };
}
