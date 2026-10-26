import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IFindJobsUseCase } from "@/src/application/use-cases/jobs/find-jobs.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { findJobsSchema, type JobPage } from "@/src/entities/models/job.model";

export type IFindJobsController = ReturnType<typeof findJobsController>;

// The one read behind the jobs pages and find_jobs (docs/build-plan.md KTD4).
export const findJobsController = (
  useCase: IFindJobsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "findJobs" });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<JobPage> => {
    const { data, error: parseError } = findJobsSchema.safeParse(input);
    if (parseError) {
      logger.warn("find_jobs input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
