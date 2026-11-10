import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { AllowedUserIds } from "@/src/application/use-cases/access/resolve-actor";
import type { IArchiveExpiredUseCase } from "@/src/application/use-cases/jobs/archive-expired.use-case";
import { NotAllowedError } from "@/src/entities/errors/common";

export type IArchiveExpiredController = ReturnType<
  typeof archiveExpiredController
>;

// The daily run's entry (KTD24). No one is signed in, so it acts on the owner's jobs, the owner
// the environment names (KTD2). With that id missing or malformed it does nothing, and says so.
export const archiveExpiredController = (
  useCase: IArchiveExpiredUseCase,
  allowedUserIds: AllowedUserIds,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "archiveExpired",
  });

  return async (): Promise<{ archived: string[] }> => {
    const owner = z.uuid().safeParse(allowedUserIds.ownerUserId);
    if (!owner.success) {
      logger.error(
        "The owner's user id is missing or malformed: the daily run did nothing",
      );
      throw new NotAllowedError();
    }
    return useCase(owner.data);
  };
};
