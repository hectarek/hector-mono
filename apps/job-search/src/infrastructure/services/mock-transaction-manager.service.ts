import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";

// Runs one transaction at a time, as PGlite's one connection does, so two writes started together
// settle here as the database's locks settle them (a duplicate posting, the pending cap): the
// second sees the first's rows.
export class MockTransactionManagerService
  implements ITransactionManagerService
{
  private running: Promise<unknown> = Promise.resolve();

  async startTransaction<T>(
    callback: (tx: ITransaction) => Promise<T>,
  ): Promise<T> {
    const mockTx: ITransaction = {
      rollback: () => {},
    };
    const run = this.running.then(() => callback(mockTx));
    this.running = run.catch(() => {});
    return run;
  }
}
