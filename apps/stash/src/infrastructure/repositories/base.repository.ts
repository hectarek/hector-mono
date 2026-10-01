import { type Database, db } from "@/db";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { unwrapDrizzleTx } from "@/src/infrastructure/services/transaction-manager.service";

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

  protected handleError(
    error: unknown,
    method: string,
    context?: Record<string, unknown>,
  ): never {
    if (error instanceof DatabaseOperationError) {
      this.logger.error(`${method}: ${error.message}`, context);
      throw error;
    }

    const message = error instanceof Error ? error.message : String(error);
    this.logger.error(`${method}: ${message}`, {
      ...context,
      errorType: error instanceof Error ? error.constructor.name : "unknown",
    });

    throw new DatabaseOperationError(`${method} failed`, { cause: error });
  }
}
