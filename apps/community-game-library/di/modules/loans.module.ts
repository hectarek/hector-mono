import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { LoansRepository } from "@/src/infrastructure/repositories/loans.repository";
import { MockLoansRepository } from "@/src/infrastructure/repositories/loans.repository.mock";

export function createLoansModule() {
  const loansModule = createModule();

  if (process.env.NODE_ENV === "test") {
    loansModule.bind(DI_SYMBOLS.ILoansRepository).toClass(MockLoansRepository);
  } else {
    loansModule
      .bind(DI_SYMBOLS.ILoansRepository)
      .toClass(LoansRepository, [DI_SYMBOLS.ILoggerService]);
  }

  return loansModule;
}
