import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IChangeDueDateUseCase } from "@/src/application/use-cases/loans/change-due-date.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";
import { PLAN_TIME_ZONE, todayIn } from "@/src/entities/week";

const inputSchema = z.object({ loanId: z.uuid(), dueOn: z.iso.date() });

export type IChangeDueDateController = ReturnType<
  typeof changeDueDateController
>;

// C14's Change the due date, as of today in Eastern time (KTD9).
export const changeDueDateController = (
  useCase: IChangeDueDateUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "changeDueDate",
  });

  return async (input: unknown, userId: string | undefined) => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.loanId, data.dueOn, userId, todayIn(PLAN_TIME_ZONE));
  };
};
