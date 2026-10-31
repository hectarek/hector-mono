import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetSharedRecipeUseCase } from "@/src/application/use-cases/recipes/get-shared-recipe.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { SharedRecipe } from "@/src/entities/models/recipe.model";

// A link's token as the repository makes it: 18 random bytes in base64url.
const inputSchema = z.object({
  token: z.string().regex(/^[\w-]{24}$/),
});

export type IGetSharedRecipeController = ReturnType<
  typeof getSharedRecipeController
>;

export const getSharedRecipeController = (
  getSharedRecipeUseCase: IGetSharedRecipeUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getSharedRecipe",
  });

  return async (input: unknown): Promise<SharedRecipe> => {
    // No sign-in check: a view-only public link is for someone without an account
    // (docs/ux-plan.md D99), and the link is the access. It gives only what the page shows.
    logger.debug("Validating shared recipe input");

    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid link", { cause: parseError });
    }

    return getSharedRecipeUseCase(data.token);
  };
};
