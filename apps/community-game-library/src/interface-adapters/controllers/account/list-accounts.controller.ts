import { z } from "zod";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  FoundAccount,
  IListAccountsUseCase,
} from "@/src/application/use-cases/admin/list-accounts.use-case";
import {
  InputParseError,
  UnauthenticatedError,
} from "@/src/entities/errors/common";

// G8's search, as typed: a name, or part of one.
const inputSchema = z.strictObject({ search: z.string().max(100) });

export type IListAccountsController = ReturnType<typeof listAccountsController>;

// Find the account (G8): the admin's search.
export const listAccountsController = (
  useCase: IListAccountsUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "listAccounts",
  });

  return async (
    input: unknown,
    userId: string | undefined,
  ): Promise<FoundAccount[]> => {
    logger.debug("Validating input", { hasUserId: !!userId });
    if (!userId) {
      throw new UnauthenticatedError("Must be logged in");
    }
    const { data, error: parseError } = inputSchema.safeParse(input);
    if (parseError) {
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(data.search, userId);
  };
};
