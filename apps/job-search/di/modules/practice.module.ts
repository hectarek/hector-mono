import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { deletePracticeEntryUseCase } from "@/src/application/use-cases/practice/delete-practice-entry.use-case";
import { getPracticeSessionUseCase } from "@/src/application/use-cases/practice/get-practice-session.use-case";
import { listPracticeUseCase } from "@/src/application/use-cases/practice/list-practice.use-case";
import { logPracticeUseCase } from "@/src/application/use-cases/practice/log-practice.use-case";
import { PracticeRepository } from "@/src/infrastructure/repositories/practice.repository";
import { MockPracticeRepository } from "@/src/infrastructure/repositories/practice.repository.mock";
import { deletePracticeEntryController } from "@/src/interface-adapters/controllers/practice/delete-practice-entry.controller";
import { getPracticeSessionController } from "@/src/interface-adapters/controllers/practice/get-practice-session.controller";
import { listPracticeController } from "@/src/interface-adapters/controllers/practice/list-practice.controller";
import { logPracticeController } from "@/src/interface-adapters/controllers/practice/log-practice.controller";

// The practice log: sessions and their spaced reviews (docs/build-plan.md U8, R11).
export function createPracticeModule() {
  const practiceModule = createModule();

  if (process.env.NODE_ENV === "test") {
    practiceModule
      .bind(DI_SYMBOLS.IPracticeRepository)
      .toClass(MockPracticeRepository);
  } else {
    practiceModule
      .bind(DI_SYMBOLS.IPracticeRepository)
      .toClass(PracticeRepository, [DI_SYMBOLS.ILoggerService]);
  }

  practiceModule
    .bind(DI_SYMBOLS.IListPracticeUseCase)
    .toHigherOrderFunction(listPracticeUseCase, [
      DI_SYMBOLS.IPracticeRepository,
    ]);
  practiceModule
    .bind(DI_SYMBOLS.IListPracticeController)
    .toHigherOrderFunction(listPracticeController, [
      DI_SYMBOLS.IListPracticeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  practiceModule
    .bind(DI_SYMBOLS.IGetPracticeSessionUseCase)
    .toHigherOrderFunction(getPracticeSessionUseCase, [
      DI_SYMBOLS.IPracticeRepository,
    ]);
  practiceModule
    .bind(DI_SYMBOLS.IGetPracticeSessionController)
    .toHigherOrderFunction(getPracticeSessionController, [
      DI_SYMBOLS.IGetPracticeSessionUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  practiceModule
    .bind(DI_SYMBOLS.ILogPracticeUseCase)
    .toHigherOrderFunction(logPracticeUseCase, [
      DI_SYMBOLS.IPracticeRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  practiceModule
    .bind(DI_SYMBOLS.ILogPracticeController)
    .toHigherOrderFunction(logPracticeController, [
      DI_SYMBOLS.ILogPracticeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  practiceModule
    .bind(DI_SYMBOLS.IDeletePracticeEntryUseCase)
    .toHigherOrderFunction(deletePracticeEntryUseCase, [
      DI_SYMBOLS.IPracticeRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  practiceModule
    .bind(DI_SYMBOLS.IDeletePracticeEntryController)
    .toHigherOrderFunction(deletePracticeEntryController, [
      DI_SYMBOLS.IDeletePracticeEntryUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return practiceModule;
}
