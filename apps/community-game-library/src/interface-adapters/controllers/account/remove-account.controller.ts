import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IRemoveAccountUseCase } from "@/src/application/use-cases/admin/remove-account.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

const inputSchema = z.strictObject({ userId: z.uuid() });

export type IRemoveAccountController = ReturnType<
  typeof removeAccountController
>;

// The admin removes an account (G8), after its dialog, as of now.
export const removeAccountController = (
  useCase: IRemoveAccountUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "removeAccount",
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
    return useCase(data.userId, userId, new Date());
  };
};
