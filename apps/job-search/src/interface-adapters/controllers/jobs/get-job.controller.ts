import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetJobUseCase } from "@/src/application/use-cases/jobs/get-job.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import { type JobDetail, jobIdSchema } from "@/src/entities/models/job.model";

export type IGetJobController = ReturnType<typeof getJobController>;

// The one read behind a job's page and get_job (docs/build-plan.md KTD4).
export const getJobController = (
  useCase: IGetJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "getJob" });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<JobDetail> => {
    const { data, error: parseError } = jobIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("get_job input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
