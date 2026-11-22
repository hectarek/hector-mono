import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemoveUserGameUseCase } from "@/src/application/use-cases/copies/remove-user-game.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ userGameId: z.uuid() });

export type IRemoveUserGameController = ReturnType<
  typeof removeUserGameController
>;

// Remove a copy (B14), or I own it's Undo.
export const removeUserGameController = (
  useCase: IRemoveUserGameUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removeUserGame",
  });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.userGameId, userId);
  };
};
