import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IWhatToPlayUseCase } from "@/src/application/use-cases/nights/what-to-play.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ gameNightId: z.uuid() });

export type IWhatToPlayController = ReturnType<typeof whatToPlayController>;

// What should we play? (D8) for a night the member can see.
export const whatToPlayController = (
  useCase: IWhatToPlayUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "whatToPlay" });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.gameNightId, userId);
  };
};
