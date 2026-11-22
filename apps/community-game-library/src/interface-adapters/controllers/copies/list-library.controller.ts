import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  IListLibraryUseCase,
  Library,
} from "@/src/application/use-cases/copies/list-library.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";
import { parseLibraryView } from "@/src/entities/library-filters";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IListLibraryController = ReturnType<typeof listLibraryController>;

// All friends for the signed-in member, filtered and sorted as the page's address says (R13).
// An address value the list doesn't know is left out, as if it weren't there, since a shared
// link may be older than the filters.
export const listLibraryController = (
  useCase: IListLibraryUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listLibrary",
  });

  return async (
    params: Record<string, string | string[] | undefined>,
    userId: string | undefined,
  ): Promise<Library> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId, todayIn(PLAN_TIME_ZONE), parseLibraryView(params));
  };
};
