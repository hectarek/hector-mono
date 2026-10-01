import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddGroceryItemUseCase } from "@/src/application/use-cases/grocery/add-grocery-item.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { addGroceryItemSchema } from "@/src/entities/models/grocery-item.model";

const inputSchema = addGroceryItemSchema;

export type IAddGroceryItemController = ReturnType<
  typeof addGroceryItemController
>;

export const addGroceryItemController = (
  useCase: IAddGroceryItemUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addGroceryItem",
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

    return useCase(data.spaceId, data.text, userId);
  };
};
