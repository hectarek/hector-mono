import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IDeleteCompanyUseCase } from "@/src/application/use-cases/companies/delete-company.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type CompanyRef,
  companyIdSchema,
} from "@/src/entities/models/company.model";

export type IDeleteCompanyController = ReturnType<
  typeof deleteCompanyController
>;

// Deleting a company, from its page: human-only (R21), so no page tool calls it.
export const deleteCompanyController = (
  useCase: IDeleteCompanyUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "deleteCompany",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<CompanyRef> => {
    const { data, error: parseError } = companyIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("Delete company input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(context, data);
  };
};
