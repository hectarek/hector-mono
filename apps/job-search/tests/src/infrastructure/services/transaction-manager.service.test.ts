import { beforeEach, describe, expect, it } from "bun:test";
import { ConflictError } from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";
import { resetDatabase } from "@/tests/_support/database";

describe("TransactionManagerService (Postgres)", () => {
  beforeEach(resetDatabase);

  // A write finds its record changed inside its transaction (R22), and the action must still
  // see a conflict, with the current record, to answer `conflict` rather than a failure.
  it("passes a conflict through unchanged, current record and all", async () => {
    const current = { name: "Fictional Co" };
    const run = new TransactionManagerService(
      new MockLoggerService(),
    ).startTransaction(async () => {
      throw new ConflictError(current);
    });

    const err = await run.catch((caught: unknown) => caught);
    expect(err).toBeInstanceOf(ConflictError);
    expect((err as ConflictError).current).toBe(current);
  });
});
