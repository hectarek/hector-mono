import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { IGetCompanyUseCase } from "@/src/application/use-cases/companies/get-company.use-case";
import { InputParseError } from "@/src/entities/errors/common";
import type { CurrentActor } from "@/src/entities/models/actor.model";
import {
  type CompanyDetail,
  companyIdSchema,
} from "@/src/entities/models/company.model";

export type IGetCompanyController = ReturnType<typeof getCompanyController>;

// The one read behind a company's page and get_company (docs/build-plan.md KTD4).
export const getCompanyController = (
  useCase: IGetCompanyUseCase,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "controller",
    op: "getCompany",
  });

  return async (
    input: unknown,
    { ownerId }: CurrentActor,
  ): Promise<CompanyDetail> => {
    const { data, error: parseError } = companyIdSchema.safeParse(input);
    if (parseError) {
      logger.warn("get_company input validation failed", {
        errors: parseError.issues.length,
      });
      throw new InputParseError("Invalid input", { cause: parseError });
    }
    return useCase(ownerId, data);
  };
};
