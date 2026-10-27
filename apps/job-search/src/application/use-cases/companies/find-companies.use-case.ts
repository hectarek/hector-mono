import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type {
  CompanyPage,
  CompanyQuery,
} from "@/src/entities/models/company.model";

export type IFindCompaniesUseCase = ReturnType<typeof findCompaniesUseCase>;

// The owner's companies by name, a page at a time: the companies page, and find_companies
// (docs/build-plan.md U5).
export const findCompaniesUseCase = (
  companiesRepository: ICompaniesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({
    layer: "use-case",
    op: "findCompanies",
  });

  return async (ownerId: string, query: CompanyQuery): Promise<CompanyPage> => {
    const page = await companiesRepository.find(ownerId, query);
    logger.debug("Companies found", { count: page.companies.length });
    return page;
  };
};
