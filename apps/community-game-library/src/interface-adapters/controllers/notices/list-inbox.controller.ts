import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IListInboxUseCase } from "@/src/application/use-cases/notices/list-inbox.use-case";
import { UnauthenticatedError } from "@/src/entities/errors/common";

export type IListInboxController = ReturnType<typeof listInboxController>;

// The inbox (F1) for the signed-in member.
export const listInboxController = (
  useCase: IListInboxUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "listInbox" });

  return async (userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    return useCase(userId);
  };
};
