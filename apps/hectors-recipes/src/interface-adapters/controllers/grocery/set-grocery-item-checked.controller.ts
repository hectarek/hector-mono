import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetGroceryItemCheckedUseCase } from "@/src/application/use-cases/grocery/set-grocery-item-checked.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ itemId: z.uuid(), checked: z.boolean() });

export type ISetGroceryItemCheckedController = ReturnType<
  typeof setGroceryItemCheckedController
>;

export const setGroceryItemCheckedController = (
  useCase: ISetGroceryItemCheckedUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "setGroceryItemChecked",
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

    return useCase(data.itemId, data.checked, userId);
  };
};
