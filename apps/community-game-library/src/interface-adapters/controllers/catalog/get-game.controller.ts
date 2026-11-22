import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  GameView,
  IGetGameUseCase,
} from "@/src/application/use-cases/catalog/get-game.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const inputSchema = z.object({ gameId: z.uuid() });

export type IGetGameController = ReturnType<typeof getGameController>;

// Which game, for the signed-in member, on the plan's today (KTD9): a copy's due date reads
// against it.
export const getGameController = (
  useCase: IGetGameUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "getGame" });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<GameView> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.gameId, userId, todayIn(PLAN_TIME_ZONE));
  };
};
