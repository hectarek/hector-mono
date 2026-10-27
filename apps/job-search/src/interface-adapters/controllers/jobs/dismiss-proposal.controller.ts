import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IReviewProposalUseCase } from "@/src/application/use-cases/jobs/review-proposal.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  dismissProposalSchema,
  type Job,
} from "@/src/entities/models/job.model";

export type IDismissProposalController = ReturnType<
  typeof dismissProposalController
>;

// Dismissing a proposal with a reason: human-only (R21), so no page tool calls it.
export const dismissProposalController = (
  useCase: IReviewProposalUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "dismissProposal",
  });

  return async (input: unknown, context: ChangeContext): Promise<Job> => {
    const { data, error: parseError } = dismissProposalSchema.safeParse(input);
    if (parseError) {
      logger.warn("Dismiss input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, {
      id: data.id,
      decision: "dismiss",
      reason: data.reason,
      note: data.note ?? null,
    });
  };
};
