import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateGroceryItemUseCase } from "@/src/application/use-cases/grocery/update-grocery-item.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { updateGroceryItemSchema } from "@/src/entities/models/grocery-item.model";

export type IUpdateGroceryItemController = ReturnType<
  typeof updateGroceryItemController
>;

export const updateGroceryItemController = (
  useCase: IUpdateGroceryItemUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateGroceryItem",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } =
      updateGroceryItemSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.itemId, data.text, userId);
  };
};
