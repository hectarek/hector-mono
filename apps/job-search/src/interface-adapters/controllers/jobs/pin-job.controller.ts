import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IPinJobUseCase } from "@/src/application/use-cases/jobs/pin-job.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type Job, pinJobSchema } from "@/src/entities/models/job.model";

export type IPinJobController = ReturnType<typeof pinJobController>;

// pin_job's write (R27): pins a job to the top of the ranked list, or unpins it.
export const pinJobController = (
  useCase: IPinJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "pinJob" });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = pinJobSchema.safeParse(input);
    if (parseError) {
      logger.warn("pin_job input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
