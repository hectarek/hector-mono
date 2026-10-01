import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemoveGroceryItemUseCase } from "@/src/application/use-cases/grocery/remove-grocery-item.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ itemId: z.uuid() });

export type IRemoveGroceryItemController = ReturnType<
  typeof removeGroceryItemController
>;

export const removeGroceryItemController = (
  useCase: IRemoveGroceryItemUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removeGroceryItem",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.itemId, userId);
  };
};
