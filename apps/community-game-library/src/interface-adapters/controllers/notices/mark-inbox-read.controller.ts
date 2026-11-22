import { z } from "zod";
import { INBOX_LIMIT } from "@/src/application/repositories/notices.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IMarkInboxReadUseCase } from "@/src/application/use-cases/notices/mark-inbox-read.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.object({
  noticeIds: z.array(z.uuid()).max(INBOX_LIMIT),
});

export type IMarkInboxReadController = ReturnType<
  typeof markInboxReadController
>;

// The inbox, once it's open: the notices it listed, read.
export const markInboxReadController = (
  useCase: IMarkInboxReadUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "markInboxRead",
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
    return useCase(data.noticeIds, userId);
  };
};
