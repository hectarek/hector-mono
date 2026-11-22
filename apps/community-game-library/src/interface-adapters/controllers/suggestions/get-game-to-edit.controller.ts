import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetGameToEditUseCase } from "@/src/application/use-cases/suggestions/get-game-to-edit.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ gameId: z.uuid() });

export type IGetGameToEditController = ReturnType<
  typeof getGameToEditController
>;

// G4's record, for the admin.
export const getGameToEditController = (
  useCase: IGetGameToEditUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getGameToEdit",
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
    return useCase(data.gameId, userId);
  };
};
