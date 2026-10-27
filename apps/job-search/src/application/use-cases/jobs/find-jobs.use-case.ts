import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { JobPage, JobQuery } from "@/src/entities/models/job.model";

export type IFindJobsUseCase = ReturnType<typeof findJobsUseCase>;

// The owner's jobs, a page at a time: the jobs pages, and find_jobs (docs/build-plan.md U6).
// Accepted jobs unless the query names another review state (KTD8).
export const findJobsUseCase = (
  jobsRepository: IJobsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "findJobs" });

  return async (ownerId: string, query: JobQuery): Promise<JobPage> => {
    const page = await jobsRepository.find(ownerId, query);
    logger.debug("Jobs found", { count: page.jobs.length });
    return page;
  };
};
