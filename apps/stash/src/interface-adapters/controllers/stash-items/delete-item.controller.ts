import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteItemUseCase } from "@/src/application/use-cases/stash-items/delete-item.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  itemId: z.uuid(),
});

export type IDeleteItemController = ReturnType<typeof deleteItemController>;

export const deleteItemController = (
  deleteItemUseCase: IDeleteItemUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deleteItem",
  });

  return async (
    input: Partial<z.infer<typeof inputSchema>>,
    userId: string | undefined,
  ): Promise<void> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);

    if (parseError) {
      logger.warn("Input validation failed");
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    await deleteItemUseCase(data.itemId, userId);
  };
};
