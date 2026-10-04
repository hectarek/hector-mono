import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IClearGroceryListUseCase } from "@/src/application/use-cases/grocery/clear-grocery-list.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ spaceId: z.uuid() });

export type IClearGroceryListController = ReturnType<
  typeof clearGroceryListController
>;

export const clearGroceryListController = (
  useCase: IClearGroceryListUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "clearGroceryList",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<number> => {
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
