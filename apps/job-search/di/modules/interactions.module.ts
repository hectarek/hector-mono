import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { deleteInteractionUseCase } from "@/src/application/use-cases/interactions/delete-interaction.use-case";
import { logInteractionUseCase } from "@/src/application/use-cases/interactions/log-interaction.use-case";
import { InteractionsRepository } from "@/src/infrastructure/repositories/interactions.repository";
import { MockInteractionsRepository } from "@/src/infrastructure/repositories/interactions.repository.mock";
import { deleteInteractionController } from "@/src/interface-adapters/controllers/interactions/delete-interaction.controller";
import { logInteractionController } from "@/src/interface-adapters/controllers/interactions/log-interaction.controller";

// Interactions with people: the dated outreach log (docs/build-plan.md U7, KTD9).
export function createInteractionsModule() {
  const interactionsModule = createModule();

  if (process.env.NODE_ENV === "test") {
    interactionsModule
      .bind(DI_SYMBOLS.IInteractionsRepository)
      .toClass(MockInteractionsRepository);
  } else {
    interactionsModule
      .bind(DI_SYMBOLS.IInteractionsRepository)
      .toClass(InteractionsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  interactionsModule
    .bind(DI_SYMBOLS.ILogInteractionUseCase)
    .toHigherOrderFunction(logInteractionUseCase, [
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IPeopleRepository,
      DI_SYMBOLS.IJobsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  interactionsModule
    .bind(DI_SYMBOLS.ILogInteractionController)
    .toHigherOrderFunction(logInteractionController, [
      DI_SYMBOLS.ILogInteractionUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  interactionsModule
    .bind(DI_SYMBOLS.IDeleteInteractionUseCase)
    .toHigherOrderFunction(deleteInteractionUseCase, [
      DI_SYMBOLS.IInteractionsRepository,
      DI_SYMBOLS.IActivityRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.ILoggerService,
    ]);
  interactionsModule
    .bind(DI_SYMBOLS.IDeleteInteractionController)
    .toHigherOrderFunction(deleteInteractionController, [
      DI_SYMBOLS.IDeleteInteractionUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return interactionsModule;
}
