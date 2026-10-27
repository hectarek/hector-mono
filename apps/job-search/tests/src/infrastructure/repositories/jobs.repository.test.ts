import { beforeEach, describe, expect, it } from "bun:test";
import { sql as query } from "drizzle-orm";
import { DatabaseOperationError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import { postingKey } from "@/src/entities/posting-link";
import { unwrapDrizzleTx } from "@/src/infrastructure/services/transaction-manager.service";
import {
  ANOTHER_OWNER,
  describeEachBackend,
  makeApp,
  OWNER,
  postgresRepositories,
  type TestApp,
} from "@/tests/_support/app";
import { resetDatabase, sql } from "@/tests/_support/database";
import { jobFixtures, newPosting } from "@/tests/_support/jobs";

const THEM: ChangeContext = { actor: "owner", ownerId: ANOTHER_OWNER };
const THEIR_CLAUDE: ChangeContext = {
  actor: "agent",
  ownerId: ANOTHER_OWNER,
  tool: "propose_job",
};

describeEachBackend("the jobs repository", () => {
  let app: TestApp;
  let jobs: ReturnType<typeof jobFixtures>;

  beforeEach(() => {
    app = makeApp();
    jobs = jobFixtures(app);
  });

  // KTD2: every query takes the owner's id, and another owner's jobs stay out of it.
  it("keeps another owner's jobs out of every read and write", async () => {
    const posting = newPosting();
    const key = postingKey(posting);
    if (!key) {
      throw new Error("A Greenhouse posting has a key");
    }
    const initech = await jobs.company("Initech", ANOTHER_OWNER);
    const theirs = await jobs.add(initech, { postingUrl: posting }, THEM);
    const moved = await app.moveJob(THEM, { id: theirs.id, status: "target" });
    await jobs.propose(initech, {}, THEIR_CLAUDE);
    const repo = app.repos.jobs;

    await app.repos.transactions.startTransaction(async (tx) => {
      expect(await repo.findByPostingKey(OWNER, key, tx)).toBeUndefined();
      expect(await repo.countPending(OWNER, tx)).toBe(0);
      expect(await repo.getForUpdate(OWNER, theirs.id, tx)).toBeUndefined();
      expect(await repo.countForCompany(OWNER, initech, tx)).toEqual({
        pending: 0,
        accepted: 0,
        dismissed: 0,
      });
      await repo.delete(OWNER, theirs.id, tx);
    });
    await expect(
      app.repos.transactions.startTransaction((tx) =>
        repo.update(OWNER, theirs.id, { role: "Gadget tester" }, tx),
      ),
    ).rejects.toBeInstanceOf(DatabaseOperationError);
    expect(await repo.listStatusChanges(OWNER, theirs.id)).toEqual([]);

    expect(await repo.get(ANOTHER_OWNER, theirs.id)).toEqual(moved);
    expect(await repo.listStatusChanges(ANOTHER_OWNER, theirs.id)).toHaveLength(
      1,
    );
  });

  // R22: two changes in one millisecond still differ, so the second still conflicts with the
  // first. Inside one transaction Postgres's now() stands still.
  it("moves updatedAt on with every update, two in one transaction included", async () => {
    const job = await jobs.add(await jobs.company());
    const [first, second] = await app.repos.transactions.startTransaction(
      async (tx) => [
        await app.repos.jobs.update(
          OWNER,
          job.id,
          { role: "Gadget tester" },
          tx,
        ),
        await app.repos.jobs.update(
          OWNER,
          job.id,
          { role: "Anvil tester" },
          tx,
        ),
      ],
    );

    expect(first?.updatedAt.getTime()).toBeGreaterThan(job.updatedAt.getTime());
    expect(second?.updatedAt.getTime()).toBeGreaterThan(
      first?.updatedAt.getTime() ?? 0,
    );
  });
});

// What only the database shows: the lock itself (KTD8). On Neon each request has a connection of
// its own, and two proposals at once are kept apart by this lock alone.
describe("the queue's lock [postgres]", () => {
  beforeEach(resetDatabase);

  // Read through the transaction's own connection: PGlite has one, so sql() would wait for it.
  const advisoryLocks = async (tx: ITransaction) => {
    const result: unknown = await unwrapDrizzleTx(tx).execute(
      query`select count(*)::int as held from pg_locks where locktype = 'advisory'`,
    );
    return typeof result === "object" && result !== null && "rows" in result
      ? result.rows
      : undefined;
  };

  it("holds one advisory lock until the transaction ends", async () => {
    const repos = postgresRepositories();

    const held = await repos.transactions.startTransaction(async (tx) => {
      await repos.jobs.lockQueue(OWNER, tx);
      return advisoryLocks(tx);
    });

    expect(held).toEqual([{ held: 1 }]);
    expect(
      await sql(
        "select count(*)::int as held from pg_locks where locktype = 'advisory'",
      ),
    ).toEqual([{ held: 0 }]);
  });
});
