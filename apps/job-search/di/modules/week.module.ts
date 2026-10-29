import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { getTodayUseCase } from "@/src/application/use-cases/week/get-today.use-case";
import { getWeekUseCase } from "@/src/application/use-cases/week/get-week.use-case";
import { saveWeeklyReviewUseCase } from "@/src/application/use-cases/week/save-weekly-review.use-case";
import { WeeklyReviewsRepository } from "@/src/infrastructure/repositories/weekly-reviews.repository";
import { MockWeeklyReviewsRepository } from "@/src/infrastructure/repositories/weekly-reviews.repository.mock";
import { getTodayController } from "@/src/interface-adapters/controllers/week/get-today.controller";
import { getWeekController } from "@/src/interface-adapters/controllers/week/get-week.controller";
import { saveWeeklyReviewController } from "@/src/interface-adapters/controllers/week/save-weekly-review.controller";

// This week and the weekly review (docs/build-plan.md U9, R9, R10): reads over the other modules'
// repositories, and the reviews' own.
export function createWeekModule() {
  const weekModule = createModule();

  if (process.env.NODE_ENV === "test") {
    weekModule
      .bind(DI_SYMBOLS.IWeeklyReviewsRepository)
      .toClass(MockWeeklyReviewsRepository);
  } else {
    weekModule
      .bind(DI_SYMBOLS.IWeeklyReviewsRepository)
      .toClass(WeeklyReviewsRepository, [DI_SYMBOLS.ILoggerService]);
  }

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

  weekModule
    .bind(DI_SYMBOLS.IGetWeekUseCase)
    .toHigherOrderFunction(getWeekUseCase, [
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IPracticeRepository,
      DI_SYMBOLS.ISettingsRepository,
      DI_SYMBOLS.IWeeklyReviewsRepository,
    ]);
  weekModule
    .bind(DI_SYMBOLS.IGetWeekController)
    .toHigherOrderFunction(getWeekController, [
      DI_SYMBOLS.IGetWeekUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  weekModule
    .bind(DI_SYMBOLS.ISaveWeeklyReviewUseCase)
    .toHigherOrderFunction(saveWeeklyReviewUseCase, [
      DI_SYMBOLS.IWeeklyReviewsRepository,
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IPracticeRepository,
      DI_SYMBOLS.ISettingsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  weekModule
    .bind(DI_SYMBOLS.ISaveWeeklyReviewController)
    .toHigherOrderFunction(saveWeeklyReviewController, [
      DI_SYMBOLS.ISaveWeeklyReviewUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return weekModule;
}
