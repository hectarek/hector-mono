import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addPlanEntryUseCase } from "@/src/application/use-cases/plan/add-plan-entry.use-case";
import { changeEntryDaysUseCase } from "@/src/application/use-cases/plan/change-entry-days.use-case";
import { getWeekPlanUseCase } from "@/src/application/use-cases/plan/get-week-plan.use-case";
import { removePlanEntryUseCase } from "@/src/application/use-cases/plan/remove-plan-entry.use-case";
import { setEntryCookedUseCase } from "@/src/application/use-cases/plan/set-entry-cooked.use-case";
import { PlanEntriesRepository } from "@/src/infrastructure/repositories/plan-entries.repository";
import { MockPlanEntriesRepository } from "@/src/infrastructure/repositories/plan-entries.repository.mock";
import { addPlanEntryController } from "@/src/interface-adapters/controllers/plan/add-plan-entry.controller";
import { changeEntryDaysController } from "@/src/interface-adapters/controllers/plan/change-entry-days.controller";
import { getWeekPlanController } from "@/src/interface-adapters/controllers/plan/get-week-plan.controller";
import { removePlanEntryController } from "@/src/interface-adapters/controllers/plan/remove-plan-entry.controller";
import { setEntryCookedController } from "@/src/interface-adapters/controllers/plan/set-entry-cooked.controller";

export function createPlanModule() {
  const planModule = createModule();

  if (process.env.NODE_ENV === "test") {
    planModule
      .bind(DI_SYMBOLS.IPlanEntriesRepository)
      .toClass(MockPlanEntriesRepository);
  } else {
    planModule
      .bind(DI_SYMBOLS.IPlanEntriesRepository)
      .toClass(PlanEntriesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const entryDeps = [
    DI_SYMBOLS.IPlanEntriesRepository,
    DI_SYMBOLS.ISpacesRepository,
    DI_SYMBOLS.ITransactionManagerService,
    DI_SYMBOLS.ILoggerService,
  ];

  planModule
    .bind(DI_SYMBOLS.IGetWeekPlanUseCase)
    .toHigherOrderFunction(getWeekPlanUseCase, [
      DI_SYMBOLS.IPlanEntriesRepository,
      DI_SYMBOLS.IRecipesRepository,
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  planModule
    .bind(DI_SYMBOLS.ISetEntryCookedUseCase)
    .toHigherOrderFunction(setEntryCookedUseCase, entryDeps);
  planModule
    .bind(DI_SYMBOLS.IChangeEntryDaysUseCase)
    .toHigherOrderFunction(changeEntryDaysUseCase, entryDeps);
  planModule
    .bind(DI_SYMBOLS.IRemovePlanEntryUseCase)
    .toHigherOrderFunction(removePlanEntryUseCase, entryDeps);
  planModule
    .bind(DI_SYMBOLS.IAddPlanEntryUseCase)
    .toHigherOrderFunction(addPlanEntryUseCase, [
      DI_SYMBOLS.IPlanEntriesRepository,
      DI_SYMBOLS.IRecipesRepository,
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);

  for (const [controllerSymbol, controller, useCaseSymbol] of [
    [
      DI_SYMBOLS.IGetWeekPlanController,
      getWeekPlanController,
      DI_SYMBOLS.IGetWeekPlanUseCase,
    ],
    [
      DI_SYMBOLS.IAddPlanEntryController,
      addPlanEntryController,
      DI_SYMBOLS.IAddPlanEntryUseCase,
    ],
    [
      DI_SYMBOLS.ISetEntryCookedController,
      setEntryCookedController,
      DI_SYMBOLS.ISetEntryCookedUseCase,
    ],
    [
      DI_SYMBOLS.IChangeEntryDaysController,
      changeEntryDaysController,
      DI_SYMBOLS.IChangeEntryDaysUseCase,
    ],
    [
      DI_SYMBOLS.IRemovePlanEntryController,
      removePlanEntryController,
      DI_SYMBOLS.IRemovePlanEntryUseCase,
    ],
  ] as const) {
    planModule
      .bind(controllerSymbol)
      .toHigherOrderFunction(controller, [
        useCaseSymbol,
        DI_SYMBOLS.ILoggerService,
      ]);
  }

  return planModule;
}
