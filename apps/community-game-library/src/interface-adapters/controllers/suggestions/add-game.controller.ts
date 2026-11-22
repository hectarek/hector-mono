import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IAddGameUseCase } from "@/src/application/use-cases/suggestions/add-game.use-case";
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
  photo: photoSchema.nullable(),
  suggestionId: z
    .union([z.uuid(), z.literal("")])
    .transform((value) => (value === "" ? null : value)),
});

export type IAddGameController = ReturnType<typeof addGameController>;

// G3's Add, for the admin: from a suggestion (G2's Add it by hand) or not.
export const addGameController = (
  useCase: IAddGameUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "addGame",
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
    return useCase(gameRecordOf(data), data.photo, data.suggestionId, userId);
  };
};
