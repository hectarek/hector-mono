import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ISaveCompanyUseCase } from "@/src/application/use-cases/companies/save-company.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type SavedCompany,
  saveCompanySchema,
} from "@/src/entities/models/company.model";

export type ISaveCompanyController = ReturnType<typeof saveCompanyController>;

// save_company's write, and the company form's (docs/build-plan.md KTD4): who is acting, and the
// tool, are already settled by the action.
export const saveCompanyController = (
  useCase: ISaveCompanyUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "saveCompany",
  });

  return async (
    input: unknown,
    context: ChangeContext,
  ): Promise<SavedCompany> => {
    const { data, error: parseError } = saveCompanySchema.safeParse(input);
    if (parseError) {
      logger.warn("save_company input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid company", { cause: parseError });
    }
    return useCase(context, data);
  };
};
