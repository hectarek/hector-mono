import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateUserGameUseCase } from "@/src/application/use-cases/copies/update-user-game.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { copyFormSchema } from "@/src/entities/models/user-game.model";

const inputSchema = copyFormSchema.extend({ userGameId: z.uuid() });

export type IUpdateUserGameController = ReturnType<
  typeof updateUserGameController
>;

// B7's Save: which copy, and its condition, missing parts and expansions.
export const updateUserGameController = (
  useCase: IUpdateUserGameUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateUserGame",
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
    return useCase(
      data.userGameId,
      {
        condition: data.condition,
        conditionNote: data.conditionNote,
        expansionIds: data.expansionIds,
      },
      userId,
    );
  };
};
