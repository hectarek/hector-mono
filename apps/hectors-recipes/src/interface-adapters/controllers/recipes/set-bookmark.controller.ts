import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISetBookmarkUseCase } from "@/src/application/use-cases/recipes/set-bookmark.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { setBookmarkSchema } from "@/src/entities/models/bookmark.model";

export type ISetBookmarkController = ReturnType<typeof setBookmarkController>;

export const setBookmarkController = (
  setBookmarkUseCase: ISetBookmarkUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "setBookmark",
  });

  return async (input: unknown, userId: string | undefined): Promise<void> => {
    logger.debug("Setting bookmark", { hasUserId: !!userId });

    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }

    const { data, error: parseError } = setBookmarkSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }

    return setBookmarkUseCase(userId, data.recipeId, data.saved);
  };
};
