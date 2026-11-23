import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemoveGameFromNightUseCase } from "@/src/application/use-cases/nights/remove-game-from-night.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.strictObject({
  gameNightId: z.uuid(),
  userGameId: z.uuid(),
});

export type IRemoveGameFromNightController = ReturnType<
  typeof removeGameFromNightController
>;

// A game unticked on D6, off the table.
export const removeGameFromNightController = (
  useCase: IRemoveGameFromNightUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removeGameFromNight",
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
    return useCase(data.gameNightId, data.userGameId, userId);
  };
};
