import { beforeEach, describe, expect, it } from "bun:test";
import { sql as drizzleSql } from "drizzle-orm";
import {
  DatabaseOperationError,
  NotFoundError,
} from "@/src/entities/errors/common";
import { ActivityRepository } from "@/src/infrastructure/repositories/activity.repository";
import {
  TransactionManagerService,
  unwrapDrizzleTx,
} from "@/src/infrastructure/services/transaction-manager.service";
import { OWNER } from "@/tests/_support/app";
import { resetDatabase } from "@/tests/_support/database";
import { RecordingLogger } from "@/tests/_support/logger";

// A field value as a record would carry it (a company's name, a note). Fictional, and it must
// never reach the logs: they carry error classes, codes and record ids only (docs/build-plan.md
// KTD20).
const VALUE = "Fictional Widgets Ltd";

describe("what the transaction manager logs", () => {
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
        throw new NotFoundError(`No company named ${VALUE}`);
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

  it("logs a database error that carries the query's parameters by class, code and record ids, never a field value", async () => {
    const logger = new RecordingLogger();
    const write = new TransactionManagerService(logger).startTransaction((tx) =>
      new ActivityRepository(logger).add(
        {
          ownerId: OWNER,
          actor: "owner",
          tool: null,
          // Not an id: Postgres refuses it and quotes it back.
          record: { kind: "company", id: VALUE },
          action: "created",
          changes: [{ field: "name", before: null, after: VALUE }],
          reason: null,
        },
        tx,
      ),
    );

    await expect(write).rejects.toBeInstanceOf(DatabaseOperationError);
    expect(logger.text).not.toContain(VALUE);
    expect(logger.lines).toContainEqual({
      level: "error",
      message: "add failed",
      context: {
        layer: "repository",
        op: "activity",
        ownerId: OWNER,
        errorClass: "DrizzleQueryError",
        errorCode: "22P02",
      },
    });
  });
});
