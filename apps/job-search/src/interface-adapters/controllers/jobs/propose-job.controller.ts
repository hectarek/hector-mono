import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ICreateJobUseCase } from "@/src/application/use-cases/jobs/create-job.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type Job, proposeJobSchema } from "@/src/entities/models/job.model";

export type IProposeJobController = ReturnType<typeof proposeJobController>;

// propose_job's write (R20): the posting's link, its source and Claude's reason are required.
export const proposeJobController = (
  useCase: ICreateJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "proposeJob" });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = proposeJobSchema.safeParse(input);
    if (parseError) {
      logger.warn("propose_job input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
