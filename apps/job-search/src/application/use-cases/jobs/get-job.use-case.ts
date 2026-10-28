import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { IInteractionsRepository } from "@/src/application/repositories/interactions.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { INotesRepository } from "@/src/application/repositories/notes.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { JobDetail } from "@/src/entities/models/job.model";

export type IGetJobUseCase = ReturnType<typeof getJobUseCase>;

// How many of a job's latest changes get_job answers with.
const RECENT_CHANGES = 10;

// A job as its page and get_job show it (docs/build-plan.md U6, U7): the job, whatever its review,
// with its notes, status moves, latest changes and contacts, and the latest reply linked to it.
export const getJobUseCase = (
  jobsRepository: IJobsRepository,
  notesRepository: INotesRepository,
  activityRepository: IActivityRepository,
  peopleRepository: IPeopleRepository,
  interactionsRepository: IInteractionsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "getJob" });

  return async (
    ownerId: string,
    { id }: { id: string },
  ): Promise<JobDetail> => {
    const job = await jobsRepository.get(ownerId, id);
    if (!job) {
      throw new NotFoundError("Couldn't find that job.");
    }
    const [notes, moves, { entries }, contacts, repliedOn] = await Promise.all([
      notesRepository.list(ownerId, { kind: "job", id }),
      jobsRepository.listStatusChanges(ownerId, id),
      activityRepository.list(ownerId, {
        record: { kind: "job", id },
        limit: RECENT_CHANGES,
        offset: 0,
      }),
      peopleRepository.listForJob(ownerId, id),
      interactionsRepository.repliedOnFor(ownerId, id),
    ]);
    logger.debug("Job read", { jobId: id });
    return { job, notes, moves, activity: entries, contacts, repliedOn };
  };
};
