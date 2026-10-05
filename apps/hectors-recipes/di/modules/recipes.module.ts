import { createModule } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "@/di/types";
import { adoptRecipesUseCase } from "@/src/application/use-cases/recipes/adopt-recipes.use-case";
import { createRecipeUseCase } from "@/src/application/use-cases/recipes/create-recipe.use-case";
import { deleteRecipeUseCase } from "@/src/application/use-cases/recipes/delete-recipe.use-case";
import { getAllRecipesUseCase } from "@/src/application/use-cases/recipes/get-all-recipes.use-case";
import { getRecipeUseCase } from "@/src/application/use-cases/recipes/get-recipe.use-case";
import { getRecipesUseCase } from "@/src/application/use-cases/recipes/get-recipes.use-case";
import { updateRecipeUseCase } from "@/src/application/use-cases/recipes/update-recipe.use-case";
import { RecipesRepository } from "@/src/infrastructure/repositories/recipes.repository";
import { MockRecipesRepository } from "@/src/infrastructure/repositories/recipes.repository.mock";
import { TagsRepository } from "@/src/infrastructure/repositories/tags.repository";
import { MockTagsRepository } from "@/src/infrastructure/repositories/tags.repository.mock";
import { adoptRecipesController } from "@/src/interface-adapters/controllers/recipes/adopt-recipes.controller";
import { createRecipeController } from "@/src/interface-adapters/controllers/recipes/create-recipe.controller";
import { deleteRecipeController } from "@/src/interface-adapters/controllers/recipes/delete-recipe.controller";
import { getAllRecipesController } from "@/src/interface-adapters/controllers/recipes/get-all-recipes.controller";
import { getRecipeController } from "@/src/interface-adapters/controllers/recipes/get-recipe.controller";
import { getRecipesController } from "@/src/interface-adapters/controllers/recipes/get-recipes.controller";
import { updateRecipeController } from "@/src/interface-adapters/controllers/recipes/update-recipe.controller";

export function createRecipesModule() {
  const recipesModule = createModule();

  if (process.env.NODE_ENV === "test") {
    recipesModule
      .bind(DI_SYMBOLS.IRecipesRepository)
      .toClass(MockRecipesRepository);
    recipesModule.bind(DI_SYMBOLS.ITagsRepository).toClass(MockTagsRepository);
  } else {
    recipesModule
      .bind(DI_SYMBOLS.IRecipesRepository)
      .toClass(RecipesRepository, [DI_SYMBOLS.ILoggerService]);
    recipesModule
      .bind(DI_SYMBOLS.ITagsRepository)
      .toClass(TagsRepository, [DI_SYMBOLS.ILoggerService]);
  }

  const writeDeps = [
    DI_SYMBOLS.IRecipesRepository,
    DI_SYMBOLS.ISpacesRepository,
    DI_SYMBOLS.ITransactionManagerService,
    DI_SYMBOLS.ILoggerService,
  ];

  // Saving a recipe also gives its new tags their groups.
  const saveDeps = [
    DI_SYMBOLS.IRecipesRepository,
    DI_SYMBOLS.ITagsRepository,
    DI_SYMBOLS.ISpacesRepository,
    DI_SYMBOLS.ITransactionManagerService,
    DI_SYMBOLS.ILoggerService,
  ];

  recipesModule
    .bind(DI_SYMBOLS.ICreateRecipeUseCase)
    .toHigherOrderFunction(createRecipeUseCase, saveDeps);

  recipesModule
    .bind(DI_SYMBOLS.IUpdateRecipeUseCase)
    .toHigherOrderFunction(updateRecipeUseCase, saveDeps);

  recipesModule
    .bind(DI_SYMBOLS.IDeleteRecipeUseCase)
    .toHigherOrderFunction(deleteRecipeUseCase, writeDeps);

  recipesModule
    .bind(DI_SYMBOLS.IGetRecipesUseCase)
    .toHigherOrderFunction(getRecipesUseCase, [
      DI_SYMBOLS.IRecipesRepository,
      DI_SYMBOLS.ITagsRepository,
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.IGetAllRecipesUseCase)
    .toHigherOrderFunction(getAllRecipesUseCase, [
      DI_SYMBOLS.IRecipesRepository,
      DI_SYMBOLS.ITagsRepository,
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.IGetRecipeUseCase)
    .toHigherOrderFunction(getRecipeUseCase, [
      DI_SYMBOLS.IRecipesRepository,
      DI_SYMBOLS.ISpacesRepository,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.IGetRecipeController)
    .toHigherOrderFunction(getRecipeController, [
      DI_SYMBOLS.IGetRecipeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.ICreateRecipeController)
    .toHigherOrderFunction(createRecipeController, [
      DI_SYMBOLS.ICreateRecipeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.IGetRecipesController)
    .toHigherOrderFunction(getRecipesController, [
      DI_SYMBOLS.IGetRecipesUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.IGetAllRecipesController)
    .toHigherOrderFunction(getAllRecipesController, [
      DI_SYMBOLS.IGetAllRecipesUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.IUpdateRecipeController)
    .toHigherOrderFunction(updateRecipeController, [
      DI_SYMBOLS.IUpdateRecipeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.IDeleteRecipeController)
    .toHigherOrderFunction(deleteRecipeController, [
      DI_SYMBOLS.IDeleteRecipeUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  recipesModule
    .bind(DI_SYMBOLS.IAdoptRecipesUseCase)
    .toHigherOrderFunction(adoptRecipesUseCase, writeDeps);
  recipesModule
    .bind(DI_SYMBOLS.IAdoptRecipesController)
    .toHigherOrderFunction(adoptRecipesController, [
      DI_SYMBOLS.IAdoptRecipesUseCase,
      DI_SYMBOLS.ILoggerService,
    ]);

  return recipesModule;
}
