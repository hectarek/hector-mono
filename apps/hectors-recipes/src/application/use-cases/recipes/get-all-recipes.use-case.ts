import type { IRecipesRepository } from "@/src/application/repositories/recipes.repository.interface";
import type { ISpacesRepository } from "@/src/application/repositories/spaces.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  buildLibraryView,
  type LibraryFilter,
  type LibraryView,
} from "@/src/entities/library";

export type IGetAllRecipesUseCase = ReturnType<typeof getAllRecipesUseCase>;

// Every book the user is in, as one library ("All recipes"). Being in a book is the access
// check: only their own memberships are read.
export const getAllRecipesUseCase = (
  recipesRepository: IRecipesRepository,
  spacesRepository: ISpacesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getAllRecipes",
  });

  return async (
    userId: string,
    filter: LibraryFilter = {},
  ): Promise<LibraryView> => {
    const books = await spacesRepository.listForUser(userId, "recipe-book");
    const recipes = (
      await Promise.all(
        books.map((book) => recipesRepository.getBySpace(book.id)),
      )
    )
      .flat()
      .sort((a, b) => a.title.localeCompare(b.title));

    logger.debug("Recipes fetched", {
      books: books.length,
      count: recipes.length,
    });
    return buildLibraryView(recipes, filter);
  };
};
