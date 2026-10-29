import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { getTodayUseCase } from "@/src/application/use-cases/week/get-today.use-case";
import { getTodayController } from "@/src/interface-adapters/controllers/week/get-today.controller";

// This week (docs/build-plan.md U9, R9, R10): a read over the other modules' repositories.
export function createWeekModule() {
  const weekModule = createModule();

  weekModule
    .bind(DI_SYMBOLS.IGetTodayUseCase)
    .toHigherOrderFunction(getTodayUseCase, [
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IPracticeRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ISettingsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  weekModule
    .bind(DI_SYMBOLS.IGetTodayController)
    .toHigherOrderFunction(getTodayController, [
      DI_SYMBOLS.IGetTodayUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return weekModule;
}
