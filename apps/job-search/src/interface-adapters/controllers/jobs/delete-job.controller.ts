import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteJobUseCase } from "@/src/application/use-cases/jobs/delete-job.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type DeletedJob, jobIdSchema } from "@/src/entities/models/job.model";

export type IDeleteJobController = ReturnType<typeof deleteJobController>;

// Deleting a job: human-only (R21), so no page tool calls it.
export const deleteJobController = (
  useCase: IDeleteJobUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "controller", op: "deleteJob" });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<DeletedJob> => {
    const { data, error: parseError } = jobIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Delete job input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
