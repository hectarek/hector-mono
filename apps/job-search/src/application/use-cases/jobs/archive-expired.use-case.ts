import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IMoveJobUseCase } from "@/src/application/use-cases/jobs/move-job.use-case";
import { ConflictError, NotFoundError } from "@/src/entities/errors/common";
import { EXPIRED_REASON, isExpired } from "@/src/entities/rank";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IArchiveExpiredUseCase = ReturnType<typeof archiveExpiredUseCase>;

// The daily run (KTD24): each job that left the ranked list untouched, unpinned and its posting
// more than 21 days old, is archived as skipped, "Not picked in time", by the system. It goes
// through the status move, so the job's history, its dated move and the week's counts record it.
// Each move is made against the updatedAt read, so a job pinned, moved or deleted meanwhile is
// left as it is, and a second run finds nothing more to do. Answers the jobs it archived.
export const archiveExpiredUseCase = (
  jobsRepository: IJobsRepository,
  moveJobUseCase: IMoveJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "archiveExpired",
  });

  return async (ownerId: string): Promise<{ archived: string[] }> => {
    const today = todayIn(PLAN_TIME_ZONE);
    const expired = (await jobsRepository.listToApply(ownerId)).filter((job) =>
      isExpired(job, today),
    );
    const archived: string[] = [];
    for (const { id, updatedAt } of expired) {
      try {
        await moveJobUseCase(
          { actor: "system", ownerId },
          { id, status: "skipped", reason: EXPIRED_REASON, updatedAt },
        );
        archived.push(id);
      } catch (err) {
        if (!(err instanceof ConflictError || err instanceof NotFoundError)) {
          throw err;
        }
      }
    }
    logger.info("Expired jobs archived", {
      archived: archived.length,
      left: expired.length - archived.length,
    });
    return { archived };
  };
};
