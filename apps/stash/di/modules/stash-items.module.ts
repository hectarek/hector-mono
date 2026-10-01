import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addItemUseCase } from "@/src/application/use-cases/stash-items/add-item.use-case";
import { completeItemUseCase } from "@/src/application/use-cases/stash-items/complete-item.use-case";
import { deleteItemUseCase } from "@/src/application/use-cases/stash-items/delete-item.use-case";
import { getStashItemsUseCase } from "@/src/application/use-cases/stash-items/get-stash-items.use-case";
import { StashItemsRepository } from "@/src/infrastructure/repositories/stash-items.repository";
import { MockStashItemsRepository } from "@/src/infrastructure/repositories/stash-items.repository.mock";

import { addItemController } from "@/src/interface-adapters/controllers/stash-items/add-item.controller";
import { completeItemController } from "@/src/interface-adapters/controllers/stash-items/complete-item.controller";
import { deleteItemController } from "@/src/interface-adapters/controllers/stash-items/delete-item.controller";
import { getStashItemsController } from "@/src/interface-adapters/controllers/stash-items/get-stash-items.controller";

export function createStashItemsModule() {
  const stashModule = createModule();

  if (process.env.NODE_ENV === "test") {
    stashModule
      .bind(DI_SYMBOLS.IStashItemsRepository)
      .toClass(MockStashItemsRepository);
  } else {
    stashModule
      .bind(DI_SYMBOLS.IStashItemsRepository)
      .toClass(StashItemsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  stashModule
    .bind(DI_SYMBOLS.IAddItemUseCase)
    .toHigherOrderFunction(addItemUseCase, [
      DI_SYMBOLS.IStashItemsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);

  stashModule
    .bind(DI_SYMBOLS.IGetStashItemsUseCase)
    .toHigherOrderFunction(getStashItemsUseCase, [
      DI_SYMBOLS.IStashItemsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);

  stashModule
    .bind(DI_SYMBOLS.ICompleteItemUseCase)
    .toHigherOrderFunction(completeItemUseCase, [
      DI_SYMBOLS.IStashItemsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);

  stashModule
    .bind(DI_SYMBOLS.IDeleteItemUseCase)
    .toHigherOrderFunction(deleteItemUseCase, [
      DI_SYMBOLS.IStashItemsRepository,
      DI_SYMBOLS.ILoggerService,
    ]);

  stashModule
    .bind(DI_SYMBOLS.IAddItemController)
    .toHigherOrderFunction(addItemController, [
      DI_SYMBOLS.IAddItemUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  stashModule
    .bind(DI_SYMBOLS.IGetStashItemsController)
    .toHigherOrderFunction(getStashItemsController, [
      DI_SYMBOLS.IGetStashItemsUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  stashModule
    .bind(DI_SYMBOLS.ICompleteItemController)
    .toHigherOrderFunction(completeItemController, [
      DI_SYMBOLS.ICompleteItemUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  stashModule
    .bind(DI_SYMBOLS.IDeleteItemController)
    .toHigherOrderFunction(deleteItemController, [
      DI_SYMBOLS.IDeleteItemUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return stashModule;
}
