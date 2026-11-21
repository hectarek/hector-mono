import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type { ITransaction } from "@/src/entities/models/transaction.model";

export class MockTransactionManagerService
  implements ITransactionManagerService
{
  async startTransaction<T>(
    callback: (tx: ITransaction) => Promise<T>,
  ): Promise<T> {
    const mockTx: ITransaction = {
      rollback: () => {},
    };
    return callback(mockTx);
  }
}
