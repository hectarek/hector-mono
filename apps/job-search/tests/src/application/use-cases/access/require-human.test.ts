import { beforeEach, expect, it } from "bun:test";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { requireHuman } from "@/src/application/use-cases/access/require-human";
import { HumanOnlyError } from "@/src/entities/errors/common";
import type {
  ChangeContext,
  RecordRef,
} from "@/src/entities/models/activity.model";
import type { ITransaction } from "@/src/entities/models/transaction.model";
import {
  describeEachBackend,
  makeApp,
  OWNER,
  type TestApp,
} from "@/tests/_support/app";

const JOB: RecordRef = {
  kind: "job",
  id: "00000000-0000-4000-8000-0000000000b1",
};

describeEachBackend("requireHuman", () => {
  let app: TestApp;
  let opened: number;
  let deleted: boolean;

  beforeEach(() => {
    app = makeApp();
    opened = 0;
    deleted = false;
  });

  // The backend's transactions, counted as they open.
  const counting = (
    transactions: ITransactionManagerService,
  ): ITransactionManagerService => ({
    startTransaction: <T>(callback: (tx: ITransaction) => Promise<T>) => {
      opened += 1;
      return transactions.startTransaction(callback);
    },
  });

  // Deleting a job, as an operation only Hector may do runs: the check first, then the
  // operation's own transaction.
  async function deleteJob(context: ChangeContext): Promise<void> {
    const transactions = counting(app.repos.transactions);
    await requireHuman(app.repos.activity, transactions, context, {
      record: JOB,
      operation: "delete",
    });
    await transactions.startTransaction(async () => {
      deleted = true;
    });
  }

  const history = async () =>
    (await app.listActivity(OWNER, { limit: 20, offset: 0 })).entries;

  it("refuses Claude with one refused row, written in its own transaction, before the operation's transaction opens", async () => {
    await expect(
      deleteJob({ actor: "agent", ownerId: OWNER }),
    ).rejects.toBeInstanceOf(HumanOnlyError);

    expect(deleted).toBe(false);
    expect(opened).toBe(1);
    expect(await history()).toEqual([
      expect.objectContaining({
        actor: "agent",
        tool: null,
        record: JOB,
        action: "refused",
        changes: [],
        reason: "delete",
      }),
    ]);
  });

  it("lets Hector through, recording nothing of its own", async () => {
    await deleteJob({ actor: "owner", ownerId: OWNER });

    expect(deleted).toBe(true);
    expect(await history()).toEqual([]);
  });
});
