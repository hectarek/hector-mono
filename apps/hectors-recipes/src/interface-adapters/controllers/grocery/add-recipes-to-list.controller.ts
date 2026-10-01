import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddRecipesToListUseCase } from "@/src/application/use-cases/grocery/add-recipes-to-list.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import {
  type AddToListResult,
  addRecipesToListSchema,
} from "@/src/entities/models/grocery-item.model";

// The action resolves whose list; by here it is always explicit.
const inputSchema = addRecipesToListSchema.extend({ planId: z.uuid() });

export type IAddRecipesToListController = ReturnType<
  typeof addRecipesToListController
>;

export const addRecipesToListController = (
  useCase: IAddRecipesToListUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addRecipesToList",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<AddToListResult> => {
    logger.debug("Validating input", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return useCase(data.planId, data.recipes, userId, { again: data.again });
  };
};
