import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IMoveJobUseCase } from "@/src/application/use-cases/jobs/move-job.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type Job, setJobStatusSchema } from "@/src/entities/models/job.model";

export type ISetJobStatusController = ReturnType<typeof setJobStatusController>;

// set_job_status' write: a move to an open status (KTD5).
export const setJobStatusController = (
  useCase: IMoveJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "setJobStatus",
  });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = setJobStatusSchema.safeParse(input);
    if (parseError) {
      logger.warn("set_job_status input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
