import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetGroceryListUseCase } from "@/src/application/use-cases/grocery/get-grocery-list.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { GroceryItem } from "@/src/entities/models/grocery-item.model";

const inputSchema = z.object({ spaceId: z.uuid() });

export type IGetGroceryListController = ReturnType<
  typeof getGroceryListController
>;

export const getGroceryListController = (
  useCase: IGetGroceryListUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getGroceryList",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<GroceryItem[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.spaceId, userId);
  };
};
