import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IClearCheckedItemsUseCase } from "@/src/application/use-cases/grocery/clear-checked-items.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ spaceId: z.uuid() });

export type IClearCheckedItemsController = ReturnType<
  typeof clearCheckedItemsController
>;

export const clearCheckedItemsController = (
  useCase: IClearCheckedItemsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "clearCheckedItems",
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
