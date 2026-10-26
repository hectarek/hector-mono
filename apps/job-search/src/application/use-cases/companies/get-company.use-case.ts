import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { CompanyDetail } from "@/src/entities/models/company.model";

export type IGetCompanyUseCase = ReturnType<typeof getCompanyUseCase>;

// A company as its page and get_company show it (docs/build-plan.md U5), with any other company
// whose name matches its own ignoring case and punctuation.
export const getCompanyUseCase = (
  companiesRepository: ICompaniesRepository,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "getCompany" });

  return async (
    ownerId: string,
    { id }: { id: string },
  ): Promise<CompanyDetail> => {
    const company = await companiesRepository.get(ownerId, id);
    if (!company) {
      throw new NotFoundError("Couldn't find that company.");
    }
    const similar = await companiesRepository.findSimilar(
      ownerId,
      company.name,
      id,
    );
    logger.debug("Company read", { companyId: id });
    return { company, similar };
  };
};
