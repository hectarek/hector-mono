import type { IStashItemsRepository } from "@/src/application/repositories/stash-items.repository.interface";
import type { IAuthenticationService } from "@/src/application/services/authentication.service.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import type { IAddItemUseCase } from "@/src/application/use-cases/stash-items/add-item.use-case";
import type { ICompleteItemUseCase } from "@/src/application/use-cases/stash-items/complete-item.use-case";
import type { IDeleteItemUseCase } from "@/src/application/use-cases/stash-items/delete-item.use-case";
import type { IGetStashItemsUseCase } from "@/src/application/use-cases/stash-items/get-stash-items.use-case";
import type { IAddItemController } from "@/src/interface-adapters/controllers/stash-items/add-item.controller";
import type { ICompleteItemController } from "@/src/interface-adapters/controllers/stash-items/complete-item.controller";
import type { IDeleteItemController } from "@/src/interface-adapters/controllers/stash-items/delete-item.controller";
import type { IGetStashItemsController } from "@/src/interface-adapters/controllers/stash-items/get-stash-items.controller";

export const DI_SYMBOLS = {
  IAuthenticationService: Symbol.for("IAuthenticationService"),
  ILoggerService: Symbol.for("ILoggerService"),
  ITransactionManagerService: Symbol.for("ITransactionManagerService"),

  IStashItemsRepository: Symbol.for("IStashItemsRepository"),

  IAddItemUseCase: Symbol.for("IAddItemUseCase"),
  IGetStashItemsUseCase: Symbol.for("IGetStashItemsUseCase"),
  ICompleteItemUseCase: Symbol.for("ICompleteItemUseCase"),
  IDeleteItemUseCase: Symbol.for("IDeleteItemUseCase"),

  IAddItemController: Symbol.for("IAddItemController"),
  IGetStashItemsController: Symbol.for("IGetStashItemsController"),
  ICompleteItemController: Symbol.for("ICompleteItemController"),
  IDeleteItemController: Symbol.for("IDeleteItemController"),
};

export interface DI_RETURN_TYPES {
  IAuthenticationService: IAuthenticationService;
  ILoggerService: ILoggerService;
  ITransactionManagerService: ITransactionManagerService;

  IStashItemsRepository: IStashItemsRepository;

  IAddItemUseCase: IAddItemUseCase;
  IGetStashItemsUseCase: IGetStashItemsUseCase;
  ICompleteItemUseCase: ICompleteItemUseCase;
  IDeleteItemUseCase: IDeleteItemUseCase;

  IAddItemController: IAddItemController;
  IGetStashItemsController: IGetStashItemsController;
  ICompleteItemController: ICompleteItemController;
  IDeleteItemController: IDeleteItemController;
}
