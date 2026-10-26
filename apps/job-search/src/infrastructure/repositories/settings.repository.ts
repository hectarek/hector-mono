import { eq, sql } from "drizzle-orm";
import { settings } from "@/db/schema";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type {
  Settings,
  SettingsValues,
} from "@/src/entities/models/settings.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";

type SettingsRow = typeof settings.$inferSelect;

export class SettingsRepository
  extends BaseRepository
  implements ISettingsRepository
{
  constructor(logger: ILoggerService) {
    super(logger, "settings");
  }

  async get(ownerId: string): Promise<Settings | undefined> {
    try {
      const [row] = await this.getDbContext()
        .select()
        .from(settings)
        .where(eq(settings.ownerId, ownerId));
      return row && toSettings(row);
    } catch (err) {
      this.handleError(err, "get", { ownerId });
    }
  }

  async getForUpdate(
    ownerId: string,
    tx: ITransaction,
  ): Promise<Settings | undefined> {
    try {
      const [row] = await this.getDbContext(tx)
        .select()
        .from(settings)
        .where(eq(settings.ownerId, ownerId))
        .for("update");
      return row && toSettings(row);
    } catch (err) {
      this.handleError(err, "getForUpdate", { ownerId });
    }
  }

  async create(
    ownerId: string,
    values: SettingsValues,
    tx: ITransaction,
  ): Promise<Settings> {
    try {
      const [row] = await this.getDbContext(tx)
        .insert(settings)
        .values({ ownerId, ...toColumns(values) })
        .returning();
      if (!row) {
        throw new DatabaseOperationError("create returned no settings");
      }
      return toSettings(row);
    } catch (err) {
      this.handleError(err, "create", { ownerId });
    }
  }

  async update(
    ownerId: string,
    values: SettingsValues,
    tx: ITransaction,
  ): Promise<Settings> {
    try {
      const [row] = await this.getDbContext(tx)
        .update(settings)
        .set({
          ...toColumns(values),
          // On by at least a millisecond, so the change shows to anyone holding the old value.
          updatedAt: sql`greatest(date_trunc('milliseconds', now()), ${settings.updatedAt} + interval '1 millisecond')`,
        })
        .where(eq(settings.ownerId, ownerId))
        .returning();
      if (!row) {
        throw new DatabaseOperationError("update found no settings");
      }
      return toSettings(row);
    } catch (err) {
      this.handleError(err, "update", { ownerId });
    }
  }
}

function toColumns({ targets, pendingCap }: SettingsValues) {
  return {
    messagesSentTarget: targets.messagesSent,
    conversationsHeldTarget: targets.conversationsHeld,
    applicationsTarget: targets.applications,
    practiceSessionsTarget: targets.practiceSessions,
    screensReachedTarget: targets.screensReached,
    pendingCap,
  };
}

function toSettings(row: SettingsRow): Settings {
  return {
    targets: {
      messagesSent: row.messagesSentTarget,
      conversationsHeld: row.conversationsHeldTarget,
      applications: row.applicationsTarget,
      practiceSessions: row.practiceSessionsTarget,
      screensReached: row.screensReachedTarget,
    },
    pendingCap: row.pendingCap,
    updatedAt: row.updatedAt,
  };
}
