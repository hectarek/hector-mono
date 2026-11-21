import { beforeEach, describe, expect, it } from "bun:test";
import { sql as drizzleSql } from "drizzle-orm";
import {
  DatabaseOperationError,
  NotFoundError,
} from "@/src/entities/errors/common";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { BaseRepository } from "@/src/infrastructure/repositories/base.repository";
import {
  TransactionManagerService,
  unwrapDrizzleTx,
} from "@/src/infrastructure/services/transaction-manager.service";
import { resetDatabase } from "@/tests/_support/database";
import { RecordingLogger } from "@/tests/_support/logger";

// A field value as a row would carry it: a friend's phone number. Fictional, and it must never
// reach the logs: they carry error classes, codes and record ids only (docs/build-plan.md KTD1).
const VALUE = "555-0142";
const RECORD_ID = "00000000-0000-4000-8000-0000000000c1";

// A repository as every one is written: it reads through getDbContext and hands its failures to
// handleError with the record's id. This one's query always fails, quoting the value.
class FailingRepository extends BaseRepository {
  async refuse(tx?: ITransaction): Promise<void> {
    try {
      await this.getDbContext(tx).execute(drizzleSql`select ${VALUE}::int`);
    } catch (err) {
      this.handleError(err, "refuse", { copyId: RECORD_ID });
    }
  }
}

describe("what the transaction manager logs", () => {
  beforeEach(resetDatabase);

  it("logs a failed query by error class and code, never the query's parameters", async () => {
    const logger = new RecordingLogger();
    const run = new TransactionManagerService(logger).startTransaction(
      async (tx) => {
        // Postgres refuses the value as a number, and its error, like the query error around
        // it, quotes the value.
        await unwrapDrizzleTx(tx).execute(drizzleSql`select ${VALUE}::int`);
      },
    );

    await expect(run).rejects.toBeInstanceOf(DatabaseOperationError);
    expect(logger.text).not.toContain(VALUE);
    expect(logger.lines).toContainEqual({
      level: "error",
      message: "Transaction failed",
      context: {
        layer: "service",
        op: "transaction",
        errorClass: "DrizzleQueryError",
        errorCode: "22P02",
      },
    });
  });

  it("logs a domain error by its class, never its message", async () => {
    const logger = new RecordingLogger();
    const run = new TransactionManagerService(logger).startTransaction(
      async () => {
        throw new NotFoundError(`No friend with the phone ${VALUE}`);
      },
    );

    await expect(run).rejects.toBeInstanceOf(NotFoundError);
    expect(logger.text).not.toContain(VALUE);
    expect(logger.lines).toContainEqual(
      expect.objectContaining({
        context: expect.objectContaining({ errorClass: "NotFoundError" }),
      }),
    );
  });
});

describe("what a repository logs", () => {
  beforeEach(resetDatabase);

  it("logs a failed query by method, class, code and record id, never a field value", async () => {
    const logger = new RecordingLogger();
    const run = new FailingRepository(logger, "copies").refuse();

    await expect(run).rejects.toBeInstanceOf(DatabaseOperationError);
    expect(logger.text).not.toContain(VALUE);
    expect(logger.lines).toEqual([
      {
        level: "error",
        message: "refuse failed",
        context: {
          layer: "repository",
          op: "copies",
          copyId: RECORD_ID,
          errorClass: "DrizzleQueryError",
          errorCode: "22P02",
        },
      },
    ]);
  });

  it("reads inside the transaction it's given", async () => {
    const logger = new RecordingLogger();
    const run = new TransactionManagerService(logger).startTransaction((tx) =>
      new FailingRepository(logger, "copies").refuse(tx),
    );

    // The repository's DatabaseOperationError passes through the transaction unchanged.
    const err = await run.catch((caught: unknown) => caught);
    expect(err).toBeInstanceOf(DatabaseOperationError);
    expect((err as Error).message).toBe("refuse failed");
    expect(logger.text).not.toContain(VALUE);
  });
});
