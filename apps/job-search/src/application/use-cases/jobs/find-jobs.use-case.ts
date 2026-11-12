import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { ISettingsRepository } from "@/src/application/repositories/settings.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { rankedList } from "@/src/application/use-cases/jobs/ranked-list";
import {
  type JobPage,
  type JobQuery,
  jobSummary,
} from "@/src/entities/models/job.model";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

export type IFindJobsUseCase = ReturnType<typeof findJobsUseCase>;

// The owner's jobs, a page at a time: the jobs pages, and find_jobs (docs/build-plan.md U6). The
// ranked list (`to-apply`, R27) comes in the rank's order, today's in Eastern time; any other
// query by next date.
export const findJobsUseCase = (
  jobsRepository: IJobsRepository,
  settingsRepository: ISettingsRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "findJobs" });

  const ranked = async (
    ownerId: string,
    { companyId, undated, limit, offset }: JobQuery,
  ): Promise<JobPage> => {
    const jobs = (
      await rankedList(
        jobsRepository,
        settingsRepository,
        ownerId,
        todayIn(PLAN_TIME_ZONE),
      )
    ).filter(
      (job) =>
        (!companyId || job.company.id === companyId) &&
        (!undated || (job.nextStep !== null && job.nextDate === null)),
    );
    return {
      jobs: jobs.slice(offset, offset + limit).map(jobSummary),
      nextOffset: jobs.length > offset + limit ? offset + limit : null,
    };
  };

  return async (ownerId: string, query: JobQuery): Promise<JobPage> => {
    const page =
      query.status === "to-apply"
        ? await ranked(ownerId, query)
        : await jobsRepository.find(ownerId, query);
    logger.debug("Jobs found", { count: page.jobs.length });
    return page;
  };
};
