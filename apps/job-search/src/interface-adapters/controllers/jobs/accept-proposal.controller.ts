import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IReviewProposalUseCase } from "@/src/application/use-cases/jobs/review-proposal.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type Job,
  reviewProposalSchema,
} from "@/src/entities/models/job.model";

export type IAcceptProposalController = ReturnType<
  typeof acceptProposalController
>;

// Accepting a proposal: human-only (R21), so no page tool calls it.
export const acceptProposalController = (
  useCase: IReviewProposalUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "acceptProposal",
  });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = reviewProposalSchema.safeParse(input);
    if (parseError) {
      logger.warn("Accept input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, { ...data, decision: "accept" });
  };
};
