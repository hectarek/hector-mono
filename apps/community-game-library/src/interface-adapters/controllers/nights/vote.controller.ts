import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IVoteUseCase } from "@/src/application/use-cases/nights/vote.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.strictObject({
  gameNightId: z.uuid(),
  userGameId: z.uuid(),
  play: z.boolean(),
});

export type IVoteController = ReturnType<typeof voteController>;

// I'd play (D7, D13), or not.
export const voteController = (
  useCase: IVoteUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "vote" });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(
      data.gameNightId,
      { userGameId: data.userGameId, play: data.play },
      userId,
    );
  };
};
