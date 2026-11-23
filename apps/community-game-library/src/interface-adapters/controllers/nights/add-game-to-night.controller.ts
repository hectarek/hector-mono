import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddGameToNightUseCase } from "@/src/application/use-cases/nights/add-game-to-night.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.strictObject({
  gameNightId: z.uuid(),
  userGameIds: z.array(z.uuid()).min(1).max(100),
});

export type IAddGameToNightController = ReturnType<
  typeof addGameToNightController
>;

// I'll bring a game (D6 from a night): the copies ticked, by id.
export const addGameToNightController = (
  useCase: IAddGameToNightUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addGameToNight",
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
    return useCase(data.gameNightId, data.userGameIds, userId);
  };
};
