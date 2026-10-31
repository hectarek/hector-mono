import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addSourceUseCase } from "@/src/application/use-cases/sources/add-source.use-case";
import { listSourcesUseCase } from "@/src/application/use-cases/sources/list-sources.use-case";
import { LeadSourcesRepository } from "@/src/infrastructure/repositories/lead-sources.repository";
import { MockLeadSourcesRepository } from "@/src/infrastructure/repositories/lead-sources.repository.mock";
import { addSourceController } from "@/src/interface-adapters/controllers/sources/add-source.controller";
import { listSourcesController } from "@/src/interface-adapters/controllers/sources/list-sources.controller";

// Lead sources (docs/build-plan.md U5).
export function createSourcesModule() {
  const sourcesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    sourcesModule
      .bind(DI_SYMBOLS.ILeadSourcesRepository)
      .toClass(MockLeadSourcesRepository);
  } else {
    sourcesModule
      .bind(DI_SYMBOLS.ILeadSourcesRepository)
      .toClass(LeadSourcesRepository, [DI_SYMBOLS.ILoggerService]);
  }

  sourcesModule
    .bind(DI_SYMBOLS.IAddSourceUseCase)
    .toHigherOrderFunction(addSourceUseCase, [
      DI_SYMBOLS.ILeadSourcesRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  sourcesModule
    .bind(DI_SYMBOLS.IAddSourceController)
    .toHigherOrderFunction(addSourceController, [
      DI_SYMBOLS.IAddSourceUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  sourcesModule
    .bind(DI_SYMBOLS.IListSourcesUseCase)
    .toHigherOrderFunction(listSourcesUseCase, [
      DI_SYMBOLS.ILeadSourcesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);
  sourcesModule
    .bind(DI_SYMBOLS.IListSourcesController)
    .toHigherOrderFunction(listSourcesController, [
      DI_SYMBOLS.IListSourcesUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return sourcesModule;
}
