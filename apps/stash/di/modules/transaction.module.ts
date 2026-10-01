import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { MockTransactionManagerService } from "@/src/infrastructure/services/mock-transaction-manager.service";
import { TransactionManagerService } from "@/src/infrastructure/services/transaction-manager.service";

export function createTransactionModule() {
  const transactionModule = createModule();

  if (process.env.NODE_ENV === "test") {
    transactionModule
      .bind(DI_SYMBOLS.ITransactionManagerService)
      .toClass(MockTransactionManagerService);
  } else {
    transactionModule
      .bind(DI_SYMBOLS.ITransactionManagerService)
      .toClass(TransactionManagerService, [DI_SYMBOLS.ILoggerService]);
  }

  return transactionModule;
}
