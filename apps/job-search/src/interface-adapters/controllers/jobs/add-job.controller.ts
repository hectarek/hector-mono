import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICreateJobUseCase } from "@/src/application/use-cases/jobs/create-job.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { addJobSchema, type Job } from "@/src/entities/models/job.model";

export type IAddJobController = ReturnType<typeof addJobController>;

// The add-job form's write: the posting's link is optional.
export const addJobController = (
  useCase: ICreateJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "addJob" });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = addJobSchema.safeParse(input);
    if (parseError) {
      logger.warn("Add job input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
