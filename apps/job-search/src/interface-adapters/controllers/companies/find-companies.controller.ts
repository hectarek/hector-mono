import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IFindCompaniesUseCase } from "@/src/application/use-cases/companies/find-companies.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  type CompanyPage,
  findCompaniesSchema,
} from "@/src/entities/models/company.model";

export type IFindCompaniesController = ReturnType<
  typeof findCompaniesController
>;

// The one read behind the companies page and find_companies (docs/build-plan.md KTD4). Who is
// acting is already settled: the page or action asked the session first.
export const findCompaniesController = (
  useCase: IFindCompaniesUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "findCompanies",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<CompanyPage> => {
    const { data, error: parseError } = findCompaniesSchema.safeParse(input);
    if (parseError) {
      logger.warn("find_companies input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
