import { beforeEach, describe, expect, it } from "bun:test";
import { sql as drizzleSql } from "drizzle-orm";
import {
  ChangedError,
  DatabaseOperationError,
  NotFoundError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { MockLoggerService } from "@/src/infrastructure/services/mock-logger.service";
import {
  TransactionManagerService,
  unwrapDrizzleTx,
} from "@/src/infrastructure/services/transaction-manager.service";
import { describeEachBackend, makeApp } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

// Whether a table exists, by name: these tests write temporary tables of their own, which roll
// back with their transaction as any write does.
const tableExists = async (name: string) =>
  (
    await sql<{ found: boolean }>(
      "select to_regclass($1) is not null as found",
      [name],
    )
  )[0]?.found;

describe("TransactionManagerService (Postgres)", () => {
  const transactions = new TransactionManagerService(new MockLoggerService());

  beforeEach(resetDatabase);

  it("commits what the callback wrote", async () => {
    await transactions.startTransaction(async (tx) => {
      await unwrapDrizzleTx(tx).execute(
        drizzleSql`create temporary table committed_write (id int)`,
      );
    });
    expect(await tableExists("committed_write")).toBe(true);
    await sql("drop table committed_write");
  });

  it("rolls back on a domain error and passes that error through unchanged", async () => {
    const run = transactions.startTransaction(async (tx) => {
      await unwrapDrizzleTx(tx).execute(
        drizzleSql`create temporary table refused_write (id int)`,
      );
      throw new UnauthorizedError("Only the admin can do this");
    });
    await expect(run).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await tableExists("refused_write")).toBe(false);
  });

  it("wraps unexpected failures as DatabaseOperationError", async () => {
    const run = transactions.startTransaction(async () => {
      throw new Error("driver blew up");
    });
    await expect(run).rejects.toBeInstanceOf(DatabaseOperationError);
  });

  it("sets a Postgres-side statement timeout inside every transaction", async () => {
    const setting = await transactions.startTransaction(async (tx) => {
      const result = await unwrapDrizzleTx(tx).execute(
        drizzleSql`show statement_timeout`,
      );
      return (result as { rows: unknown[] }).rows[0];
    });
    expect(setting).toEqual({ statement_timeout: "15s" });
  });
});

// Use cases throw domain errors inside their transactions and the actions catch them by class,
// so the mock and the real manager must both hand them back as they were thrown.
describeEachBackend("a transaction", () => {
  it("answers with what the callback returns", async () => {
    const { repos } = makeApp();
    expect(await repos.transactions.startTransaction(async () => 42)).toBe(42);
  });

  it("passes a change underneath through unchanged, with its reason", async () => {
    const { repos } = makeApp();
    const thrown = new ChangedError("seats-taken");
    const run = repos.transactions.startTransaction(async () => {
      throw thrown;
    });
    const caught = await run.catch((err: unknown) => err);
    expect(caught).toBe(thrown);
    expect((caught as ChangedError).reason).toBe("seats-taken");
  });

  it("passes a domain error through unchanged", async () => {
    const { repos } = makeApp();
    const thrown = new NotFoundError("No copy with that id");
    const run = repos.transactions.startTransaction(async () => {
      throw thrown;
    });
    expect(await run.catch((err: unknown) => err)).toBe(thrown);
  });
});
