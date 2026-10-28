import type { IActivityRepository } from "@/src/application/repositories/activity.repository.interface";
import type { ICompaniesRepository } from "@/src/application/repositories/companies.repository.interface";
import type { IJobsRepository } from "@/src/application/repositories/jobs.repository.interface";
import type { IPeopleRepository } from "@/src/application/repositories/people.repository.interface";
import type { ILoggerService } from "@/src/application/services/logger.service.interface";
import type { ITransactionManagerService } from "@/src/application/services/transaction-manager.service.interface";
import { recordChange } from "@/src/application/use-cases/activity/record-change";
import { requireCompany } from "@/src/application/use-cases/jobs/job-checks";
import { NO_DATES } from "@/src/application/use-cases/people/person-dates";
import { NotFoundError } from "@/src/entities/errors/common";
import type { ChangeContext } from "@/src/entities/models/activity.model";
import {
  type AddPersonInput,
  type Person,
  type PersonFacts,
  personLogged,
} from "@/src/entities/models/person.model";

export type IAddPersonUseCase = ReturnType<typeof addPersonUseCase>;

// Adds a person (add_person, docs/build-plan.md U7), at a company if one is named, and as a job's
// contact if a job is (R1). The person and their history share one transaction (KTD7). A new
// person has no interactions, so none of their dates.
export const addPersonUseCase = (
  peopleRepository: IPeopleRepository,
  companiesRepository: ICompaniesRepository,
  jobsRepository: IJobsRepository,
  activityRepository: IActivityRepository,
  transactionManager: ITransactionManagerService,
  loggerService: ILoggerService,
) => {
  const logger = loggerService.child({ layer: "use-case", op: "addPerson" });

  return async (
    context: ChangeContext,
    { jobId, ...given }: AddPersonInput,
  ): Promise<Person> => {
    const { ownerId } = context;
    const facts: PersonFacts = {
      name: given.name,
      companyId: given.companyId ?? null,
      role: given.role ?? null,
      howKnown: given.howKnown ?? null,
      rank: given.rank ?? null,
      ask: given.ask ?? null,
      nextStep: given.nextStep ?? null,
      nextDate: given.nextDate ?? null,
      notes: given.notes ?? null,
    };
    const person = await transactionManager.startTransaction(async (tx) => {
      if (facts.companyId) {
        await requireCompany(companiesRepository, ownerId, facts.companyId, tx);
      }
      const job = jobId
        ? await jobsRepository.getForUpdate(ownerId, jobId, tx)
        : undefined;
      if (jobId && !job) {
        throw new NotFoundError("Couldn't find that job.");
      }
      const added = await peopleRepository.create(ownerId, facts, tx);
      if (job) {
        await peopleRepository.linkJob(ownerId, added.id, job.id, tx);
      }
      await recordChange(activityRepository, tx, context, {
        record: { kind: "person", id: added.id },
        action: "created",
        after: { ...personLogged(added), ...(job && { contactFor: job.role }) },
      });
      return added;
    });
    logger.info("Person added", { personId: person.id });
    return { ...person, ...NO_DATES };
  };
};
