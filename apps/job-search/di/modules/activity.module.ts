import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { listActivityUseCase } from "@/src/application/use-cases/activity/list-activity.use-case";
import { ActivityRepository } from "@/src/infrastructure/repositories/activity.repository";
import { MockActivityRepository } from "@/src/infrastructure/repositories/activity.repository.mock";
import { listActivityController } from "@/src/interface-adapters/controllers/activity/list-activity.controller";

export function createActivityModule() {
  const activityModule = createModule();

  if (process.env.NODE_ENV === "test") {
    activityModule
      .bind(DI_SYMBOLS.IActivityRepository)
      .toClass(MockActivityRepository);
  } else {
    activityModule
      .bind(DI_SYMBOLS.IActivityRepository)
      .toClass(ActivityRepository, [DI_SYMBOLS.ILoggerService]);
  }

  activityModule
    .bind(DI_SYMBOLS.IListActivityUseCase)
    .toHigherOrderFunction(listActivityUseCase, [
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  activityModule
    .bind(DI_SYMBOLS.IListActivityController)
    .toHigherOrderFunction(listActivityController, [
      DI_SYMBOLS.IListActivityUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return activityModule;
}
