import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISuggestGameUseCase } from "@/src/application/use-cases/suggestions/suggest-game.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { photoSchema } from "@/src/entities/profile-photo";
import {
  optionalLink,
  optionalText,
  optionalYear,
  requiredTitle,
} from "@/src/interface-adapters/controllers/suggestions/form-fields";

const inputSchema = z.object({
  title: requiredTitle,
  year: optionalYear,
  publisher: optionalText(200),
  sourceUrl: optionalLink,
  photo: photoSchema.nullable(),
});

export type ISuggestGameController = ReturnType<typeof suggestGameController>;

// B9's Send, for the signed-in member.
export const suggestGameController = (
  useCase: ISuggestGameUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "suggestGame",
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
    const { photo, ...form } = data;
    return useCase(form, photo, userId);
  };
};
