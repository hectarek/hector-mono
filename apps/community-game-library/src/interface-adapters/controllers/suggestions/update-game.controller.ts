import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateGameUseCase } from "@/src/application/use-cases/suggestions/update-game.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { photoSchema } from "@/src/entities/profile-photo";
import {
  gameRecordOf,
  gameRecordSchema,
} from "@/src/interface-adapters/controllers/suggestions/form-fields";

const inputSchema = gameRecordSchema.extend({
  gameId: z.uuid(),
  photo: photoSchema.nullable(),
});

export type IUpdateGameController = ReturnType<typeof updateGameController>;

// G4's Save, for the admin.
export const updateGameController = (
  useCase: IUpdateGameUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "updateGame",
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
    return useCase(data.gameId, gameRecordOf(data), data.photo, userId);
  };
};
