import type { IRecipeReadsRepository } from "@/src/application/repositories/recipe-reads.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import {
  DAILY_RECIPE_READS,
  readWindowStart,
} from "@/src/entities/models/recipe-draft.model";

export type IGetReadsLeftUseCase = ReturnType<typeof getReadsLeftUseCase>;

// How many AI reads this person has left in the last 24 hours (D48), so the import screens
// can say the limit is reached before a read is tried (docs/ux-map.md, P25.1).
export const getReadsLeftUseCase = (
  recipeReadsRepository: IRecipeReadsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "getReadsLeft",
  });

  return async (userId: string): Promise<number> => {
    const made = await recipeReadsRepository.count(userId, readWindowStart());
    logger.debug("Reads counted", { made });
    return Math.max(0, DAILY_RECIPE_READS - made);
  };
};
