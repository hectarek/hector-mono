import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IMoveJobUseCase } from "@/src/application/use-cases/jobs/move-job.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { closeJobSchema, type Job } from "@/src/entities/models/job.model";

export type ICloseJobController = ReturnType<typeof closeJobController>;

// close_job's write: a move to a closed status, with a reason (KTD5).
export const closeJobController = (
  useCase: IMoveJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "closeJob" });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = closeJobSchema.safeParse(input);
    if (parseError) {
      logger.warn("close_job input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
