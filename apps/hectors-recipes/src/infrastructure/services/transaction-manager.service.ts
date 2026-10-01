import type { ExtractTablesWithRelations } from "drizzle-orm";
import { sql, TransactionRollbackError } from "drizzle-orm";
import type { PgQueryResultHKT, PgTransaction } from "drizzle-orm/pg-core";
import { db } from "@/db";
import type * as schema from "@/db/schema";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import {
  DatabaseOperationError,
  InputParseError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";

const DOMAIN_ERRORS = [
  DatabaseOperationError,
  InputParseError,
  NotFoundError,
  UnauthenticatedError,
  UnauthorizedError,
];

type DrizzleTx = PgTransaction<
  PgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;

const TX_BRAND = "DrizzleTransaction" as const;
const STATEMENT_TIMEOUT_MS = 15_000;

class DrizzleTransactionWrapper implements ITransaction {
  readonly _brand = TX_BRAND;
  private completed = false;

  constructor(readonly _internal: DrizzleTx) {}

  rollback(): void {
    if (this.completed) {
      throw new Error("Transaction already completed");
    }
    this.completed = true;
    this._internal.rollback();
  }

  markCompleted(): void {
    this.completed = true;
  }
}

export function unwrapDrizzleTx(tx: ITransaction): DrizzleTx {
  if ("_brand" in tx && (tx as DrizzleTransactionWrapper)._brand === TX_BRAND) {
    return (tx as DrizzleTransactionWrapper)._internal;
  }
  throw new Error("Unknown transaction type");
}

export class TransactionManagerService implements ITransactionManagerService {
  private readonly logger: ILoggerService;

  constructor(logger: ILoggerService) {
    this.logger = logger.child({ layer: "service", op: "transaction" });
  }

  async startTransaction<T>(
    callback: (tx: ITransaction) => Promise<T>,
  ): Promise<T> {
    this.logger.debug("Starting transaction");

    try {
      const result = await db.transaction(async (drizzleTx) => {
        // Postgres cancels a statement stuck past this and the transaction rolls back.
        // (A timer racing the transaction instead reported failure while the work
        // carried on and could still commit.)
        await drizzleTx.execute(
          sql.raw(`set local statement_timeout = ${STATEMENT_TIMEOUT_MS}`),
        );
        const wrapper = new DrizzleTransactionWrapper(drizzleTx);

        try {
          const value = await callback(wrapper);
          wrapper.markCompleted();
          return value;
        } catch (err) {
          wrapper.markCompleted();
          throw err;
        }
      });

      this.logger.debug("Transaction committed");
      return result;
    } catch (err) {
      if (err instanceof TransactionRollbackError) {
        this.logger.warn("Transaction rolled back");
        throw err;
      }

      // Domain errors (auth denials, not-found, validation) must reach the caller unchanged.
      if (DOMAIN_ERRORS.some((ErrorClass) => err instanceof ErrorClass)) {
        this.logger.debug("Transaction rolled back by domain error", {
          error: err instanceof Error ? err.message : String(err),
        });
        throw err;
      }

      this.logger.error("Transaction failed", {
        error: err instanceof Error ? err.message : String(err),
      });
      throw new DatabaseOperationError("Transaction failed", { cause: err });
    }
  }
}
