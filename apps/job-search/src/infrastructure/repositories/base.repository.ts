import { sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { type Database, db } from "@/db";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import { loggable } from "@/src/entities/errors/loggable";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { unwrapDrizzleTx } from "@/src/infrastructure/services/transaction-manager.service";

// What an update sets updated_at to: now, or a millisecond on from the value it holds when now
// isn't later (two updates in one transaction, where now() stands still). So a change always
// shows to anyone holding the old value (R22, KTD15); the mocks' nextUpdatedAt does the same.
export const nextUpdatedAt = (column: AnyPgColumn) =>
  sql`greatest(date_trunc('milliseconds', now()), ${column} + interval '1 millisecond')`;

export abstract class BaseRepository {
  protected readonly logger: ILoggerService;

  constructor(logger: ILoggerService, layer: string) {
    this.logger = logger.child({ layer: "repository", op: layer });
  }

  protected getDbContext(tx?: ITransaction): Database {
    if (tx) {
      return unwrapDrizzleTx(tx) as unknown as Database;
    }
    return db;
  }

  // Logs which method failed, the error's class and code, and the record ids it's given, never
  // the error's message: a failed query's carries its parameters, which hold names, notes and
  // pay (docs/build-plan.md KTD20). So `ids` holds ids only.
  protected handleError(
    error: unknown,
    method: string,
    ids?: Record<string, string>,
  ): never {
    this.logger.error(`${method} failed`, { ...ids, ...loggable(error) });
    if (error instanceof DatabaseOperationError) {
      throw error;
    }
    throw new DatabaseOperationError(`${method} failed`, { cause: error });
  }
}
