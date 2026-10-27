import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IReviewProposalUseCase } from "@/src/application/use-cases/jobs/review-proposal.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import { type Job, jobIdSchema } from "@/src/entities/models/job.model";

export type IReopenProposalController = ReturnType<
  typeof reopenProposalController
>;

// Reopening a dismissed proposal: human-only (R21), so no page tool calls it.
export const reopenProposalController = (
  useCase: IReviewProposalUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "reopenProposal",
  });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = jobIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Reopen input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, { ...data, decision: "reopen" });
  };
};
