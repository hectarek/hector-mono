import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListCategoriesUseCase } from "@/src/application/use-cases/suggestions/list-categories.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListCategoriesController = ReturnType<
  typeof listCategoriesController
>;

// G3's and G4's categories, for the admin.
export const listCategoriesController = (
  useCase: IListCategoriesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listCategories",
  });

  return async (userId: string | undefined) => {
    logger.debug("Checking the user", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
