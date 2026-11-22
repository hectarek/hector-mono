import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  ISearchGamesUseCase,
  SearchResults,
} from "@/src/application/use-cases/catalog/search-games.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

// What's typed: a title is never this long, so more is someone pasting something else.
const inputSchema = z.object({ q: z.string().max(200) });

export type ISearchGamesController = ReturnType<typeof searchGamesController>;

// The search box's words, for the signed-in member, on the plan's today (KTD9).
export const searchGamesController = (
  useCase: ISearchGamesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "searchGames",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<SearchResults> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.q, userId, todayIn(PLAN_TIME_ZONE));
  };
};
