import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { addGroceryItemUseCase } from "@/src/application/use-cases/grocery/add-grocery-item.use-case";
import { addPlanToListUseCase } from "@/src/application/use-cases/grocery/add-plan-to-list.use-case";
import { addRecipesToListUseCase } from "@/src/application/use-cases/grocery/add-recipes-to-list.use-case";
import { clearCheckedItemsUseCase } from "@/src/application/use-cases/grocery/clear-checked-items.use-case";
import { getGroceryListUseCase } from "@/src/application/use-cases/grocery/get-grocery-list.use-case";
import { listMealsToAddUseCase } from "@/src/application/use-cases/grocery/list-meals-to-add.use-case";
import { removeGroceryItemUseCase } from "@/src/application/use-cases/grocery/remove-grocery-item.use-case";
import { setGroceryItemCheckedUseCase } from "@/src/application/use-cases/grocery/set-grocery-item-checked.use-case";
import { updateGroceryItemUseCase } from "@/src/application/use-cases/grocery/update-grocery-item.use-case";
import { GroceryItemsRepository } from "@/src/infrastructure/repositories/grocery-items.repository";
import { MockGroceryItemsRepository } from "@/src/infrastructure/repositories/grocery-items.repository.mock";
import { addGroceryItemController } from "@/src/interface-adapters/controllers/grocery/add-grocery-item.controller";
import { addPlanToListController } from "@/src/interface-adapters/controllers/grocery/add-plan-to-list.controller";
import { addRecipesToListController } from "@/src/interface-adapters/controllers/grocery/add-recipes-to-list.controller";
import { clearCheckedItemsController } from "@/src/interface-adapters/controllers/grocery/clear-checked-items.controller";
import { getGroceryListController } from "@/src/interface-adapters/controllers/grocery/get-grocery-list.controller";
import { listMealsToAddController } from "@/src/interface-adapters/controllers/grocery/list-meals-to-add.controller";
import { removeGroceryItemController } from "@/src/interface-adapters/controllers/grocery/remove-grocery-item.controller";
import { setGroceryItemCheckedController } from "@/src/interface-adapters/controllers/grocery/set-grocery-item-checked.controller";
import { updateGroceryItemController } from "@/src/interface-adapters/controllers/grocery/update-grocery-item.controller";

export function createGroceryModule() {
  const groceryModule = createModule();

  if (process.env.NODE_ENV === "test") {
    groceryModule
      .bind(DI_SYMBOLS.IGroceryItemsRepository)
      .toClass(MockGroceryItemsRepository);
  } else {
    groceryModule
      .bind(DI_SYMBOLS.IGroceryItemsRepository)
      .toClass(GroceryItemsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const readDeps = [
    DI_SYMBOLS.IGroceryItemsRepository,
    DI_SYMBOLS.ISpacesRepository,
    DI_SYMBOLS.ILoggerService,
  ];
  // Writes also tell the plan's channel that its list changed.
  const writeDeps = [
    DI_SYMBOLS.IGroceryItemsRepository,
    DI_SYMBOLS.ISpacesRepository,
    DI_SYMBOLS.IRealtimeService,
    DI_SYMBOLS.ILoggerService,
  ];

  groceryModule
    .bind(DI_SYMBOLS.IGetGroceryListUseCase)
    .toHigherOrderFunction(getGroceryListUseCase, readDeps);
  groceryModule
    .bind(DI_SYMBOLS.IAddGroceryItemUseCase)
    .toHigherOrderFunction(addGroceryItemUseCase, writeDeps);
  groceryModule
    .bind(DI_SYMBOLS.ISetGroceryItemCheckedUseCase)
    .toHigherOrderFunction(setGroceryItemCheckedUseCase, writeDeps);
  groceryModule
    .bind(DI_SYMBOLS.IRemoveGroceryItemUseCase)
    .toHigherOrderFunction(removeGroceryItemUseCase, writeDeps);
  groceryModule
    .bind(DI_SYMBOLS.IUpdateGroceryItemUseCase)
    .toHigherOrderFunction(updateGroceryItemUseCase, writeDeps);
  groceryModule
    .bind(DI_SYMBOLS.IClearCheckedItemsUseCase)
    .toHigherOrderFunction(clearCheckedItemsUseCase, writeDeps);
  groceryModule
    .bind(DI_SYMBOLS.IAddRecipesToListUseCase)
    .toHigherOrderFunction(addRecipesToListUseCase, [
      DI_SYMBOLS.IGroceryItemsRepository,
      DI_SYMBOLS.IRecipesRepository,
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.IRealtimeService,
      DI_SYMBOLS.ILoggerService,
    ]);
  groceryModule
    .bind(DI_SYMBOLS.IAddPlanToListUseCase)
    .toHigherOrderFunction(addPlanToListUseCase, [
      DI_SYMBOLS.IGroceryItemsRepository,
      DI_SYMBOLS.IPlanEntriesRepository,
      DI_SYMBOLS.IRecipesRepository,
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ITransactionManagerService,
      DI_SYMBOLS.IRealtimeService,
      DI_SYMBOLS.ILoggerService,
    ]);
  groceryModule
    .bind(DI_SYMBOLS.IListMealsToAddUseCase)
    .toHigherOrderFunction(listMealsToAddUseCase, [
      DI_SYMBOLS.IPlanEntriesRepository,
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);

  for (const [controllerSymbol, controller, useCaseSymbol] of [
    [
      DI_SYMBOLS.IGetGroceryListController,
      getGroceryListController,
      DI_SYMBOLS.IGetGroceryListUseCase,
    ],
    [
      DI_SYMBOLS.IAddGroceryItemController,
      addGroceryItemController,
      DI_SYMBOLS.IAddGroceryItemUseCase,
    ],
    [
      DI_SYMBOLS.ISetGroceryItemCheckedController,
      setGroceryItemCheckedController,
      DI_SYMBOLS.ISetGroceryItemCheckedUseCase,
    ],
    [
      DI_SYMBOLS.IRemoveGroceryItemController,
      removeGroceryItemController,
      DI_SYMBOLS.IRemoveGroceryItemUseCase,
    ],
    [
      DI_SYMBOLS.IUpdateGroceryItemController,
      updateGroceryItemController,
      DI_SYMBOLS.IUpdateGroceryItemUseCase,
    ],
    [
      DI_SYMBOLS.IClearCheckedItemsController,
      clearCheckedItemsController,
      DI_SYMBOLS.IClearCheckedItemsUseCase,
    ],
    [
      DI_SYMBOLS.IAddRecipesToListController,
      addRecipesToListController,
      DI_SYMBOLS.IAddRecipesToListUseCase,
    ],
    [
      DI_SYMBOLS.IAddPlanToListController,
      addPlanToListController,
      DI_SYMBOLS.IAddPlanToListUseCase,
    ],
    [
      DI_SYMBOLS.IListMealsToAddController,
      listMealsToAddController,
      DI_SYMBOLS.IListMealsToAddUseCase,
    ],
  ] as const) {
    groceryModule
      .bind(controllerSymbol)
      .toHigherOrderFunction(controller, [
        useCaseSymbol,
        DI_SYMBOLS.ILoggerService,
      ]);
  }

  return groceryModule;
}
