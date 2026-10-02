import { describe, expect, it } from "bun:test";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import {
  DatabaseOperationError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import {
  TransactionManagerService,
  unwrapDrizzleTx,
} from "@/src/infrastructure/services/transaction-manager.service";

const transactions = new TransactionManagerService(new MockLoggerService());

async function tableExists(name: string): Promise<boolean> {
  const result = await db.execute(
    sql`select to_regclass(${name}) is not null as "exists"`,
  );
  return (result.rows[0] as { exists: boolean }).exists;
}

describe("TransactionManagerService (Postgres)", () => {
  it("rolls back on a domain error and passes that error through unchanged", async () => {
    const denial = new UnauthorizedError("Cannot modify this item");
    const run = transactions.startTransaction(async (tx) => {
      // The test database has no stash tables, so the write is a table of its own.
      await unwrapDrizzleTx(tx).execute(sql`create table written (id int)`);
      throw denial;
    });
    await expect(run).rejects.toBe(denial);
    expect(await tableExists("written")).toBe(false);
  });

  it("wraps unexpected failures as DatabaseOperationError", async () => {
    const run = transactions.startTransaction(async () => {
      throw new Error("driver blew up");
    });
    await expect(run).rejects.toThrow(
      new DatabaseOperationError("Transaction failed"),
    );
    await expect(run).rejects.toBeInstanceOf(DatabaseOperationError);
  });

  it("sets a Postgres-side statement timeout inside every transaction", async () => {
    const setting = await transactions.startTransaction(async (tx) => {
      const result = await unwrapDrizzleTx(tx).execute(
        sql`show statement_timeout`,
      );
      return (result as { rows: unknown[] }).rows[0];
    });
    expect(setting).toEqual({ statement_timeout: "15s" });
  });
});
