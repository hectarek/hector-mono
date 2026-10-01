import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICompleteItemUseCase } from "@/src/application/use-cases/stash-items/complete-item.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import type { StashItem } from "@/src/entities/models/stash-item.model";

const inputSchema = z.object({
  itemId: z.uuid(),
});

export type ICompleteItemController = ReturnType<typeof completeItemController>;

export const completeItemController = (
  completeItemUseCase: ICompleteItemUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "completeItem",
  });

  return async (
    input: Partial<z.infer<typeof inputSchema>>,
    userId: string | undefined,
  ): Promise<StashItem> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);

    if (parseError) {
      logger.warn("Input validation failed");
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return completeItemUseCase(data.itemId, userId);
  };
};
