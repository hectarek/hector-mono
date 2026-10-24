import type { ITransaction } from "@/src/entities/models/transaction.model";

export interface ITransactionManagerService {
  startTransaction<T>(callback: (tx: ITransaction) => Promise<T>): Promise<T>;
}
