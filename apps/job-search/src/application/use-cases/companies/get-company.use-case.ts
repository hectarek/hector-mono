import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import { NotFoundError } from "@/src/entities/errors/common";
import type { CompanyDetail } from "@/src/entities/models/company.model";
import { JOB_PAGE_MAX } from "@/src/entities/models/job.model";

export type IGetCompanyUseCase = ReturnType<typeof getCompanyUseCase>;

// A company as its page and get_company show it (docs/build-plan.md U5, U6, U7): with any other
// company whose name matches its own ignoring case and punctuation, its jobs, its people, in a
// compact shape, and who added it (the UX plan's UX8).
export const getCompanyUseCase = (
  companiesRepository: ICompaniesRepository,
  jobsRepository: IJobsRepository,
  peopleRepository: IPeopleRepository,
  activityRepository: IActivityRepository,
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
    const [similar, { jobs }, people, added] = await Promise.all([
      companiesRepository.findSimilar(ownerId, company.name, id),
      jobsRepository.find(ownerId, {
        companyId: id,
        limit: JOB_PAGE_MAX,
        offset: 0,
      }),
      peopleRepository.listForCompany(ownerId, id),
      activityRepository.addedOf(ownerId, { kind: "company", id }),
    ]);
    logger.debug("Company read", { companyId: id });
    return { company, similar, jobs, people, added };
  };
};
