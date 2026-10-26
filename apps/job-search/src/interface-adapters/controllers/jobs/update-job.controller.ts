import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IUpdateJobUseCase } from "@/src/application/use-cases/jobs/update-job.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type Job, updateJobSchema } from "@/src/entities/models/job.model";

export type IUpdateJobController = ReturnType<typeof updateJobController>;

// update_job's write, and the job form's: a change against the updatedAt read (R22).
export const updateJobController = (
  useCase: IUpdateJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "updateJob" });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = updateJobSchema.safeParse(input);
    if (parseError) {
      logger.warn("update_job input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
