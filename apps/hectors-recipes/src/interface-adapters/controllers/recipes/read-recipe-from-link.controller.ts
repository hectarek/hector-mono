import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IReadRecipeFromLinkUseCase,
  LinkRecipe,
} from "@/src/application/use-cases/recipes/read-recipe-from-link.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

// A link as typed: "budgetbytes.com/…" gets https:// in front.
const inputSchema = z.object({
  url: z.preprocess(
    (value) =>
      typeof value === "string" && !/^[a-z][a-z\d+.-]*:/i.test(value.trim())
        ? `https://${value.trim()}`
        : typeof value === "string"
          ? value.trim()
          : value,
    // A web address has a dot in its host: "toast" is a word, not a site.
    z.url({ protocol: /^https?$/, hostname: /\.[^.]+$/ }).max(2_000),
  ),
});

export type IReadRecipeFromLinkController = ReturnType<
  typeof readRecipeFromLinkController
>;

export const readRecipeFromLinkController = (
  readRecipeFromLinkUseCase: IReadRecipeFromLinkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "readRecipeFromLink",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<LinkRecipe> => {
    logger.debug("Validating read recipe from link input", {
      hasUserId: !!userId,
    });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in to import a recipe");
    }

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return readRecipeFromLinkUseCase(data.url, userId);
  };
};
