import { beforeEach, describe, expect, it } from "bun:test";
import { sql as drizzleSql } from "drizzle-orm";
import {
  DatabaseOperationError,
  UnauthorizedError,
} from "@/src/entities/errors/common";
import { unwrapDrizzleTx } from "@/src/infrastructure/services/transaction-manager.service";
import { OWNER, postgresRepositories } from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";

describe("TransactionManagerService (Postgres)", () => {
  let repos: ReturnType<typeof postgresRepositories>;

  beforeEach(async () => {
    await resetDatabase();
    repos = postgresRepositories();
  });

  it("commits what the callback wrote", async () => {
    await repos.transactions.startTransaction((tx) =>
      repos.spaces.create({ type: "meal-plan", name: "Plan" }, OWNER, tx),
    );
    expect(await sql("select 1 from spaces")).toHaveLength(1);
  });

  it("rolls back on a domain error and passes that error through unchanged", async () => {
    const run = repos.transactions.startTransaction(async (tx) => {
      await repos.spaces.create({ type: "meal-plan", name: "Plan" }, OWNER, tx);
      throw new UnauthorizedError("No access");
    });
    await expect(run).rejects.toBeInstanceOf(UnauthorizedError);
    expect(await sql("select 1 from spaces")).toEqual([]);
  });

  it("wraps unexpected failures as DatabaseOperationError", async () => {
    const run = repos.transactions.startTransaction(async () => {
      throw new Error("driver blew up");
    });
    await expect(run).rejects.toBeInstanceOf(DatabaseOperationError);
  });

  it("sets a Postgres-side statement timeout inside every transaction", async () => {
    const setting = await repos.transactions.startTransaction(async (tx) => {
      const result = await unwrapDrizzleTx(tx).execute(
        drizzleSql`show statement_timeout`,
      );
      return (result as { rows: unknown[] }).rows[0];
    });
    expect(setting).toEqual({ statement_timeout: "15s" });
  });
});
