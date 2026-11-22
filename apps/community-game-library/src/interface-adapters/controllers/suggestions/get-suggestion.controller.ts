import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetSuggestionUseCase } from "@/src/application/use-cases/suggestions/get-suggestion.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({ suggestionId: z.uuid() });

export type IGetSuggestionController = ReturnType<
  typeof getSuggestionController
>;

// G2's suggestion, for the admin.
export const getSuggestionController = (
  useCase: IGetSuggestionUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getSuggestion",
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
    return useCase(data.suggestionId, userId);
  };
};
